package org.volentify.mesh.data

/**
 * Field rules this phone enforces before anything is saved, and the trust label every item gets in lists.
 * They mirror the "Safety & rules" screen. Pure Kotlin, so they are unit-tested without a device.
 */
object Rules {
    /** Short enough to cross a few Bluetooth hops quickly and to read at a glance. */
    const val MAX_MESSAGE_CHARS = 240
    /** A second report of the same type within a minute is almost always a repeated tap on an SOS already saved. */
    const val DUPLICATE_WINDOW_MS = 60_000L
    const val RATE_WINDOW_MS = 60 * 60_000L
    const val MAX_REPORTS_PER_HOUR = 10
    const val MAX_MESSAGES_PER_HOUR = 30
    /** OD-04: confirmed events stay on the phone for 72 hours after the server confirms them. */
    const val CONFIRMED_RETENTION_MS = 72 * 60 * 60_000L

    /** Only life-threatening report types may be sent as CRITICAL; everything else tops out at HIGH. */
    val CRITICAL_TYPES: Set<EventType> = setOf(
        EventType.PERSON_TRAPPED, EventType.MEDICAL_EMERGENCY, EventType.FIRE, EventType.FLOOD, EventType.PERSON_MISSING,
    )

    /** Priorities offered for [type], lowest first. */
    fun allowedPriorities(type: EventType): List<Priority> =
        if (type in CRITICAL_TYPES) Priority.entries.toList() else Priority.entries.filter { it != Priority.CRITICAL }

    fun capPriority(type: EventType, priority: Priority): Priority =
        if (priority == Priority.CRITICAL && type !in CRITICAL_TYPES) Priority.HIGH else priority

    enum class Refusal(val message: String) {
        DUPLICATE("Your report is already saved and being relayed — no need to send it again"),
        TOO_MANY_REPORTS(
            "This phone has sent $MAX_REPORTS_PER_HOUR reports in the last hour, the most allowed. " +
                "Wait a little before the next one. If someone is in danger now, call 112.",
        ),
        TOO_MANY_MESSAGES("This phone has sent $MAX_MESSAGES_PER_HOUR messages in the last hour. Wait a little before sending more."),
    }

    /** Counts are of reports created on this phone (not messages). Null means the report may be saved. */
    fun checkReport(sameTypeLastMinute: Int, reportsLastHour: Int): Refusal? = when {
        sameTypeLastMinute > 0 -> Refusal.DUPLICATE
        reportsLastHour >= MAX_REPORTS_PER_HOUR -> Refusal.TOO_MANY_REPORTS
        else -> null
    }

    fun checkMessage(messagesLastHour: Int): Refusal? =
        if (messagesLastHour >= MAX_MESSAGES_PER_HOUR) Refusal.TOO_MANY_MESSAGES else null

    private val AUTHORITY = Regex("official|volentify", RegexOption.IGNORE_CASE)

    /** A sender name that would read as command on other phones ("Official", "Volentify …"). */
    fun claimsAuthority(name: String): Boolean = AUTHORITY.containsMatchIn(name)

    /** A developer's own machine: the only place plain http is allowed (matches res/xml/network_security_config.xml). */
    private val LOCAL_HOSTS = setOf("localhost", "127.0.0.1", "10.0.2.2")

    /**
     * Gateway uploads carry reports, locations and the gateway token, so the server address must be https://
     * (plain http only for local testing) and must not embed a username or password.
     */
    fun isSecureServer(url: String): Boolean {
        val uri = try { java.net.URI(url.trim()) } catch (e: Exception) { return false }
        val host = uri.host?.lowercase() ?: return false
        if (uri.userInfo != null) return false
        return when (uri.scheme?.lowercase()) {
            "https" -> true
            "http" -> host in LOCAL_HOSTS
            else -> false
        }
    }

    enum class Provenance(val label: String) {
        OFFICIAL("Official · Volentify command"),
        /** Arrived over Bluetooth claiming to be official: phones can't verify that, so it is never shown as such. */
        UNVERIFIED_RELAY("Unverified relay"),
        UNVERIFIED_MESSAGE("Unverified message"),
        UNVERIFIED_REPORT("Unverified field report"),
    }

    /**
     * "Official" requires all three: fetched by this phone from the server downlink, server-confirmed, and flagged
     * official by the server. Anything else that mentions being official is an unverified relay.
     */
    fun provenance(
        fromServer: Boolean, confirmed: Boolean, officialFlag: Boolean, relayClaim: Boolean, isMessage: Boolean,
    ): Provenance = when {
        officialFlag && fromServer && confirmed -> Provenance.OFFICIAL
        officialFlag || relayClaim -> Provenance.UNVERIFIED_RELAY
        isMessage -> Provenance.UNVERIFIED_MESSAGE
        else -> Provenance.UNVERIFIED_REPORT
    }
}
