package org.volentify.mesh.data

import org.json.JSONObject
import java.time.Instant
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeParseException
import java.util.UUID

/**
 * Wire format exchanged between phones and uploaded to POST /api/mesh/ingest.
 * Validation mirrors the server (FR-05) so invalid packets are dropped before relay.
 */
object Envelope {
    const val MAX_PAYLOAD_BYTES = 4096
    const val MAX_TTL = 5
    /** The server caps downlinked events at 3 hops: command broadcasts reach a few phones into the offline mesh. */
    const val DOWNLINK_MAX_TTL = 3

    /** Payload keys only the server may set. A peer can't be verified, so they are stripped on Bluetooth receipt. */
    const val KEY_OFFICIAL = "official"
    const val KEY_ALERT_CODE = "alert_code"
    /** Left in place of a stripped "official" claim so the relay is labelled "Unverified relay", never official. */
    const val KEY_RELAY_CLAIM = "relay_claimed_official"

    fun toJson(e: MeshEvent): JSONObject = JSONObject().apply {
        put("event_id", e.eventId)
        put("origin_node_id", e.originNodeId)
        put("disaster_id", e.disasterId ?: JSONObject.NULL)
        put("type", e.type.name)
        put("priority", e.priority.name)
        put("payload", JSONObject(e.payloadJson))
        put("lat", e.lat ?: JSONObject.NULL)
        put("lng", e.lng ?: JSONObject.NULL)
        put("observed_at", Instant.ofEpochMilli(e.observedAt).toString())
        put("hop_count", e.hopCount)
        put("ttl", e.ttl)
    }

    /**
     * Parses an envelope relayed by a peer over Bluetooth, applying one hop: hopCount + 1, ttl - 1. Returns null
     * when invalid. An "official" claim is stripped (with its alert code) and only noted as [KEY_RELAY_CLAIM]:
     * phones can't verify each other, so only the server downlink ([fromServer]) ever marks an event official.
     */
    fun receive(raw: String, now: Long): MeshEvent? = try {
        val o = JSONObject(raw)
        val payload = o.getJSONObject("payload")
        val claimedOfficial = truthy(payload.remove(KEY_OFFICIAL))
        payload.remove(KEY_ALERT_CODE)
        if (claimedOfficial) payload.put(KEY_RELAY_CLAIM, true)
        val ttl = o.getInt("ttl")
        val hop = o.getInt("hop_count")
        val lat = if (o.isNull("lat")) null else o.getDouble("lat")
        val lng = if (o.isNull("lng")) null else o.getDouble("lng")
        val valid = payload.toString().toByteArray().size <= MAX_PAYLOAD_BYTES &&
            ttl in 1..MAX_TTL && hop >= 0 && validPosition(lat, lng) &&
            isUuid(o.getString("event_id")) && isUuid(o.getString("origin_node_id"))
        if (!valid) null else MeshEvent(
            eventId = o.getString("event_id"),
            originNodeId = o.getString("origin_node_id"),
            disasterId = if (o.isNull("disaster_id")) null else o.getString("disaster_id"),
            type = EventType.valueOf(o.getString("type")),
            priority = Priority.valueOf(o.getString("priority")),
            payloadJson = payload.toString(),
            lat = lat, lng = lng,
            observedAt = parseTime(o.getString("observed_at")),
            hopCount = hop + 1,
            ttl = ttl - 1,
            status = DeliveryStatus.QUEUED,
            createdHere = false,
            receivedAt = now,
        )
    } catch (e: Exception) {
        null
    }

