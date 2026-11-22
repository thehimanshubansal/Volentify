package org.volentify.mesh.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import org.volentify.mesh.data.DeliveryStatus
import org.volentify.mesh.data.Envelope
import org.volentify.mesh.data.MeshDao
import org.volentify.mesh.data.MeshDatabase
import org.volentify.mesh.data.Rules
import org.volentify.mesh.data.Settings
import org.volentify.mesh.location.LocationProvider
import java.io.IOException
import java.text.DateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Gateway outbox sync (FR-08, AT-06…AT-08). Any phone with internet uploads everything it holds —
 * its own reports and those relayed to it — in batches of up to 100. Records are only marked
 * server-confirmed after a 200 acknowledgement; network or 5xx failures retry with exponential backoff.
 * After uploading, the same pass fetches the downlink (command broadcasts, official advisories, incidents).
 *
 * Two paths share one uploader: an immediate upload whenever the phone has validated internet (new report,
 * report relayed in, network comes back), and WorkManager as the durable backup that survives process death.
 * WorkManager alone was slow: a job sitting in exponential backoff ignores new requests (KEEP), so a report
 * relayed in could wait minutes before upload.
 */
object GatewaySync {
    private const val ONE_SHOT = "gateway-sync-now"
    private const val PERIODIC = "gateway-sync-periodic"
    private val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val active = AtomicBoolean(false)
    private val rerun = AtomicBoolean(false)

