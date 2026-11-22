package org.volentify.mesh

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.volentify.mesh.mesh.Framing
import kotlin.random.Random

class FramingTest {
    @Test fun roundTripsAtDefaultMtu() {
        val message = Random(1).nextBytes(4600)
        val frames = Framing.split(message, messageId = 42, mtu = 23)
        assertEquals((4600 + 13) / 14, frames.size)
        val r = Framing.Reassembler()
        var out: ByteArray? = null
        frames.shuffled(Random(2)).forEach { out = r.accept("AA:BB", it, 0) ?: out }
        assertArrayEquals(message, out)
    }

    @Test fun interleavedSendersDoNotMix() {
        // 8-byte chunks at MTU 10, so both messages span several frames.
        val a = "first message from phone A".toByteArray()
        val b = "second, longer message from phone B".toByteArray()
        val r = Framing.Reassembler()
        val fa = Framing.split(a, 1, 10)
        val fb = Framing.split(b, 1, 10)
        assertNull(r.accept("A", fa[0], 0))
        assertNull(r.accept("B", fb[0], 0))
        fa.drop(1).forEach { r.accept("A", it, 0) }
        var got: ByteArray? = null
        fb.drop(1).forEach { got = r.accept("B", it, 0) ?: got }
        assertArrayEquals(b, got)
    }

    @Test fun staleFragmentsExpire() {
        val r = Framing.Reassembler(maxAgeMs = 100)
        val frames = Framing.split(ByteArray(40) { 7 }, 9, 23)
        r.accept("A", frames[0], 0)
        frames.drop(1).forEach { assertNull(r.accept("A", it, 1_000)) }
    }
}
