package org.volentify.mesh.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** Event types and priorities mirror the server enums (PRD §3.1). */
enum class EventType(val label: String) {
    PERSON_RESCUED("Person rescued"),
    PERSON_MISSING("Person missing"),
    PERSON_TRAPPED("People trapped"),
    MEDICAL_EMERGENCY("Medical emergency"),
    FIRE("Fire"),
    FLOOD("Flooding"),
    RESOURCE_REQUEST("Resource request"),
    VOLUNTEER_STATUS("Volunteer status"),
    DISASTER_STATUS("Situation update"),
}

enum class Priority { LOW, MEDIUM, HIGH, CRITICAL }

/**
 * Delivery state shown to the user (FR-13). Local receipt is never presented as server persistence.
 *  QUEUED            saved on this phone, waiting for a peer or a gateway
 *  RELAYED           handed to at least one nearby phone over Bluetooth
 *  SYNCING           this phone is uploading it now
 *  SERVER_CONFIRMED  the Volentify server acknowledged durable storage
 *  FAILED            the server rejected it (validation) — it will not be retried
 */
enum class DeliveryStatus(val label: String) {
    QUEUED("Saved locally"),
    RELAYED("Relayed"),
    SYNCING("Syncing"),
    SERVER_CONFIRMED("Server-confirmed"),
    FAILED("Failed"),
}

@Entity(tableName = "mesh_events", indices = [Index("status"), Index("observedAt")])
data class MeshEvent(
    @PrimaryKey val eventId: String,
    val originNodeId: String,
    val disasterId: String?,
    val type: EventType,
    val priority: Priority,
    val payloadJson: String,
    val lat: Double?,
    val lng: Double?,
    val observedAt: Long,
    val hopCount: Int,
    val ttl: Int,
    val status: DeliveryStatus,
    /** True when this phone created the report; false when it arrived from a peer. */
    val createdHere: Boolean,
    val receivedAt: Long,
    val relayCount: Int = 0,
    val lastRelayAt: Long = 0,
    val serverAckId: String? = null,
    val confirmedAt: Long? = null,
    val failureReason: String? = null,
    /**
     * True only for events fetched from the server downlink (GET /api/mesh/downlink). Together with
     * SERVER_CONFIRMED it is the sole source of the "Official · Volentify command" label: a peer relaying an
     * envelope over Bluetooth can claim anything, so phones never trust each other's claims. Added in DB v2.
     */
    @ColumnInfo(defaultValue = "0") val fromServer: Boolean = false,
)
