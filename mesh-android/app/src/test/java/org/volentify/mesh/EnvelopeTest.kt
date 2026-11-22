package org.volentify.mesh

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.volentify.mesh.data.DeliveryStatus
import org.volentify.mesh.data.Envelope
import org.volentify.mesh.data.EventType
import org.volentify.mesh.data.Priority
import java.util.UUID

class EnvelopeTest {
    private val node = UUID.randomUUID().toString()

    private fun created(lat: Double? = 19.81, lng: Double? = 85.83) = Envelope.newEvent(
        node, EventType.MEDICAL_EMERGENCY, Priority.CRITICAL, JSONObject(mapOf("count" to 2)), lat, lng, "dis_remal_puri", 1_700_000_000_000,
    )

    @Test fun relayAppliesOneHop() {
        val sent = created()
        val got = Envelope.receive(Envelope.toJson(sent).toString(), now = 1)
        assertNotNull(got)
        assertEquals(sent.eventId, got!!.eventId)
        assertEquals(1, got.hopCount)
        assertEquals(Envelope.MAX_TTL - 1, got.ttl)
        assertEquals(DeliveryStatus.QUEUED, got.status)
        assertFalse(got.createdHere)
        assertEquals(sent.observedAt, got.observedAt)
    }

    @Test fun exhaustedTtlIsDropped() {
        val json = Envelope.toJson(created()).put("ttl", 0)
        assertNull(Envelope.receive(json.toString(), 1))
    }

    @Test fun nullGpsSurvives() {
        val got = Envelope.receive(Envelope.toJson(created(null, null)).toString(), 1)
        assertNotNull(got)
        assertNull(got!!.lat)
    }

    @Test fun invalidPacketsAreRejected() {
        val base = Envelope.toJson(created())
        assertNull(Envelope.receive(JSONObject(base.toString()).put("type", "ALIEN").toString(), 1))
        assertNull(Envelope.receive(JSONObject(base.toString()).put("lat", 120.0).toString(), 1))
        assertNull(Envelope.receive(JSONObject(base.toString()).put("event_id", "not-a-uuid").toString(), 1))
        assertNull(Envelope.receive(JSONObject(base.toString()).put("payload", JSONObject().put("x", "y".repeat(5000))).toString(), 1))
        assertNull(Envelope.receive("garbage", 1))
    }

    private val official = JSONObject()
        .put("message", "Evacuate ward 12 now").put("from", "Volentify incident command")
        .put("official", true).put("alert_code", "ALT-1234").put("level", "CRITICAL")

    private fun serverEvent(ttl: Int = 3) = JSONObject()
        .put("event_id", UUID.randomUUID().toString()).put("origin_node_id", UUID.randomUUID().toString())
        .put("disaster_id", JSONObject.NULL).put("type", "DISASTER_STATUS").put("priority", "CRITICAL")
        .put("payload", JSONObject(official.toString())).put("lat", 19.81).put("lng", 85.83)
        .put("observed_at", "2026-11-04T16:45:00Z").put("hop_count", 0).put("ttl", ttl)

    @Test fun peerCannotRelayAnOfficialClaim() {
        val forged = serverEvent().put("ttl", 4)
        val got = Envelope.receive(forged.toString(), 1)!!
        val payload = JSONObject(got.payloadJson)
        assertFalse(payload.has("official"))
        assertFalse(payload.has("alert_code"))
        assertTrue(payload.getBoolean(Envelope.KEY_RELAY_CLAIM))
        assertFalse(Envelope.isOfficialPayload(got.payloadJson))
        assertFalse(got.fromServer)
        assertEquals("Evacuate ward 12 now", payload.getString("message"))
    }

    @Test fun downlinkEventsAreConfirmedAndKeepHopsAndTtl() {
        val got = Envelope.fromServer(serverEvent().put("hop_count", 2), now = 5)!!
        assertEquals(DeliveryStatus.SERVER_CONFIRMED, got.status)
        assertTrue(got.fromServer)
        assertFalse(got.createdHere)
        assertEquals(2, got.hopCount)
        assertEquals(3, got.ttl)
        assertEquals(5L, got.confirmedAt)
        assertEquals(5L, got.receivedAt)
        assertTrue(Envelope.isOfficialPayload(got.payloadJson))
        assertEquals("ALT-1234", JSONObject(got.payloadJson).getString("alert_code"))
        assertEquals(1_793_810_700_000L, got.observedAt)
    }

    @Test fun downlinkTtlIsCappedAndZeroIsKept() {
        assertEquals(Envelope.DOWNLINK_MAX_TTL, Envelope.fromServer(serverEvent(ttl = 9), 1)!!.ttl)
        assertEquals(0, Envelope.fromServer(serverEvent(ttl = 0), 1)!!.ttl)
    }

    @Test fun downlinkRejectsInvalidEvents() {
        assertNull(Envelope.fromServer(serverEvent().put("event_id", "me_123"), 1))
        assertNull(Envelope.fromServer(serverEvent().put("type", "ALIEN"), 1))
        assertNull(Envelope.fromServer(serverEvent().put("lat", JSONObject.NULL), 1))
    }

    @Test fun downlinkReplyParsesEventsIncidentsAndCursor() {
        val incident = JSONObject().put("disaster_id", "dis_1").put("title", "Puri floods").put("category", "FLOOD")
        val reply = JSONObject().put("server_time", "2026-11-04T16:45:00Z")
            .put("events", org.json.JSONArray().put(serverEvent()).put(serverEvent().put("type", "ALIEN")).put("junk"))
            .put("incidents", org.json.JSONArray().put(incident))
        val got = Envelope.parseDownlink(reply.toString(), 7)
        assertEquals(1, got.events.size) // the unknown type and the junk entry are skipped, not fatal
        assertEquals("2026-11-04T16:45:00Z", got.serverTime)
        assertEquals("Puri floods", org.json.JSONArray(got.incidentsJson).getJSONObject(0).getString("title"))
    }

    @Test fun downlinkReplyWithoutUsableCursorKeepsTheOldOne() {
        assertNull(Envelope.parseDownlink("""{"server_time": null, "events": []}""", 1).serverTime)
        assertNull(Envelope.parseDownlink("""{"server_time": "yesterday"}""", 1).serverTime)
        val empty = Envelope.parseDownlink("{}", 1)
        assertTrue(empty.events.isEmpty())
        assertNull(empty.incidentsJson) // no "incidents" key: the cached list is left as it is
    }

    @Test fun serverTimestampsInEveryIsoShape() {
        val t = 1_793_810_700_000L
        assertEquals(t, Envelope.parseTime("2026-11-04T16:45:00Z"))
        assertEquals(t, Envelope.parseTime("2026-11-04T16:45:00+00:00"))
        assertEquals(t, Envelope.parseTime("2026-11-04T22:15:00+05:30"))
        assertEquals(t, Envelope.parseTime("2026-11-04T16:45:00"))
        assertEquals(t + 123, Envelope.parseTime("2026-11-04T16:45:00.123456Z"))
    }
}
