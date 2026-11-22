package org.volentify.mesh.mesh

/**
 * Compact "what I already have" summary exchanged before relaying, so a session only carries reports the peer
 * is missing. Each entry is the first 4 bytes of an event UUID (its first 8 hex characters). A false match
 * (two ids sharing a prefix) only means one report is not re-sent to that peer during this session; every
 * other peer and the gateway upload still carry it.
 */
object Digest {
    const val ENTRY_BYTES = 4
    const val MAX_ENTRIES = 120

    /** Prefix of an event id as an int, or null when the id doesn't start with 8 hex characters. */
    fun prefix(eventId: String): Int? {
        if (eventId.length < 8) return null
        var v = 0L
        for (i in 0 until 8) {
            val d = Character.digit(eventId[i], 16)
            if (d < 0) return null
            v = (v shl 4) or d.toLong()
        }
        return v.toInt()
    }

    fun encode(eventIds: List<String>): ByteArray {
        val prefixes = eventIds.asSequence().mapNotNull { prefix(it) }.distinct().take(MAX_ENTRIES).toList()
        val out = ByteArray(prefixes.size * ENTRY_BYTES)
        prefixes.forEachIndexed { i, p ->
            out[i * 4] = (p ushr 24).toByte()
            out[i * 4 + 1] = (p ushr 16).toByte()
            out[i * 4 + 2] = (p ushr 8).toByte()
            out[i * 4 + 3] = p.toByte()
        }
        return out
    }

    fun decode(bytes: ByteArray): Set<Int> {
        val out = HashSet<Int>(bytes.size / ENTRY_BYTES * 2)
        var i = 0
        while (i + ENTRY_BYTES <= bytes.size) {
            out += ((bytes[i].toInt() and 0xFF) shl 24) or ((bytes[i + 1].toInt() and 0xFF) shl 16) or
                ((bytes[i + 2].toInt() and 0xFF) shl 8) or (bytes[i + 3].toInt() and 0xFF)
            i += ENTRY_BYTES
        }
        return out
    }

    /** Ids from [eventIds] the peer reports already holding. */
    fun held(eventIds: Collection<String>, digest: Set<Int>): Set<String> =
        if (digest.isEmpty()) emptySet() else eventIds.filterTo(HashSet()) { id -> prefix(id)?.let { it in digest } == true }
}
