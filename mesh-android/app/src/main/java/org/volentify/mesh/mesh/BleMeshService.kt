package org.volentify.mesh.mesh

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.ParcelUuid
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withTimeoutOrNull
import org.volentify.mesh.MainActivity
import org.volentify.mesh.R
import org.volentify.mesh.data.Envelope
import org.volentify.mesh.data.MeshDatabase
import org.volentify.mesh.data.MeshEvent
import org.volentify.mesh.data.Rules
import org.volentify.mesh.sync.GatewaySync
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/**
 * Store-and-forward relay over Bluetooth LE (PRD §2–3).
 *
 * Every phone is both a GATT server (accepts envelopes into its inbox characteristic and publishes a digest of
 * what it already holds) and a client (scans for peers advertising the Volentify service and writes the
 * envelopes they are missing). Received envelopes are validated, deduplicated by eventId in Room, stored with
 * hop+1 / ttl−1, and relayed onward while ttl > 0. Nothing is lost if the process dies: the outbox lives in SQLite.
 *
 * Relaying is event-driven so a report moves on within seconds of arriving: a peer is contacted as soon as this
 * phone holds something that peer hasn't had, and every nearby peer is tried the moment a new report is created
 * or relayed in. Peers that fail back off (3 s, doubling to 30 s); peers with nothing new are never re-contacted.
 *
 * Battery saver: at 15 % or less and not charging, scanning drops from continuous to 5 s every 30 s and advertising
 * to the low-power interval; full speed returns when charging or above 20 %. Relaying itself is unchanged, and
 * peers already seen are still offered new reports straight away.
 */
@SuppressLint("MissingPermission") // every entry point checks MeshPermissions.bluetoothGranted first
class BleMeshService : LifecycleService() {

