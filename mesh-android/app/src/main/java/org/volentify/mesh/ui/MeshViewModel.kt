package org.volentify.mesh.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject
import org.volentify.mesh.data.Envelope
import org.volentify.mesh.data.EventType
import org.volentify.mesh.data.MeshDatabase
import org.volentify.mesh.data.MeshEvent
import org.volentify.mesh.data.PiiGuard
import org.volentify.mesh.data.Priority
import org.volentify.mesh.data.Rules
import org.volentify.mesh.data.Settings
import org.volentify.mesh.location.Fix
import org.volentify.mesh.location.LocationProvider
import org.volentify.mesh.mesh.BleMeshService
import org.volentify.mesh.sync.GatewaySync

data class Incident(val id: String, val title: String, val category: String)

const val MAX_MESSAGE = Rules.MAX_MESSAGE_CHARS
private const val MESSAGE_FIX_TIMEOUT_MS = 5_000L

class MeshViewModel(app: Application) : AndroidViewModel(app) {
    val settings = Settings(app)
    private val dao = MeshDatabase.get(app).dao()
    /** Rule checks and the insert run under one lock, so two quick taps can't both pass the duplicate guard. */
    private val saveLock = Mutex()

    val events: StateFlow<List<MeshEvent>> = dao.observeAll().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val pending: StateFlow<Int> = dao.observePendingCount().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    /** Broadcast messages: situation updates carrying a text "message" payload. */
    val messages: StateFlow<List<MeshEvent>> = dao.observeAll()
        .map { all -> all.filter { it.type == EventType.DISASTER_STATUS && it.payloadJson.contains("\"message\"") } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()
    fun clearMessage() { _message.value = null }

    init {
        // OD-04 also applies to a phone that never gets online again (the gateway sync purges too).
        viewModelScope.launch {
            try {
                dao.purgeConfirmedBefore(System.currentTimeMillis() - Rules.CONFIRMED_RETENTION_MS)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                // Housekeeping only: the next sync purges again.
            }
        }
    }

    /**
     * Sends a broadcast message. [onAccepted] runs once the hourly cap allows it (the screen clears its draft
     * then); a refusal is shown through [message] and the draft is kept.
     */
    fun sendMessage(text: String, priority: Priority, onAccepted: () -> Unit) {
        val body = text.trim().take(MAX_MESSAGE)
        if (body.isEmpty()) return
        viewModelScope.launch {
            refusal(EventType.DISASTER_STATUS, isMessage = true)?.let {
                _message.value = it.message
                return@launch
            }
            onAccepted()
            // Best-effort position: try for a fresh fix, or fall back immediately to cached position
            val fix = LocationProvider.current(getApplication(), MESSAGE_FIX_TIMEOUT_MS)
                ?: LocationProvider.lastKnown(getApplication())
            createReport(
                EventType.DISASTER_STATUS, priority,
                mapOf("message" to body, "from" to settings.displayName), disasterId = null, fix = fix,
            ) {}
        }
    }

    fun incidents(): List<Incident> = try {
        val arr = JSONArray(settings.incidentsJson ?: "[]")
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            Incident(o.getString("disaster_id"), o.getString("title"), o.getString("category"))
        }
    } catch (e: Exception) {
        emptyList()
    }

    /**
     * Saves a report with the position the report screen already acquired ([fix] is null without GPS).
     * The field rules apply here whatever the screen allowed: priority capped for non-critical types, the
     * duplicate-SOS guard and hourly caps, and personal numbers removed from free text. A refusal goes to
     * [onRefused] (by default the shared [message]) and nothing is saved.
     */
    fun createReport(
        type: EventType, priority: Priority, details: Map<String, Any>, disasterId: String?, fix: Fix? = null,
        onRefused: (String) -> Unit = { _message.value = it }, onDone: () -> Unit,
    ) {
        viewModelScope.launch {
            try {
                val isMessage = type == EventType.DISASTER_STATUS && details.containsKey("message")
                val removed = LinkedHashSet<PiiGuard.Kind>()
                val clean = details.mapValues { (_, v) ->
                    when (v) {
                        is String -> PiiGuard.scrub(v).also { removed += it.removed }.text
                        is List<*> -> v.map { item -> if (item is String) PiiGuard.scrub(item).also { removed += it.removed }.text else item }
                        else -> v
                    }
                }
                val masked = settings.maskLocation
                val position = fix?.let { if (masked) it.masked() else it }
                val saved = saveLock.withLock {
                    val refusal = refusal(type, isMessage)
                    if (refusal != null) {
                        onRefused(refusal.message)
                        return@withLock false
                    }
                    val payload = JSONObject(clean)
                    if (fix != null) {
                        if (masked) payload.put("location_masked", true)
                        else fix.accuracyRounded?.let { payload.put("gps_accuracy_m", it) }
                    }
                    val event = Envelope.newEvent(
                        originNodeId = settings.nodeId, type = type, priority = Rules.capPriority(type, priority),
                        payload = payload, lat = position?.lat, lng = position?.lng,
                        disasterId = disasterId, now = System.currentTimeMillis(),
                    )
                    dao.insert(event)
                    true
                }
                if (!saved) return@launch
                GatewaySync.requestSoon(getApplication())
                val status = when {
                    isMessage -> null // the message itself appears in the list
                    position == null -> "Saved locally without GPS — it will relay to nearby phones"
                    else -> "Saved locally with location — it will relay to nearby phones and sync when online"
                }
                val note = if (removed.isEmpty()) null else "Removed before saving: ${PiiGuard.describe(removed)}"
                _message.value = listOfNotNull(status, note).joinToString(". ").ifEmpty { null }
                onDone()
            } catch (e: IllegalArgumentException) {
                _message.value = e.message
            }
        }
    }

    /** Duplicate-SOS guard and hourly caps, counted from reports and messages created on this phone. */
    private suspend fun refusal(type: EventType, isMessage: Boolean): Rules.Refusal? {
        val now = System.currentTimeMillis()
        val hourAgo = now - Rules.RATE_WINDOW_MS
        return if (isMessage) {
            Rules.checkMessage(dao.countOwnMessages(hourAgo))
        } else {
            Rules.checkReport(
                sameTypeLastMinute = dao.countOwnReportsOfType(type, now - Rules.DUPLICATE_WINDOW_MS),
                reportsLastHour = dao.countOwnReports(hourAgo),
            )
        }
    }

    fun setMesh(enabled: Boolean) {
        settings.meshEnabled = enabled
        if (enabled) BleMeshService.start(getApplication()) else BleMeshService.stop(getApplication())
    }

    fun syncNow() {
        GatewaySync.refreshNow(getApplication())
        _message.value = "Sync requested — it runs as soon as the phone is online"
    }
}
