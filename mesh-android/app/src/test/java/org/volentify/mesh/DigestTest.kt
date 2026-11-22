package org.volentify.mesh

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.volentify.mesh.mesh.Digest
import java.util.UUID

class DigestTest {
    @Test fun roundTripsPrefixes() {
        val ids = List(50) { UUID.randomUUID().toString() }
        val bytes = Digest.encode(ids)
        assertEquals(ids.mapNotNull { Digest.prefix(it) }.distinct().size * 4, bytes.size)
        val decoded = Digest.decode(bytes)
        assertEquals(ids.toSet(), Digest.held(ids, decoded))
    }

    @Test fun highBitPrefixesSurvive() {
        val id = "ffffffff-0000-4000-8000-000000000000"
        assertEquals(setOf(id), Digest.held(listOf(id), Digest.decode(Digest.encode(listOf(id)))))
    }

    @Test fun unknownIdsAreNotHeld() {
        val mine = List(10) { UUID.randomUUID().toString() }
        val theirs = Digest.decode(Digest.encode(List(10) { UUID.randomUUID().toString() }))
        assertTrue(Digest.held(mine, theirs).size <= 1) // a 32-bit prefix collision is vanishingly rare
    }

    @Test fun capsEntriesAndIgnoresJunk() {
        val ids = List(500) { UUID.randomUUID().toString() } + "not-a-uuid"
        assertEquals(Digest.MAX_ENTRIES * 4, Digest.encode(ids).size)
        assertNull(Digest.prefix("zz"))
        assertTrue(Digest.decode(ByteArray(3)).isEmpty())
    }
}
