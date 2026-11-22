package org.volentify.mesh.data

import android.content.Context
import org.volentify.mesh.BuildConfig
import java.util.UUID

/** Node identity and gateway configuration. The node id is a random UUID, never a hardware MAC (FR-01). */
class Settings(context: Context) {
    private val prefs = context.getSharedPreferences("volentify_mesh", Context.MODE_PRIVATE)

    val nodeId: String
        get() = prefs.getString(KEY_NODE, null) ?: UUID.randomUUID().toString().also {
            prefs.edit().putString(KEY_NODE, it).apply()
        }

    /** Only an https:// address is ever used; anything else (e.g. saved by an older version) falls back to the default. */
    var serverUrl: String
        get() = prefs.getString(KEY_SERVER, null)?.takeIf(Rules::isSecureServer) ?: BuildConfig.DEFAULT_SERVER_URL
        set(v) {
            val url = v.trim().trimEnd('/')
            if (Rules.isSecureServer(url)) prefs.edit().putString(KEY_SERVER, url).apply()
        }

    /** Short-lived gateway token issued from the Volentify dashboard (OD-01). Never bundled in the APK. */
    var gatewayToken: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(v) = prefs.edit().putString(KEY_TOKEN, v?.trim()?.takeIf { it.isNotEmpty() }).apply()

    var meshEnabled: Boolean
        get() = prefs.getBoolean(KEY_MESH, true)
        set(v) = prefs.edit().putBoolean(KEY_MESH, v).apply()

    /** OD-05: shift reported coordinates by up to ±500 m. */
    var maskLocation: Boolean
        get() = prefs.getBoolean(KEY_MASK, false)
        set(v) = prefs.edit().putBoolean(KEY_MASK, v).apply()

    /** Name shown on messages this phone sends. */
    var displayName: String
        get() = prefs.getString(KEY_NAME, null) ?: "Field team"
        set(v) = prefs.edit().putString(KEY_NAME, v.trim().take(40).ifEmpty { "Field team" }).apply()

    var lastSyncAt: Long
        get() = prefs.getLong(KEY_SYNC, 0)
        set(v) = prefs.edit().putLong(KEY_SYNC, v).apply()

    var lastSyncMessage: String?
        get() = prefs.getString(KEY_SYNC_MSG, null)
        set(v) = prefs.edit().putString(KEY_SYNC_MSG, v).apply()

    /** Cached incidents (from the downlink, or GET /api/mesh/incidents on older servers) for offline report linking. */
    var incidentsJson: String?
        get() = prefs.getString(KEY_INCIDENTS, null)
        set(v) = prefs.edit().putString(KEY_INCIDENTS, v).apply()

    /** Downlink cursor: the server_time of the last successful GET /api/mesh/downlink, sent back as `since`. */
    var downlinkSince: String?
        get() = prefs.getString(KEY_DOWNLINK_SINCE, null)
        set(v) = prefs.edit().putString(KEY_DOWNLINK_SINCE, v).apply()

    var lastDownlinkMessage: String?
        get() = prefs.getString(KEY_DOWNLINK_MSG, null)
        set(v) = prefs.edit().putString(KEY_DOWNLINK_MSG, v).apply()

    /** Set once the "Before you use Volentify Mesh" safety screen has been acknowledged. */
    var safetyAcknowledged: Boolean
        get() = prefs.getBoolean(KEY_SAFETY_ACK, false)
        set(v) = prefs.edit().putBoolean(KEY_SAFETY_ACK, v).apply()

    private companion object {
        const val KEY_NODE = "node_id"
        const val KEY_SERVER = "server_url"
        const val KEY_TOKEN = "gateway_token"
        const val KEY_MESH = "mesh_enabled"
        const val KEY_MASK = "mask_location"
        const val KEY_SYNC = "last_sync_at"
        const val KEY_SYNC_MSG = "last_sync_message"
        const val KEY_INCIDENTS = "incidents_json"
        const val KEY_NAME = "display_name"
        const val KEY_DOWNLINK_SINCE = "downlink_since"
        const val KEY_DOWNLINK_MSG = "last_downlink_message"
        const val KEY_SAFETY_ACK = "safety_acknowledged_v1"
    }
}