    fun schedulePeriodic(context: Context) {
        val request = PeriodicWorkRequestBuilder<GatewaySyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(online)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    /** Uploads right away when the phone is online, and queues the WorkManager backup either way. */
    fun requestSoon(context: Context) {
        val app = context.applicationContext
        uploadNow(app)
        val request = OneTimeWorkRequestBuilder<GatewaySyncWorker>()
            .setConstraints(online)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(app).enqueueUniqueWork(ONE_SHOT, ExistingWorkPolicy.KEEP, request)
    }

    /** "Sync now": upload, and fetch the downlink straight away even if the last fetch was under a minute ago. */
    fun refreshNow(context: Context) {
        GatewayUploader.expireDownlink()
        requestSoon(context)
    }

    /**
     * Immediate path. Requests that arrive while an upload runs are coalesced into one more pass. Also called every
     * minute or so while the app is on screen or the relay runs, which is what keeps the downlink live.
     */
    fun uploadNow(context: Context) {
        val app = context.applicationContext
        if (!isOnline(app)) return
        rerun.set(true)
        if (!active.compareAndSet(false, true)) return
        scope.launch {
            try {
                while (rerun.getAndSet(false)) {
                    if (!isOnline(app)) break
                    if (GatewayUploader.run(app) != GatewayUploader.Outcome.DONE) {
                        rerun.set(false) // server or network trouble: the WorkManager job retries with backoff
                        break
                    }
                }
            } catch (_: Exception) {
                // Never crash the process from a background upload; WorkManager remains the backup.
            } finally {
                active.set(false)
            }
            if (rerun.get()) uploadNow(app)
        }
    }

    /** True when the default network has validated internet access. */
    fun isOnline(context: Context): Boolean {
        val cm = context.getSystemService(ConnectivityManager::class.java) ?: return false
        val caps = cm.getNetworkCapabilities(cm.activeNetwork ?: return false) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
}

/** The single upload loop (then the downlink), used by the immediate path and by the WorkManager job. */
object GatewayUploader {
    enum class Outcome { DONE, RETRY }

    /** How the upload pass ended. OFFLINE: the server couldn't be reached at all, so the downlink waits too. */
    private enum class Pass { DONE, RETRY, OFFLINE }

    private const val DOWNLINK_INTERVAL_MS = 60_000L
    private const val DOWNLINK_RADIUS_KM = 75

    private val lock = Mutex()
    private val http by lazy {
        OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS).build()
    }
    private val json = "application/json".toMediaType()

    suspend fun run(context: Context): Outcome = lock.withLock {
        withContext(Dispatchers.IO) {
            val startedAt = System.currentTimeMillis()
            val settings = Settings(context)
            val dao = MeshDatabase.get(context).dao()
            val pass = upload(context, settings, dao)
            if (pass != Pass.OFFLINE) downlink(context, settings, dao, startedAt)
            if (pass == Pass.DONE) Outcome.DONE else Outcome.RETRY
        }
    }

    private suspend fun upload(context: Context, settings: Settings, dao: MeshDao): Pass {
        dao.purgeConfirmedBefore(System.currentTimeMillis() - Rules.CONFIRMED_RETENTION_MS)

        // A gateway token is optional: without one, reports still upload as public field reports the moment the
        // phone has any internet (mobile data or Wi-Fi), so they reach the website as disaster data.
        var token = settings.gatewayToken
        var batchSize = 100
        while (true) {
            val batch = dao.outbox(batchSize)
            if (batch.isEmpty()) break
            val ids = batch.map { it.eventId }
            dao.setStatus(ids, DeliveryStatus.SYNCING)
            val body = JSONObject().apply {
                put("gateway_node_id", settings.nodeId)
                batteryPercent(context)?.let { put("gateway_battery", it) }
                put("events", JSONArray().apply { batch.forEach { put(Envelope.toJson(it)) } })
            }
            try {
                val request = Request.Builder()
                    .url("${settings.serverUrl}/api/mesh/ingest")
                    .apply { token?.let { header("Authorization", "Bearer $it") } }
                    .post(body.toString().toRequestBody(json))
                    .build()
                http.newCall(request).execute().use { resp ->
                    val text = resp.body?.string().orEmpty()
                    when {
                        resp.isSuccessful -> {
                            val ack = try { JSONObject(text) } catch (_: JSONException) { JSONObject() }
                            dao.confirm(ids, ack.optString("gateway_ack_id", "ack"), System.currentTimeMillis())
                            settings.lastSyncAt = System.currentTimeMillis()
                            settings.lastSyncMessage = "Uploaded ${ack.optInt("accepted_count")} new, " +
                                "${ack.optInt("duplicate_count")} already on the server" +
                                (if (token == null) " as public field reports" else "") +
                                if (ack.optString("persistence") == "volatile") " (server has no database connected — not stored yet)" else ""
                        }
                        resp.code == 401 && token != null -> {
                            // Expired gateway token: forget it and keep uploading as public field reports.
                            dao.setStatus(ids, DeliveryStatus.QUEUED)
                            settings.gatewayToken = null
                            token = null
                        }
                        resp.code == 429 -> {
                            dao.setStatus(ids, DeliveryStatus.QUEUED)
                            settings.lastSyncMessage = "Server is busy; retrying shortly"
                            return Pass.RETRY
                        }
                        resp.code == 422 && ids.size > 1 -> {
                            // Isolate the invalid report by retrying one at a time.
                            dao.setStatus(ids, DeliveryStatus.QUEUED)
                            batchSize = 1
                        }
                        resp.code == 422 -> {
                            dao.fail(ids, text.take(200))
                            settings.lastSyncMessage = "Server rejected a report as invalid"
                        }
                        else -> {
                            dao.setStatus(ids, DeliveryStatus.QUEUED)
                            settings.lastSyncMessage = "Server unavailable (${resp.code}); retrying"
                            return Pass.RETRY
                        }
                    }
                }
            } catch (e: IOException) {
                dao.resetSyncing()
                settings.lastSyncMessage = "No connection to the server; will retry"
                return Pass.OFFLINE
            } catch (e: IllegalArgumentException) {
                // Malformed server address in Settings: nothing will succeed until it is fixed.
                dao.resetSyncing()
                settings.lastSyncMessage = "Check the server address in Settings"
                return Pass.DONE
            }
        }
        return Pass.DONE
    }

    // ─── Downlink: command broadcasts and official advisories for phones in the field ───

    @Volatile private var downlinkAt = 0L

    /** "Sync now": fetch on the next pass even if the last fetch was under a minute ago. */
    fun expireDownlink() {
        downlinkAt = 0L
    }

    /**
     * GET /api/mesh/downlink after the upload loop, at most once a minute. New events are stored as server-confirmed
     * (never uploaded again, see [MeshDao.outbox]) and, while their ttl lasts, join the Bluetooth relay queue, so a
     * phone that briefly gets signal carries command's news back into the offline mesh. The reply also carries the
     * incident list, so it replaces the separate GET /api/mesh/incidents (still used against older servers).
     */
    private suspend fun downlink(context: Context, settings: Settings, dao: MeshDao, startedAt: Long) {
        if (startedAt - downlinkAt < DOWNLINK_INTERVAL_MS) return
        downlinkAt = startedAt
        var token = settings.gatewayToken
        try {
            val url = downlinkUrl(context, settings)
            while (true) {
                val request = Request.Builder()
                    .url(url)
                    .apply { token?.let { header("Authorization", "Bearer $it") } }
                    .build()
                val (code, text) = http.newCall(request).execute().use { it.code to it.body?.string().orEmpty() }
                when {
                    code in 200..299 -> {
                        applyDownlink(text, settings, dao, System.currentTimeMillis())
                        return
                    }
                    code == 401 && token != null -> {
                        // Expired gateway token: forget it and fetch the public downlink instead, as uploads do.
                        settings.gatewayToken = null
                        token = null
                    }
                    code == 404 -> {
                        // Server without the downlink yet: keep the incident list fresh the old way.
                        refreshIncidents(settings)
                        return
                    }
                    (code == 400 || code == 422) && settings.downlinkSince != null -> {
                        // The server didn't accept our cursor: start again from its default window next time.
                        settings.downlinkSince = null
                        return
                    }
                    else -> return
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // Network trouble, a malformed address or reply: the next pass tries again. Uploads are unaffected.
        }
    }

    private fun downlinkUrl(context: Context, settings: Settings): HttpUrl =
        "${settings.serverUrl}/api/mesh/downlink".toHttpUrl().newBuilder().apply {
            settings.downlinkSince?.let { addQueryParameter("since", it) }
            // Nearby news only. Rounded to 2 decimals (about 1 km) so the request never pins down the phone.
            LocationProvider.lastKnown(context)?.let { fix ->
                addQueryParameter("lat", coarse(fix.lat))
                addQueryParameter("lng", coarse(fix.lng))
                addQueryParameter("radius_km", DOWNLINK_RADIUS_KM.toString())
            }
        }.build()

    private fun coarse(v: Double): String = String.format(Locale.ROOT, "%.2f", v)

    private suspend fun applyDownlink(text: String, settings: Settings, dao: MeshDao, now: Long) {
        val reply = Envelope.parseDownlink(text, now)
        var added = 0
        for (event in reply.events) {
            if (dao.insert(event) != -1L) {
                added++
            } else if (Envelope.isOfficialPayload(event.payloadJson)) {
                // Already here as an unverifiable Bluetooth relay: the server vouches for it, so its copy replaces
                // ours (content included) and it shows as official. Own reports are left alone.
                val local = dao.get(event.eventId)
                if (local != null && !local.createdHere && !local.fromServer) {
                    dao.replace(event.copy(
                        ttl = minOf(event.ttl, local.ttl), hopCount = maxOf(event.hopCount, local.hopCount),
                        relayCount = local.relayCount, lastRelayAt = local.lastRelayAt,
                    ))
                }
            }
        }
        reply.incidentsJson?.let {
            settings.incidentsJson = it
            incidentsFetchedAt = now
        }
        reply.serverTime?.let { settings.downlinkSince = it }
        settings.lastDownlinkMessage = "Updates from the server: " + (if (added == 0) "nothing new" else "$added new") +
            " (checked ${DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(now))})"
    }

    @Volatile private var incidentsFetchedAt = 0L

    /** Incident list for servers without the downlink; refreshed at most every five minutes. */
    private fun refreshIncidents(settings: Settings) {
        val now = System.currentTimeMillis()
        if (now - incidentsFetchedAt < 5 * 60_000L) return
        incidentsFetchedAt = now
        try {
            val request = Request.Builder().url("${settings.serverUrl}/api/mesh/incidents").build()
            http.newCall(request).execute().use { resp ->
                if (resp.isSuccessful) settings.incidentsJson = resp.body?.string()
            }
        } catch (_: IOException) {
        } catch (_: IllegalArgumentException) {
        }
    }

    private fun batteryPercent(context: Context): Int? {
        val bm = context.getSystemService(BatteryManager::class.java) ?: return null
        return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY).takeIf { it in 0..100 }
    }
}

class GatewaySyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = when (GatewayUploader.run(applicationContext)) {
        GatewayUploader.Outcome.DONE -> Result.success()
        GatewayUploader.Outcome.RETRY -> Result.retry()
    }
}
