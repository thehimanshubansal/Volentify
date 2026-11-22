package org.volentify.mesh.mesh

import java.nio.ByteBuffer

/**
 * Splits an envelope into GATT-sized frames and reassembles them.
 * Frame header (6 bytes, big-endian): messageId, index, count. Works even at the 23-byte default MTU.
 */
object Framing {
    const val HEADER = 6
    private const val ATT_OVERHEAD = 3

    fun split(message: ByteArray, messageId: Int, mtu: Int): List<ByteArray> {
        val chunk = (mtu - ATT_OVERHEAD - HEADER).coerceAtLeast(8)
        val count = maxOf(1, (message.size + chunk - 1) / chunk)
        require(count <= 0xFFFF) { "message too large" }
        return (0 until count).map { i ->
            val start = i * chunk
            val end = minOf(message.size, start + chunk)
            ByteBuffer.allocate(HEADER + (end - start))
                .putShort(messageId.toShort()).putShort(i.toShort()).putShort(count.toShort())
                .put(message, start, end - start).array()
        }
    }

    /** Collects frames per sender; returns the full message when the last missing frame arrives. */
    class Reassembler(private val maxAgeMs: Long = 30_000) {
        private class Pending(val count: Int, val parts: Array<ByteArray?>, val startedAt: Long)
        private val pending = HashMap<String, Pending>()

        @Synchronized
        fun accept(sender: String, frame: ByteArray, now: Long): ByteArray? {
            if (frame.size < HEADER) return null
            pending.entries.removeAll { now - it.value.startedAt > maxAgeMs }
            val buf = ByteBuffer.wrap(frame)
            val id = buf.short.toInt() and 0xFFFF
            val index = buf.short.toInt() and 0xFFFF
            val count = buf.short.toInt() and 0xFFFF
            if (count == 0 || index >= count) return null
            val key = "$sender#$id"
            val p = pending[key]?.takeIf { it.count == count } ?: Pending(count, arrayOfNulls(count), now).also { pending[key] = it }
            p.parts[index] = frame.copyOfRange(HEADER, frame.size)
            if (p.parts.any { it == null }) return null
            pending.remove(key)
            val total = p.parts.sumOf { it!!.size }
            val out = ByteBuffer.allocate(total)
            p.parts.forEach { out.put(it!!) }
            return out.array()
        }
    }
}