    companion object {
        val SERVICE_UUID: UUID = UUID.fromString("7f3c0001-6a1e-4c2b-9b8e-5d1f0c7a9e10")
        val INBOX_UUID: UUID = UUID.fromString("7f3c0002-6a1e-4c2b-9b8e-5d1f0c7a9e10")
        /** Read-only digest of the event ids this phone holds (see [Digest]). Absent on older app versions. */
        val HAVE_UUID: UUID = UUID.fromString("7f3c0003-6a1e-4c2b-9b8e-5d1f0c7a9e10")
        private const val CHANNEL = "mesh_relay"
        private const val NOTIFICATION_ID = 1001
        private const val PEER_SEEN_WINDOW_MS = 60_000L
        private const val CONNECT_TIMEOUT_MS = 8_000L
        private const val SESSION_TIMEOUT_MS = 15_000L
        private const val OP_TIMEOUT_MS = 4_000L
        private const val MAX_EVENTS_PER_SESSION = 50
        private const val RELAY_QUEUE_LIMIT = 200
        private const val MAX_CONCURRENT_SESSIONS = 2
        private const val BACKOFF_START_MS = 3_000L
        private const val BACKOFF_MAX_MS = 30_000L
        private const val SENT_MEMORY_MS = 10 * 60_000L
        /** Generic GATT error Android reports for most failed connection attempts (0x85). */
        private const val GATT_ERROR_133 = 133
        /**
         * Frames are sized for at most a 512-byte attribute value (ATT limit) + 3-byte header. Android 14 always
         * negotiates MTU 517, and Android 13+ throws IllegalArgumentException for writes over 512 bytes.
         */
        private const val MAX_WRITE_MTU = 515
        /** Android 7+ silently downgrades scans running longer than 30 minutes to opportunistic; restart before. */
        private const val SCAN_RESTART_MS = 25 * 60_000L
        private const val SAVER_ON_PERCENT = 15
        /** Hysteresis, so the mode doesn't flap around 15–16 %. */
        private const val SAVER_OFF_PERCENT = 20
        private const val SAVER_SCAN_MS = 5_000L
        private const val SAVER_PERIOD_MS = 30_000L
        /** While online, sync (and so check the server downlink) this often; the uploader spaces fetches to 1/min. */
        private const val POLL_MS = 61_000L
        private const val SAVER_POLL_MS = 5 * 60_000L
        private const val PURGE_EVERY_MS = 30 * 60_000L

        fun start(context: Context) {
            // Android 14 refuses a connectedDevice foreground service without a Bluetooth runtime permission, and
            // a service started with startForegroundService() that can't go foreground crashes the app.
            if (!MeshPermissions.bluetoothGranted(context)) {
                MeshState.update { it.copy(running = false, error = "Turn on Bluetooth and allow nearby devices") }
                return
            }
            ContextCompat.startForegroundService(context, Intent(context, BleMeshService::class.java))
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, BleMeshService::class.java))
        }
    }

    private class Peer(val device: BluetoothDevice, @Volatile var lastSeen: Long)
    private data class Backoff(val delayMs: Long, val nextAttemptAt: Long)

    private val dao by lazy { MeshDatabase.get(this).dao() }
    private val adapter: BluetoothAdapter? by lazy { getSystemService(BluetoothManager::class.java)?.adapter }
    private var gattServer: BluetoothGattServer? = null
    private val reassembler = Framing.Reassembler()
    private val peers = ConcurrentHashMap<String, Peer>()
    private val sentTo = ConcurrentHashMap<String, MutableSet<String>>()
    private val inFlight: MutableSet<String> = ConcurrentHashMap.newKeySet()
    private val backoff = ConcurrentHashMap<String, Backoff>()
    private val sessions = Semaphore(MAX_CONCURRENT_SESSIONS)
    private val messageIds = AtomicInteger((System.nanoTime() and 0x7FFF).toInt())

    /** Live relay queue mirrored from Room; read on the scan thread without touching the database. */
    @Volatile private var relayQueue: List<MeshEvent> = emptyList()
    /** Bytes served from the HAVE characteristic. */
    @Volatile private var digest: ByteArray = ByteArray(0)
    @Volatile private var networkValidated = false
    private var networkCallbackRegistered = false
    private var scanStartedAt = 0L
    @Volatile private var batterySaver = false
    /** Duty-cycled scanning while in battery saver; null at full speed. */
    private var saverScanJob: Job? = null
    private var lastPollAt = 0L
    private var lastPurgeAt = 0L

    /**
     * Android 10–11 can't restart a scan from the background: this service has no location FGS type, so a scan
     * restarted there loses location access and receives nothing at all. There the scan stays continuous.
     */
    private val canRestartScan = Build.VERSION.SDK_INT !in Build.VERSION_CODES.Q..Build.VERSION_CODES.R

    override fun onCreate() {
        super.onCreate()
        if (!startInForeground()) return
        if (!MeshPermissions.bluetoothGranted(this) || adapter?.isEnabled != true) {
            MeshState.update { it.copy(running = false, error = "Turn on Bluetooth and allow nearby devices") }
            stopSelf()
            return
        }
        openServer()
        batterySaver = wantsBatterySaver()
        advertise()
        if (batterySaver && canRestartScan) startSaverScan() else scan()
        watchNetwork()
        MeshState.update { it.copy(running = true, error = null, batterySaver = batterySaver) }

        // Every change to the stored reports (created here, relayed in, relayed out, synced) refreshes the queue
        // and the digest, then offers anything new to the peers around us straight away.
        lifecycleScope.launch {
            dao.observeRelayable(RELAY_QUEUE_LIMIT).collect { queue ->
                relayQueue = queue
                digest = Digest.encode(dao.recentIds(Digest.MAX_ENTRIES))
                offerToNearbyPeers()
            }
        }
        lifecycleScope.launch {
            while (true) {
                delay(15_000)
                val now = System.currentTimeMillis()
                // Remember peers (and what they already have) for a while after they drop out of range, so a
                // phone that walks away and comes back isn't re-offered everything.
                peers.entries.removeAll { now - it.value.lastSeen > SENT_MEMORY_MS }
                sentTo.keys.removeAll { !peers.containsKey(it) }
                backoff.keys.removeAll { !peers.containsKey(it) }
                val nearby = peers.values.count { now - it.lastSeen <= PEER_SEEN_WINDOW_MS }
                MeshState.update { it.copy(peersNearby = nearby) }
                // Skipped on Android 10–11 (see canRestartScan), and in battery saver, where scans are short anyway.
                if (!batterySaver && canRestartScan && now - scanStartedAt > SCAN_RESTART_MS) {
                    restartScan()
                }
                val saver = wantsBatterySaver()
                if (saver != batterySaver) setBatterySaver(saver)
                // Online: upload anything waiting and fetch the downlink, so command broadcasts reach this phone
                // (and, through its relay queue, phones without signal) within a minute or so.
                val pollEvery = if (batterySaver) SAVER_POLL_MS else POLL_MS
                if (networkValidated && now - lastPollAt >= pollEvery) {
                    lastPollAt = now
                    GatewaySync.uploadNow(applicationContext)
                }
                // OD-04 applies offline too: confirmed copies leave the phone 72 hours after confirmation.
                if (now - lastPurgeAt >= PURGE_EVERY_MS) {
                    lastPurgeAt = now
                    try {
                        dao.purgeConfirmedBefore(now - Rules.CONFIRMED_RETENTION_MS)
                    } catch (e: CancellationException) {
                        throw e
                    } catch (_: Exception) {
                        // A database hiccup must not stop this loop (nothing above it handles exceptions).
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        try {
            adapter?.bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
            adapter?.bluetoothLeScanner?.stopScan(scanCallback)
            gattServer?.close()
        } catch (_: SecurityException) {
        } catch (_: IllegalStateException) {
        }
        if (networkCallbackRegistered) {
            try {
                getSystemService(ConnectivityManager::class.java)?.unregisterNetworkCallback(networkCallback)
            } catch (_: IllegalArgumentException) {
            }
            networkCallbackRegistered = false
        }
        MeshState.update { it.copy(running = false, peersNearby = 0, batterySaver = false) }
        super.onDestroy()
    }

    // ─── Battery saver ──────────────────────────────────────────────────────

    /** On at ≤ 15 % while not charging; off when charging or above 20 %; unchanged in between or when unknown. */
    private fun wantsBatterySaver(): Boolean {
        val bm = getSystemService(BatteryManager::class.java) ?: return false
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return when {
            level !in 0..100 -> false // some devices can't report it: stay at full speed
            bm.isCharging -> false
            level <= SAVER_ON_PERCENT -> true
            level > SAVER_OFF_PERCENT -> false
            else -> batterySaver
        }
    }

    private fun setBatterySaver(on: Boolean) {
        batterySaver = on
        MeshState.update { it.copy(batterySaver = on) }
        restartAdvertising()
        if (!canRestartScan) return
        saverScanJob?.cancel()
        saverScanJob = null
        stopScan()
        if (on) {
            startSaverScan()
        } else {
            try {
                scan()
            } catch (_: SecurityException) {
            } catch (_: IllegalStateException) {
            }
        }
    }

    /** Scan 5 s every 30 s (one scan start per 30 s, well inside Android's 5-starts-per-30-s limit). */
    private fun startSaverScan() {
        saverScanJob = lifecycleScope.launch {
            while (true) {
                try {
                    scan()
                } catch (_: SecurityException) {
                } catch (_: IllegalStateException) {
                    // Bluetooth was switched off; try again next cycle.
                }
                delay(SAVER_SCAN_MS)
                stopScan()
                delay(SAVER_PERIOD_MS - SAVER_SCAN_MS)
            }
        }
    }

    // ─── Foreground notification ───────────────────────────────────────────

    /** False when Android refused the foreground start; the service has then stopped itself. */
    private fun startInForeground(): Boolean {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Mesh relay", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Keeps relaying field reports to nearby phones"
        })
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_mesh)
            .setContentTitle("Volentify Mesh is relaying")
            .setContentText("Field reports are shared with nearby phones over Bluetooth")
            .setContentIntent(open)
            .setOngoing(true)
            .build()
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            true
        } catch (e: RuntimeException) {
            // SecurityException (Android 14, Bluetooth permission revoked) or ForegroundServiceStartNotAllowedException
            // (Android 12+, START_STICKY restart while the app is in the background). Opening the app restarts it.
            MeshState.update { it.copy(running = false, error = "Open Volentify to resume relaying") }
            stopSelf()
            false
        }
    }

    // ─── Gateway: upload the moment the phone gets internet ────────────────

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) {
            val ok = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            if (ok && !networkValidated) GatewaySync.uploadNow(applicationContext)
            networkValidated = ok
        }

        override fun onLost(network: Network) {
            networkValidated = false
        }
    }

    private fun watchNetwork() {
        val cm = getSystemService(ConnectivityManager::class.java) ?: return
        try {
            cm.registerDefaultNetworkCallback(networkCallback)
            networkCallbackRegistered = true
        } catch (_: RuntimeException) {
            // Too many callbacks registered or no permission: WorkManager still uploads when online.
        }
    }

    // ─── GATT server: the inbox other phones write into, and our digest ────

    private fun openServer() {
        val manager = getSystemService(BluetoothManager::class.java) ?: return
        gattServer = manager.openGattServer(this, serverCallback)?.also { server ->
            val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
            service.addCharacteristic(BluetoothGattCharacteristic(
                INBOX_UUID,
                BluetoothGattCharacteristic.PROPERTY_WRITE,
                BluetoothGattCharacteristic.PERMISSION_WRITE,
            ))
            service.addCharacteristic(BluetoothGattCharacteristic(
                HAVE_UUID,
                BluetoothGattCharacteristic.PROPERTY_READ,
                BluetoothGattCharacteristic.PERMISSION_READ,
            ))
            server.addService(service)
        }
    }

    private val serverCallback = object : BluetoothGattServerCallback() {
        override fun onCharacteristicWriteRequest(
            device: BluetoothDevice, requestId: Int, characteristic: BluetoothGattCharacteristic,
            preparedWrite: Boolean, responseNeeded: Boolean, offset: Int, value: ByteArray?,
        ) {
            if (responseNeeded) gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
            if (characteristic.uuid != INBOX_UUID || value == null) return
            val message = reassembler.accept(device.address, value, System.currentTimeMillis()) ?: return
            val from = device.address
            lifecycleScope.launch(Dispatchers.IO) { ingest(String(message, Charsets.UTF_8), from) }
        }

        override fun onCharacteristicReadRequest(
            device: BluetoothDevice, requestId: Int, offset: Int, characteristic: BluetoothGattCharacteristic,
        ) {
            if (characteristic.uuid != HAVE_UUID) {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_READ_NOT_PERMITTED, offset, null)
                return
            }
            val value = digest
            val chunk = if (offset >= value.size) ByteArray(0) else value.copyOfRange(offset, value.size)
            gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, chunk)
        }
    }

    private suspend fun ingest(raw: String, fromAddress: String) {
        val now = System.currentTimeMillis()
        val event = Envelope.receive(raw, now) ?: return // invalid or exhausted TTL: dropped (FR-05, FR-07)
        // The sender obviously has it: don't connect back just to offer it the same report.
        sentTo.getOrPut(fromAddress) { ConcurrentHashMap.newKeySet() } += event.eventId
        if (dao.insert(event) != -1L) {
            MeshState.update { it.copy(received = it.received + 1, lastExchangeAt = now) }
            GatewaySync.requestSoon(this)
        }
    }

    // ─── Advertising & scanning ─────────────────────────────────────────────

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartFailure(errorCode: Int) {
            MeshState.update { it.copy(error = "This phone can't advertise over Bluetooth (code $errorCode); it can still send") }
        }
    }

    private fun advertise() {
        val advertiser = adapter?.bluetoothLeAdvertiser ?: return
        // Low-latency advertising (~100 ms interval) lets peers discover this phone within a second or two; in
        // battery saver the ~1 s low-power interval still lets a peer find it within a few seconds.
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(if (batterySaver) AdvertiseSettings.ADVERTISE_MODE_LOW_POWER else AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .build()
        val data = AdvertiseData.Builder()
            .addServiceUuid(ParcelUuid(SERVICE_UUID))
            .setIncludeDeviceName(false)
            .build()
        advertiser.startAdvertising(settings, data, advertiseCallback)
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            onPeerSeen(result.device)
        }

        override fun onBatchScanResults(results: MutableList<ScanResult>) {
            results.forEach { onPeerSeen(it.device) }
        }

        override fun onScanFailed(errorCode: Int) {
            MeshState.update { it.copy(error = "Bluetooth scan failed (code $errorCode)") }
        }
    }

    private fun scan() {
        val scanner = adapter?.bluetoothLeScanner ?: return
        val filter = ScanFilter.Builder().setServiceUuid(ParcelUuid(SERVICE_UUID)).build()
        val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
        scanStartedAt = System.currentTimeMillis()
        scanner.startScan(listOf(filter), settings, scanCallback)
    }

    private fun restartScan() {
        try {
            adapter?.bluetoothLeScanner?.stopScan(scanCallback)
            scan()
        } catch (_: SecurityException) {
        } catch (_: IllegalStateException) {
            // Bluetooth was switched off; nothing to scan with.
        }
    }

    private fun stopScan() {
        try {
            adapter?.bluetoothLeScanner?.stopScan(scanCallback)
        } catch (_: SecurityException) {
        } catch (_: IllegalStateException) {
        }
    }

    private fun restartAdvertising() {
        try {
            adapter?.bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
            advertise()
        } catch (_: SecurityException) {
        } catch (_: IllegalStateException) {
        }
    }

    // ─── Relay scheduling ───────────────────────────────────────────────────

    private fun onPeerSeen(device: BluetoothDevice) {
        val now = System.currentTimeMillis()
        val peer = peers[device.address]?.also { it.lastSeen = now } ?: Peer(device, now).also { peers[device.address] = it }
        maybeExchange(peer)
    }

    /** New report on this phone: offer it to everyone seen recently, even if their scan results are de-duplicated. */
    private fun offerToNearbyPeers() {
        val now = System.currentTimeMillis()
        peers.values.filter { now - it.lastSeen <= PEER_SEEN_WINDOW_MS }.forEach { maybeExchange(it) }
    }

    private fun maybeExchange(peer: Peer) {
        val address = peer.device.address
        val now = System.currentTimeMillis()
        val wait = backoff[address]
        if (wait != null && now < wait.nextAttemptAt) return
        val known = sentTo[address]
        if (relayQueue.none { known == null || it.eventId !in known }) return
        if (!inFlight.add(address)) return
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                exchange(peer.device)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // A Bluetooth stack or database error with one peer must not crash the whole app (nothing above
                // this coroutine handles exceptions); back off from that peer instead.
                recordFailure(address)
            } finally {
                inFlight.remove(address)
            }
            // Reports that arrived while this session ran (or beyond the per-session cap) go out right away.
            peers[address]?.let { maybeExchange(it) }
        }
    }

    private fun recordFailure(address: String) {
        val previous = backoff[address]?.delayMs
        val delayMs = if (previous == null) BACKOFF_START_MS else minOf(previous * 2, BACKOFF_MAX_MS)
        backoff[address] = Backoff(delayMs, System.currentTimeMillis() + delayMs)
    }

    // ─── Client session: push the envelopes one peer is missing ────────────

    private suspend fun exchange(device: BluetoothDevice) {
        sessions.withPermit { session(device) }
    }

    private suspend fun session(device: BluetoothDevice) {
        val address = device.address
        val sent = sentTo.getOrPut(address) { ConcurrentHashMap.newKeySet() }
        val batch = relayQueue.filter { it.eventId !in sent }
        if (batch.isEmpty()) return

        val attempts = mutableListOf<GattSession>()
        val completed = withTimeoutOrNull(SESSION_TIMEOUT_MS) {
            var session = GattSession(device).also { attempts += it }
            try { session.run(batch) } finally { session.close() }
            if (session.connectStatus == GATT_ERROR_133) {
                // The most common transient failure; one quick retry usually connects.
                delay(300)
                session = GattSession(device).also { attempts += it }
                try { session.run(batch) } finally { session.close() }
            }
            session.completed
        } ?: false

        // Keep partial progress even when the session timed out mid-way.
        val now = System.currentTimeMillis()
        attempts.forEach { sent += it.peerHas }
        val delivered = attempts.flatMap { it.delivered }
        if (delivered.isNotEmpty()) {
            sent += delivered
            dao.markRelayedAll(delivered, now)
        }
        // Partial progress counts as success so the next session continues straight away.
        if (completed || delivered.isNotEmpty()) backoff.remove(address) else recordFailure(address)
        if (delivered.isNotEmpty()) {
            MeshState.update { it.copy(sent = it.sent + delivered.size, lastExchangeAt = now) }
        }
    }

    /** One connection: connect → priority → MTU → discover → read digest → write each missing envelope. */
    private inner class GattSession(private val device: BluetoothDevice) {
        @Volatile private var gatt: BluetoothGatt? = null
        private val connected = CompletableDeferred<Int>()
        private val mtuDone = CompletableDeferred<Unit>()
        private val discovered = CompletableDeferred<Boolean>()
        @Volatile private var readDone = CompletableDeferred<ByteArray?>()
        @Volatile private var writeDone = CompletableDeferred<Boolean>()
        @Volatile private var mtu = 23

        /** GATT status of the connection attempt; -1 until known. */
        var connectStatus = -1
            private set
        /** True when every envelope the peer was missing (up to the session cap) was written. */
        var completed = false
            private set
        val delivered = mutableListOf<String>()
        var peerHas: Set<String> = emptySet()
            private set

        private val callback = object : BluetoothGattCallback() {
            override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
                if (newState == BluetoothProfile.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) {
                    connected.complete(BluetoothGatt.GATT_SUCCESS)
                } else {
                    connected.complete(if (status == BluetoothGatt.GATT_SUCCESS) BluetoothGatt.GATT_FAILURE else status)
                    mtuDone.complete(Unit)
                    discovered.complete(false)
                    readDone.complete(null)
                    writeDone.complete(false)
                }
            }

            override fun onMtuChanged(g: BluetoothGatt, newMtu: Int, status: Int) {
                if (status == BluetoothGatt.GATT_SUCCESS) mtu = newMtu
                mtuDone.complete(Unit)
            }

            override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
                discovered.complete(status == BluetoothGatt.GATT_SUCCESS)
            }

            // Android 13+ delivers the value directly.
            override fun onCharacteristicRead(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray, status: Int) {
                readDone.complete(if (status == BluetoothGatt.GATT_SUCCESS) value else null)
            }

            // Android 12 and older.
            @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
            override fun onCharacteristicRead(g: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) {
                readDone.complete(if (status == BluetoothGatt.GATT_SUCCESS) c.value else null)
            }

            override fun onCharacteristicWrite(g: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) {
                writeDone.complete(status == BluetoothGatt.GATT_SUCCESS)
            }
        }

        suspend fun run(batch: List<MeshEvent>) {
            val g = device.connectGatt(
                this@BleMeshService, false, callback, BluetoothDevice.TRANSPORT_LE,
                BluetoothDevice.PHY_LE_1M_MASK or BluetoothDevice.PHY_LE_2M_MASK,
            ) ?: return
            gatt = g
            connectStatus = withTimeoutOrNull(CONNECT_TIMEOUT_MS) { connected.await() } ?: return
            if (connectStatus != BluetoothGatt.GATT_SUCCESS) return

            // Shortest connection interval (7.5–15 ms) for the few seconds the transfer takes.
            g.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH)
            if (g.requestMtu(517)) withTimeoutOrNull(OP_TIMEOUT_MS) { mtuDone.await() }
            if (!g.discoverServices()) return
            if (withTimeoutOrNull(CONNECT_TIMEOUT_MS) { discovered.await() } != true) return
            val service = g.getService(SERVICE_UUID) ?: return
            val inbox = service.getCharacteristic(INBOX_UUID) ?: return

            // Skip what the peer already holds. Older app versions have no digest: send everything.
            service.getCharacteristic(HAVE_UUID)?.let { have ->
                read(g, have)?.let { bytes -> peerHas = Digest.held(batch.map { it.eventId }, Digest.decode(bytes)) }
            }
            val missing = batch.filter { it.eventId !in peerHas }.take(MAX_EVENTS_PER_SESSION)
            for (event in missing) {
                val json = Envelope.toJson(event).toString().toByteArray(Charsets.UTF_8)
                val frames = Framing.split(json, messageIds.incrementAndGet() and 0xFFFF, minOf(mtu, MAX_WRITE_MTU))
                for (frame in frames) {
                    if (!write(g, inbox, frame)) return
                }
                delivered += event.eventId
            }
            completed = true
        }

        private suspend fun read(g: BluetoothGatt, c: BluetoothGattCharacteristic): ByteArray? {
            readDone = CompletableDeferred()
            if (!g.readCharacteristic(c)) return null
            return withTimeoutOrNull(OP_TIMEOUT_MS) { readDone.await() }
        }

        @Suppress("DEPRECATION")
        private suspend fun write(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray): Boolean {
            writeDone = CompletableDeferred()
            val started = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                g.writeCharacteristic(c, value, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT) == BluetoothGatt.GATT_SUCCESS
            } else {
                c.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
                c.value = value
                g.writeCharacteristic(c)
            }
            return started && (withTimeoutOrNull(OP_TIMEOUT_MS) { writeDone.await() } ?: false)
        }

        fun close() {
            val g = gatt ?: return
            gatt = null
            try {
                g.disconnect()
                g.close()
            } catch (_: SecurityException) {
            }
        }
    }
}
