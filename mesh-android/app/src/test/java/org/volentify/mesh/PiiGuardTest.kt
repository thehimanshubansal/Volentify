package org.volentify.mesh

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.volentify.mesh.data.PiiGuard
import org.volentify.mesh.data.PiiGuard.Kind

class PiiGuardTest {
    private fun scrubbed(s: String) = PiiGuard.scrub(s).text

    @Test fun mobileNumbersInCommonFormats() {
        listOf(
            "9876543210", "98765 43210", "98765-43210", "987 654 3210", "+91 9876543210", "+91-98765-43210",
            "+919876543210", "09876543210", "0091 9876543210", "919876543210", "6123456789",
        ).forEach { n ->
            val r = PiiGuard.scrub("call $n now")
            assertEquals(n, "call [removed] now", r.text)
            assertEquals(n, setOf(Kind.PHONE), r.removed)
        }
    }

    @Test fun aadhaarGroupedOrNot() {
        listOf("2345 6789 0123", "2345-6789-0123", "234567890123", "9876 5432 1098").forEach { n ->
            val r = PiiGuard.scrub("aadhaar $n.")
            assertEquals(n, "aadhaar [removed].", r.text)
            assertEquals(n, setOf(Kind.AADHAAR), r.removed)
        }
    }

    @Test fun panAnyCase() {
        assertEquals("pan [removed] ok", scrubbed("pan ABCDE1234F ok"))
        assertEquals(setOf(Kind.PAN), PiiGuard.scrub("abcde1234f").removed)
    }

    @Test fun cardAndBankRunsAreRemovedWhole() {
        listOf("4111 1111 1111 1111", "4111-1111-1111-1111", "4111111111111111", "3782 822463 10005", "1234567890123",
            "4111 1111 1111 1111 123").forEach { n ->
            val r = PiiGuard.scrub("a/c $n")
            assertEquals(n, "a/c [removed]", r.text)
            assertEquals(n, setOf(Kind.CARD), r.removed)
        }
    }

    @Test fun devanagariDigitsAreRecognised() {
        val r = PiiGuard.scrub("फ़ोन ९८७६५४३२१० पर")
        assertEquals("फ़ोन [removed] पर", r.text)
        assertEquals(setOf(Kind.PHONE), r.removed)
    }

    @Test fun ordinaryNumbersAreKept() {
        listOf(
            "12 people, 3 boats, pincode 751001, since 2024",
            "Ward 12 house 45, water up to 1.5 m at 10:30",
            "1234567890", // 10 digits not starting 6–9: not a mobile
            "need 50 kg rice and 200 litres water",
            "",
        ).forEach { s ->
            val r = PiiGuard.scrub(s)
            assertEquals(s, s, r.text)
            assertTrue(s, r.removed.isEmpty())
        }
    }

    @Test fun severalKindsAreAllReported() {
        val r = PiiGuard.scrub("Ravi 9876543210, Aadhaar 2345 6789 0123, PAN ABCDE1234F")
        assertEquals("Ravi [removed], Aadhaar [removed], PAN [removed]", r.text)
        assertEquals(setOf(Kind.PHONE, Kind.AADHAAR, Kind.PAN), r.removed)
        assertEquals("phone number, Aadhaar number, PAN", PiiGuard.describe(r.removed))
    }

    @Test fun neverLengthensText() {
        val s = "+91 98765 43210 and 98765 43210 and 2345 6789 0123"
        assertTrue(scrubbed(s).length <= s.length)
    }
}
