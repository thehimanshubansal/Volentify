package org.volentify.mesh

import android.app.Application
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import org.volentify.mesh.sync.GatewaySync

class VolentifyApp : Application() {
    /** The network that most recently gained validated internet; an upload runs once per such transition. */
    @Volatile private var onlineNetwork: Network? = null

    override fun onCreate() {
        super.onCreate()
        GatewaySync.schedulePeriodic(this)
        watchConnectivity()
        // Anything still waiting from an earlier session goes out now if the phone is already online.
        GatewaySync.uploadNow(this)
    }

    /**
     * Sync the moment mobile data or Wi-Fi brings internet back, whether or not the Bluetooth relay is running.
     * (When the app process isn't alive, the WorkManager job with a network constraint does the same.)
     */
    private fun watchConnectivity() {
        val cm = getSystemService(ConnectivityManager::class.java) ?: return
        try {
            cm.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() {
                override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) {
                    val online = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                    if (online && onlineNetwork != network) {
                        onlineNetwork = network
                        GatewaySync.requestSoon(this@VolentifyApp)
                    } else if (!online && onlineNetwork == network) {
                        onlineNetwork = null
                    }
                }

                override fun onLost(network: Network) {
                    if (onlineNetwork == network) onlineNetwork = null
                }
            })
        } catch (_: RuntimeException) {
            // Too many callbacks registered or a restricted profile: WorkManager still syncs when online.
        }
    }
}
