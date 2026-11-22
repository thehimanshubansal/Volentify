package org.volentify.mesh.data

/**
 * Removes personal numbers from free text before it is saved. Every phone that relays a report can read it, so
 * Aadhaar, mobile, PAN and bank/card numbers never leave this phone: each is replaced with [PLACEHOLDER].
 * Digits in any script (e.g. Devanagari ९८७६…) are recognised. Pure Kotlin, unit-tested in PiiGuardTest.
 */
object PiiGuard {
    const val PLACEHOLDER = "[removed]"

    enum class Kind(val label: String) {
        CARD("bank or card number"),
        PHONE("phone number"),
        AADHAAR("Aadhaar number"),
        PAN("PAN"),
    }

    data class Result(val text: String, val removed: Set<Kind>)

    private const val D = "[0-9]"
    private const val SEP = "[ -]"

    // Order matters: card-like runs first so a grouped 16-digit card isn't half-taken as an Aadhaar number, and
    // mobiles before Aadhaar so "+91 98765 43210" and "919876543210" are named as phone numbers.
    private val PATTERNS: List<Pair<Kind, Regex>> = listOf(
        Kind.CARD to Regex(
            "(?<!$D)(?:$D{13,19}|$D{4}(?:$SEP$D{4}){3}(?:$SEP$D{1,3})?|$D{4}$SEP$D{6}$SEP$D{5})(?!$D)",
        ),
        Kind.PHONE to Regex(
            "(?<![0-9+])(?:(?:\\+|00)?91$SEP?|0)?[6-9](?:$D{9}|$D{4}$SEP$D{5}|$D{2}$SEP$D{3}$SEP$D{4}|$D{3}$SEP$D{3}$SEP$D{3})(?!$D)",
        ),
        Kind.AADHAAR to Regex("(?<!$D)$D{4}$SEP?$D{4}$SEP?$D{4}(?!$D)"),
        Kind.PAN to Regex("(?<![A-Za-z0-9])[A-Za-z]{5}$D{4}[A-Za-z](?![A-Za-z0-9])"),
    )

    fun scrub(text: String): Result {
        var out = text
        val removed = LinkedHashSet<Kind>()
        for ((kind, regex) in PATTERNS) {
            // Matched on an ASCII-digit copy of the same length, so match positions apply to the original text.
            val matches = regex.findAll(asciiDigits(out)).toList()
            if (matches.isEmpty()) continue
            removed += kind
            val sb = StringBuilder(out)
            for (m in matches.asReversed()) sb.replace(m.range.first, m.range.last + 1, PLACEHOLDER)
            out = sb.toString()
        }
        return Result(out, removed)
    }

    /** What [scrub] would remove, for a live hint while the user types. */
    fun scan(text: String): Set<Kind> = scrub(text).removed

    fun describe(kinds: Collection<Kind>): String = kinds.joinToString(", ") { it.label }

    private fun asciiDigits(s: String): String {
        if (s.none { it.isDigit() && it !in '0'..'9' }) return s
        return buildString(s.length) {
            for (c in s) {
                val d = if (c.isDigit() && c !in '0'..'9') Character.digit(c, 10) else -1
                append(if (d in 0..9) '0' + d else c)
            }
        }
    }
}
