package org.volentify.mesh.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Looper
import android.os.SystemClock
import androidx.core.location.LocationManagerCompat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import org.volentify.mesh.mesh.MeshPermissions
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.random.Random

/** A position for a report. [accuracyM] is the 68% radius reported by Android, when known. */
data class Fix(val lat: Double, val lng: Double, val accuracyM: Float?, val ageMs: Long, val provider: String) {
    fun masked(): Fix = LocationProvider.jitter(lat, lng).let { (la, ln) -> copy(lat = la, lng = ln) }
    val accuracyRounded: Int? get() = accuracyM?.roundToInt()
}

enum class LocationStatus { NoPermission, ServicesOff, Ready }

/**
 * Best-effort position for field reports. Reports still save without one (AT-05), but the phone now tries every
 * location source at once instead of waiting on GPS alone: the fused provider (Android 12+), GPS, network,
 * and passive providers all listen together and the first good fix wins.
 */
object LocationProvider {
    private const val QUICK_MAX_AGE_MS = 15 * 60_000L
    private const val GOOD_ACCURACY_M = 50f
    private const val STALE_MAX_AGE_MS = 2 * 60 * 60_000L

    fun status(context: Context): LocationStatus {
        if (!MeshPermissions.locationGranted(context)) return LocationStatus.NoPermission
        val lm = context.getSystemService(LocationManager::class.java) ?: return LocationStatus.ServicesOff
        return if (LocationManagerCompat.isLocationEnabled(lm)) LocationStatus.Ready else LocationStatus.ServicesOff
    }

    /**
     * Checks all providers (GPS, network, fused, passive) for the best available cached fix.
     * Returns null only if no location has ever been recorded or permission is absent.
     */
    @SuppressLint("MissingPermission")
    fun lastKnown(context: Context): Fix? {
        if (status(context) != LocationStatus.Ready) return null
        val lm = context.getSystemService(LocationManager::class.java) ?: return null
        val candidates = allProviders(lm).mapNotNull { p -> safe { lm.getLastKnownLocation(p) } }
        val fresh = bestOf(candidates.filter { ageMs(it) <= STALE_MAX_AGE_MS })
        val chosen = fresh ?: bestOf(candidates)
        return chosen?.let { toFix(it) }
    }

    /**
     * Waits up to [timeoutMs] for a fix. Returns null without permission, with location off, or with no signal.
     * [onProgress] receives the best fix so far while a more accurate one is awaited.
     */
    @SuppressLint("MissingPermission") // guarded by status()
    suspend fun current(context: Context, timeoutMs: Long = 20_000, onProgress: ((Fix) -> Unit)? = null): Fix? {
        if (status(context) != LocationStatus.Ready) return null
        val lm = context.getSystemService(LocationManager::class.java) ?: return null

        // 1. Immediately emit best cached location so forms and callers have a fix right away
        val cached = lastKnown(context)
        if (cached != null) {
            onProgress?.invoke(cached)
            // If already high accuracy and fresh (< 2 mins), return immediately
            if (cached.ageMs <= 2 * 60_000L && (cached.accuracyM ?: Float.MAX_VALUE) <= GOOD_ACCURACY_M) {
                return cached
            }
        }

        val providers = activeProviders(lm)
        if (providers.isEmpty()) return cached

        var best: Location? = null
        val good = CompletableDeferred<Location>()
        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                if (best == null || better(location, best!!)) {
                    best = location
                    onProgress?.invoke(toFix(location))
                }
                if (location.hasAccuracy() && location.accuracy <= GOOD_ACCURACY_M) good.complete(location)
            }

            // Required below API 30, where these are abstract.
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
            @Deprecated("Deprecated in Java")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        }
        val fix = withContext(Dispatchers.Main) {
            var listening = false
            try {
                for (p in providers) {
                    safe { lm.requestLocationUpdates(p, 0L, 0f, listener, Looper.getMainLooper()); listening = true }
                }
                if (listening) withTimeoutOrNull(timeoutMs) { good.await() } else null
            } finally {
                safe { lm.removeUpdates(listener) }
            }
        }
        val chosen = fix ?: best
        return chosen?.let { toFix(it) } ?: cached
    }

    /** OD-05: uniform offset of up to ±500 m on each axis. */
    fun jitter(lat: Double, lng: Double, meters: Double = 500.0): Pair<Double, Double> {
        val dLat = (Random.nextDouble(-1.0, 1.0) * meters) / 111_320.0
        val dLng = (Random.nextDouble(-1.0, 1.0) * meters) / (111_320.0 * cos(Math.toRadians(lat)).coerceAtLeast(0.01))
        return (lat + dLat) to (lng + dLng)
    }

    private fun allProviders(lm: LocationManager): List<String> {
        val all = safe { lm.allProviders } ?: emptyList()
        val standard = buildList {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) add(LocationManager.FUSED_PROVIDER)
            add(LocationManager.GPS_PROVIDER)
            add(LocationManager.NETWORK_PROVIDER)
            add(LocationManager.PASSIVE_PROVIDER)
        }
        return (all + standard).distinct()
    }

    private fun activeProviders(lm: LocationManager): List<String> {
        val all = safe { lm.allProviders } ?: emptyList()
        val wanted = buildList {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && LocationManager.FUSED_PROVIDER in all) add(LocationManager.FUSED_PROVIDER)
            add(LocationManager.GPS_PROVIDER)
            add(LocationManager.NETWORK_PROVIDER)
            if (LocationManager.PASSIVE_PROVIDER in all) add(LocationManager.PASSIVE_PROVIDER)
        }
        return wanted.filter { it in all && (safe { lm.isProviderEnabled(it) } == true) }
    }

    private fun ageMs(l: Location): Long =
        if (l.elapsedRealtimeNanos > 0L) (SystemClock.elapsedRealtimeNanos() - l.elapsedRealtimeNanos).coerceAtLeast(0L) / 1_000_000L
        else (System.currentTimeMillis() - l.time).coerceAtLeast(0L)

    /** Newer wins unless much less accurate; among similar ages, more accurate wins. */
    private fun better(candidate: Location, current: Location): Boolean {
        val newer = ageMs(candidate) < ageMs(current) - 30_000
        val older = ageMs(candidate) > ageMs(current) + 30_000
        val ca = if (candidate.hasAccuracy()) candidate.accuracy else Float.MAX_VALUE
        val cu = if (current.hasAccuracy()) current.accuracy else Float.MAX_VALUE
        return when {
            newer -> ca <= cu * 4
            older -> false
            else -> ca < cu
        }
    }

    private fun bestOf(list: List<Location>): Location? = list.fold(null as Location?) { acc, l -> if (acc == null || better(l, acc)) l else acc }

    private fun toFix(l: Location) = Fix(l.latitude, l.longitude, if (l.hasAccuracy()) l.accuracy else null, ageMs(l), l.provider ?: "unknown")

    private inline fun <T> safe(block: () -> T): T? = try {
        block()
    } catch (_: SecurityException) {
        null
    } catch (_: IllegalArgumentException) {
        null
    }
}
