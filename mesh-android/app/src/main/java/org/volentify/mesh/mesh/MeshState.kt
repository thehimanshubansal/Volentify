package org.volentify.mesh.mesh

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/** Live relay status for the UI. */
object MeshState {
    data class Snapshot(
        val running: Boolean = false,
        val peersNearby: Int = 0,
        val lastExchangeAt: Long = 0,
        val received: Int = 0,
        val sent: Int = 0,
        val error: String? = null,
        /** Battery ≤ 15 % and not charging: the relay scans and advertises less often (see BleMeshService). */
        val batterySaver: Boolean = false,
    )

    private val state = MutableStateFlow(Snapshot())
    val snapshot: StateFlow<Snapshot> = state.asStateFlow()

    /** Atomic: relay sessions and inbound writes update the counters concurrently from several threads. */
    fun update(transform: (Snapshot) -> Snapshot) {
        state.update(transform)
    }
}
