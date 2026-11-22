package org.volentify.mesh

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.volentify.mesh.data.EventType
import org.volentify.mesh.data.Priority
import org.volentify.mesh.data.Rules
import org.volentify.mesh.data.Rules.Provenance

class RulesTest {
    @Test fun criticalOnlyForLifeThreateningTypes() {
        Rules.CRITICAL_TYPES.forEach {
            assertEquals(Priority.CRITICAL, Rules.capPriority(it, Priority.CRITICAL))
            assertTrue(Priority.CRITICAL in Rules.allowedPriorities(it))
        }
        listOf(EventType.PERSON_RESCUED, EventType.RESOURCE_REQUEST, EventType.VOLUNTEER_STATUS, EventType.DISASTER_STATUS).forEach {
            assertEquals(Priority.HIGH, Rules.capPriority(it, Priority.CRITICAL))
            assertEquals(Priority.MEDIUM, Rules.capPriority(it, Priority.MEDIUM))
            assertFalse(Priority.CRITICAL in Rules.allowedPriorities(it))
        }
    }

    @Test fun duplicateAndHourlyCaps() {
        assertNull(Rules.checkReport(sameTypeLastMinute = 0, reportsLastHour = 9))
        assertEquals(Rules.Refusal.DUPLICATE, Rules.checkReport(1, 0))
        assertEquals(Rules.Refusal.TOO_MANY_REPORTS, Rules.checkReport(0, 10))
        assertNull(Rules.checkMessage(29))
        assertEquals(Rules.Refusal.TOO_MANY_MESSAGES, Rules.checkMessage(30))
    }

    @Test fun officialNeedsServerDownlinkAndConfirmation() {
        assertEquals(Provenance.OFFICIAL, Rules.provenance(true, true, officialFlag = true, relayClaim = false, isMessage = true))
        // Same claim relayed by a peer, or not (yet) confirmed: never official.
        assertEquals(Provenance.UNVERIFIED_RELAY, Rules.provenance(false, true, officialFlag = true, relayClaim = false, isMessage = true))
        assertEquals(Provenance.UNVERIFIED_RELAY, Rules.provenance(true, false, officialFlag = true, relayClaim = false, isMessage = true))
        assertEquals(Provenance.UNVERIFIED_RELAY, Rules.provenance(true, true, officialFlag = false, relayClaim = true, isMessage = true))
        assertEquals(Provenance.UNVERIFIED_MESSAGE, Rules.provenance(true, true, officialFlag = false, relayClaim = false, isMessage = true))
        assertEquals(Provenance.UNVERIFIED_REPORT, Rules.provenance(false, false, officialFlag = false, relayClaim = false, isMessage = false))
    }

    @Test fun authorityNamesAreFlagged() {
        assertTrue(Rules.claimsAuthority("Official · Volentify command"))
        assertTrue(Rules.claimsAuthority("VOLENTIFY HQ"))
        assertFalse(Rules.claimsAuthority("Puri boat team 4"))
    }

    @Test fun gatewayMustBeEncrypted() {
        assertTrue(Rules.isSecureServer("https://volentify.vercel.app"))
        assertTrue(Rules.isSecureServer(" https://ops.example.org/ "))
        assertTrue(Rules.isSecureServer("http://10.0.2.2:3000")) // emulator talking to a developer's laptop
        assertFalse(Rules.isSecureServer("http://volentify.vercel.app"))
        assertFalse(Rules.isSecureServer("ftp://volentify.vercel.app"))
        assertFalse(Rules.isSecureServer("https://user:pass@volentify.vercel.app"))
        assertFalse(Rules.isSecureServer("volentify.vercel.app"))
        assertFalse(Rules.isSecureServer("https://"))
        assertFalse(Rules.isSecureServer("https://bad host"))
    }
}