    /**
     * Parses one event from GET /api/mesh/downlink. It is already stored on the server, so it is saved as
     * SERVER_CONFIRMED (never uploaded again) with hop count and ttl as the server sent them: while ttl > 0 it
     * relays on into the offline mesh. confirmedAt = now, so it is purged 72 hours later like any confirmed event.
     */
    fun fromServer(o: JSONObject, now: Long): MeshEvent? = try {
        val payload = o.optJSONObject("payload") ?: JSONObject()
        val ttl = o.optInt("ttl", 0).coerceIn(0, DOWNLINK_MAX_TTL)
        val hop = o.optInt("hop_count", 0).coerceAtLeast(0)
        val lat = if (o.isNull("lat")) null else o.getDouble("lat")
        val lng = if (o.isNull("lng")) null else o.getDouble("lng")
        val valid = payload.toString().toByteArray().size <= MAX_PAYLOAD_BYTES && validPosition(lat, lng) &&
            isUuid(o.getString("event_id")) && isUuid(o.getString("origin_node_id"))
        if (!valid) null else MeshEvent(
            eventId = o.getString("event_id"),
            originNodeId = o.getString("origin_node_id"),
            disasterId = if (o.isNull("disaster_id")) null else o.getString("disaster_id"),
            type = EventType.valueOf(o.getString("type")),
            priority = Priority.valueOf(o.getString("priority")),
            payloadJson = payload.toString(),
            lat = lat, lng = lng,
            observedAt = parseTime(o.getString("observed_at")),
            hopCount = hop,
            ttl = ttl,
            status = DeliveryStatus.SERVER_CONFIRMED,
            createdHere = false,
            receivedAt = now,
            serverAckId = "downlink",
            confirmedAt = now,
            fromServer = true,
        )
    } catch (e: Exception) {
        null
    }

    /** A parsed GET /api/mesh/downlink reply. [serverTime] (the next `since`) is null unless it is a valid instant. */
    class Downlink(val events: List<MeshEvent>, val incidentsJson: String?, val serverTime: String?)

    /** Invalid events are skipped one by one; a reply that isn't JSON at all throws JSONException. */
    fun parseDownlink(text: String, now: Long): Downlink {
        val body = JSONObject(text)
        val arr = body.optJSONArray("events")
        val events = if (arr == null) emptyList() else (0 until arr.length()).mapNotNull { i -> arr.optJSONObject(i)?.let { fromServer(it, now) } }
        val serverTime = if (body.isNull("server_time")) null
        else body.optString("server_time").takeIf { runCatching { parseTime(it) }.isSuccess }
        return Downlink(events, body.optJSONArray("incidents")?.toString(), serverTime)
    }

    /** True when a payload carries the "official" flag. Only meaningful on [MeshEvent.fromServer] events. */
    fun isOfficialPayload(payloadJson: String): Boolean = try {
        truthy(JSONObject(payloadJson).opt(KEY_OFFICIAL))
    } catch (e: Exception) {
        false
    }

    fun truthy(v: Any?): Boolean = v == true || (v is String && v.equals("true", ignoreCase = true))

    /** ISO-8601 instant as phones ("…Z") or the server ("…Z", "…+00:00", or no offset, read as UTC) write it. */
    fun parseTime(s: String): Long = try {
        Instant.parse(s).toEpochMilli()
    } catch (e: DateTimeParseException) {
        try {
            OffsetDateTime.parse(s).toInstant().toEpochMilli()
        } catch (e2: DateTimeParseException) {
            LocalDateTime.parse(s).toInstant(ZoneOffset.UTC).toEpochMilli()
        }
    }

    fun newEvent(
        originNodeId: String, type: EventType, priority: Priority, payload: JSONObject,
        lat: Double?, lng: Double?, disasterId: String?, now: Long,
    ): MeshEvent {
        require(payload.toString().toByteArray().size <= MAX_PAYLOAD_BYTES) { "Report details are too long" }
        return MeshEvent(
            eventId = UUID.randomUUID().toString(), originNodeId = originNodeId, disasterId = disasterId,
            type = type, priority = priority, payloadJson = payload.toString(), lat = lat, lng = lng,
            observedAt = now, hopCount = 0, ttl = MAX_TTL, status = DeliveryStatus.QUEUED, createdHere = true,
            receivedAt = now,
        )
    }

    private fun validPosition(lat: Double?, lng: Double?) =
        (lat == null) == (lng == null) && (lat == null || (lat in -90.0..90.0 && lng!! in -180.0..180.0))

    private fun isUuid(s: String) = try { UUID.fromString(s); s.length == 36 } catch (e: IllegalArgumentException) { false }
}
