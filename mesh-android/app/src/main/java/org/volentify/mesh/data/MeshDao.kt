package org.volentify.mesh.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/**
 * Relay order: this phone's own unconfirmed reports first, then other unconfirmed reports (both still need a
 * gateway), then command broadcasts from the server downlink, then other confirmed copies; within each group by
 * priority, newest first. Server-confirmed events keep relaying while ttl > 0: that is how the downlink reaches
 * phones without signal.
 */
private const val RELAYABLE_SQL =
    "SELECT * FROM mesh_events WHERE ttl > 0 AND status != 'FAILED' ORDER BY " +
        "CASE WHEN status != 'SERVER_CONFIRMED' AND createdHere = 1 THEN 0 " +
        "WHEN status != 'SERVER_CONFIRMED' THEN 1 WHEN fromServer = 1 THEN 2 ELSE 3 END, " +
        "CASE priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, " +
        "observedAt DESC"

/** A broadcast message (a situation update carrying text), as opposed to a field report. */
private const val IS_MESSAGE = "(type = 'DISASTER_STATUS' AND payloadJson LIKE '%\"message\"%')"

@Dao
interface MeshDao {
    /** Returns -1 when the eventId already exists — the stable deduplication rule (FR-06). */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(event: MeshEvent): Long

    /** Only for adopting the server's copy of an event (see GatewayUploader); everything else uses [insert]. */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun replace(event: MeshEvent)

    @Query("SELECT * FROM mesh_events WHERE eventId = :id")
    suspend fun get(id: String): MeshEvent?

    @Query("SELECT * FROM mesh_events ORDER BY observedAt DESC")
    fun observeAll(): Flow<List<MeshEvent>>

    @Query("SELECT COUNT(*) FROM mesh_events WHERE status != 'SERVER_CONFIRMED' AND status != 'FAILED'")
    fun observePendingCount(): Flow<Int>

    @Query(RELAYABLE_SQL + " LIMIT :limit")
    suspend fun relayable(limit: Int): List<MeshEvent>

    /**
     * Live relay queue for the BLE service, in the order above. Emits again whenever a report is created,
     * received, downloaded or changes status.
     */
    @Query(RELAYABLE_SQL + " LIMIT :limit")
    fun observeRelayable(limit: Int): Flow<List<MeshEvent>>

    /** Most recent event ids held on this phone (any status) — advertised to peers as the "have" digest. */
    @Query("SELECT eventId FROM mesh_events ORDER BY receivedAt DESC LIMIT :limit")
    suspend fun recentIds(limit: Int): List<String>

    /** Upload queue. Events fetched from the server downlink are already stored there and never go back up. */
    @Query("SELECT * FROM mesh_events WHERE status IN ('QUEUED', 'RELAYED', 'SYNCING') AND fromServer = 0 ORDER BY observedAt ASC LIMIT :limit")
    suspend fun outbox(limit: Int): List<MeshEvent>

    // ─── Field rules (Rules.kt): counted over reports and messages created on this phone ───

    @Query("SELECT COUNT(*) FROM mesh_events WHERE createdHere = 1 AND observedAt >= :since AND type = :type AND NOT " + IS_MESSAGE)
    suspend fun countOwnReportsOfType(type: EventType, since: Long): Int

    @Query("SELECT COUNT(*) FROM mesh_events WHERE createdHere = 1 AND observedAt >= :since AND NOT " + IS_MESSAGE)
    suspend fun countOwnReports(since: Long): Int

    @Query("SELECT COUNT(*) FROM mesh_events WHERE createdHere = 1 AND observedAt >= :since AND " + IS_MESSAGE)
    suspend fun countOwnMessages(since: Long): Int

    @Query("UPDATE mesh_events SET status = :status WHERE eventId IN (:ids)")
    suspend fun setStatus(ids: List<String>, status: DeliveryStatus)

    @Query("UPDATE mesh_events SET status = 'SERVER_CONFIRMED', serverAckId = :ackId, confirmedAt = :now WHERE eventId IN (:ids)")
    suspend fun confirm(ids: List<String>, ackId: String, now: Long)

    @Query("UPDATE mesh_events SET status = 'FAILED', failureReason = :reason WHERE eventId IN (:ids)")
    suspend fun fail(ids: List<String>, reason: String)

    @Query("UPDATE mesh_events SET relayCount = relayCount + 1, lastRelayAt = :now, status = CASE WHEN status = 'QUEUED' THEN 'RELAYED' ELSE status END WHERE eventId = :id")
    suspend fun markRelayed(id: String, now: Long)

    @Query("UPDATE mesh_events SET relayCount = relayCount + 1, lastRelayAt = :now, status = CASE WHEN status = 'QUEUED' THEN 'RELAYED' ELSE status END WHERE eventId IN (:ids)")
    suspend fun markRelayedAll(ids: List<String>, now: Long)

    /** Unsent reports return to the queue after an interrupted upload. */
    @Query("UPDATE mesh_events SET status = 'QUEUED' WHERE status = 'SYNCING'")
    suspend fun resetSyncing()

    /** OD-04: keep confirmed events on the device for 72 hours after sync (downlinked ones count from download). */
    @Query("DELETE FROM mesh_events WHERE status = 'SERVER_CONFIRMED' AND confirmedAt < :cutoff")
    suspend fun purgeConfirmedBefore(cutoff: Long): Int
}
