package org.volentify.mesh.ui

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import org.json.JSONObject
import org.volentify.mesh.data.Envelope
import org.volentify.mesh.data.MeshEvent
import org.volentify.mesh.data.Rules
import org.volentify.mesh.mesh.MeshPermissions
import org.volentify.mesh.mesh.MeshState
import org.volentify.mesh.ui.theme.Palette
import java.text.DateFormat
import java.util.Date

@Composable
fun HomeScreen(
    vm: MeshViewModel,
    onNewReport: () -> Unit,
    onMessages: () -> Unit,
    onSettings: () -> Unit,
    onGrantPermissions: () -> Unit,
) {
    val events by vm.events.collectAsState()
    val pending by vm.pending.collectAsState()
    val mesh by MeshState.snapshot.collectAsState()
    val message by vm.message.collectAsState()
    val context = LocalContext.current
    val permitted = MeshPermissions.bluetoothGranted(context)

    LaunchedEffect(message) {
        if (message != null) {
            delay(4500)
            vm.clearMessage()
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Volentify", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.weight(1f))
                IconButton(onClick = onSettings) { Icon(Icons.Outlined.Settings, contentDescription = "Settings", tint = Palette.Sand) }
            }
            Text("Mesh field reports", style = MaterialTheme.typography.bodySmall)
        }
        item {
            Column(
                Modifier.fillMaxWidth().border(1.dp, Palette.Line, RoundedCornerShape(16.dp)).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(if (mesh.running) "Relaying over Bluetooth" else "Relay is off", style = MaterialTheme.typography.titleMedium)
                        Text(
                            when {
                                !permitted -> "Allow nearby devices so this phone can relay"
                                mesh.error != null -> mesh.error!!
                                mesh.running -> "${mesh.peersNearby} phone${if (mesh.peersNearby == 1) "" else "s"} nearby · ${mesh.sent} sent · ${mesh.received} received" +
                                    (if (mesh.batterySaver) "\nBattery low — relaying less often to save power" else "")
                                else -> "Turn on to pass reports between phones without signal"
                            },
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    Switch(
                        checked = vm.settings.meshEnabled && mesh.running,
                        onCheckedChange = { on -> if (!permitted) onGrantPermissions() else vm.setMesh(on) },
                        colors = SwitchDefaults.colors(checkedTrackColor = Palette.Signal, checkedThumbColor = Palette.Ink),
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    Stat("Waiting to sync", pending.toString())
                    Stat("Last sync", if (vm.settings.lastSyncAt == 0L) "Never" else DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(vm.settings.lastSyncAt)))
                }
                vm.settings.lastSyncMessage?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                vm.settings.lastDownlinkMessage?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
            }
        }
        item {
            Button(
                onClick = onNewReport,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Signal, contentColor = Palette.Ink),
            ) { Text("New field report", fontSize = 16.sp) }
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = onMessages, modifier = Modifier.weight(1f), shape = RoundedCornerShape(50)) {
                    Text("Messages", color = Palette.Ivory)
                }
                OutlinedButton(onClick = { vm.syncNow() }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(50)) {
                    Text("Sync now", color = Palette.Ivory)
                }
            }
            message?.let { Text(it, color = Palette.Gold, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp)) }
        }
        item {
            Text("Reports on this phone", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(top = 8.dp))
            Text(
                "Field reports are unverified until an incident controller reviews them. Only items marked " +
                    "“${Rules.Provenance.OFFICIAL.label}” come from verified command.",
                style = MaterialTheme.typography.bodySmall,
            )
        }
        if (events.isEmpty()) {
            item {
                Text(
                    "Nothing yet. Reports you create, and reports relayed to you by nearby phones, appear here with their delivery status.",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
        items(events, key = { it.eventId }) { EventRow(it) }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun Stat(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.bodySmall)
        Text(value, style = MaterialTheme.typography.headlineSmall)
    }
}

/** Trust markers are shown as the label above each item, never as raw payload text. */
private val HIDDEN_KEYS = setOf(Envelope.KEY_OFFICIAL, Envelope.KEY_ALERT_CODE, Envelope.KEY_RELAY_CLAIM)

@Composable
private fun EventRow(e: MeshEvent) {
    val payload = remember(e.payloadJson) { runCatching { JSONObject(e.payloadJson) }.getOrNull() }
    val details = remember(payload) {
        val o = payload ?: return@remember ""
        if (o.optBoolean("redacted")) {
            // Sensitive reports from the server arrive without details (OD-02).
            "Details withheld for privacy" + ((o.opt("count_band") as? String)?.let { " · $it people" } ?: "")
        } else {
            o.keys().asSequence().filter { it !in HIDDEN_KEYS }.joinToString(" · ") { k -> "${k.replace('_', ' ')}: ${o.get(k)}" }
        }
    }
    val provenance = provenanceOf(e, payload)
    val alertCode = (payload?.opt(Envelope.KEY_ALERT_CODE) as? String).orEmpty()
    Column(
        Modifier.fillMaxWidth().border(1.dp, Palette.Line, RoundedCornerShape(14.dp)).padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Pill(
            if (provenance == Rules.Provenance.OFFICIAL && alertCode.isNotEmpty()) "${provenance.label} · $alertCode" else provenance.label,
            provenanceColor(provenance),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Pill(e.priority.name.lowercase().replaceFirstChar { it.uppercase() }, priorityColor(e.priority))
            Pill(e.status.label, statusColor(e.status))
        }
        Text(e.type.label, style = MaterialTheme.typography.titleMedium)
        if (details.isNotBlank()) Text(details, style = MaterialTheme.typography.bodyMedium)
        Text(
            buildString {
                append(DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(e.observedAt)))
                append(
                    when {
                        e.createdHere -> " · created here"
                        e.fromServer -> " · from the Volentify server"
                        else -> " · relayed in, ${e.hopCount} hop${if (e.hopCount == 1) "" else "s"}"
                    },
                )
                if (e.lat == null) append(" · no GPS")
            },
            style = MaterialTheme.typography.bodySmall,
        )
        Text(e.eventId.take(8), fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = Palette.Stone)
    }
}
