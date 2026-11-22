package org.volentify.mesh.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import org.json.JSONObject
import org.volentify.mesh.data.MeshEvent
import org.volentify.mesh.data.PiiGuard
import org.volentify.mesh.data.Priority
import org.volentify.mesh.data.Rules
import org.volentify.mesh.mesh.MeshState
import org.volentify.mesh.ui.theme.Palette
import java.text.DateFormat
import java.util.Date

/**
 * Broadcast messages relayed over the Bluetooth mesh. Every phone in range keeps a copy and passes
 * it on (up to five hops); any phone with internet uploads it to command as a situation update, and brings
 * command's own broadcasts back from the server downlink.
 */
@Composable
fun MessagesScreen(vm: MeshViewModel, onClose: () -> Unit) {
    val messages by vm.messages.collectAsState()
    val mesh by MeshState.snapshot.collectAsState()
    val notice by vm.message.collectAsState()
    var draft by remember { mutableStateOf("") }
    var urgent by remember { mutableStateOf(false) }
    val draftPii = remember(draft) { PiiGuard.scan(draft) }

    // Only notices raised here (refusals, removed numbers): drop anything left over from another screen.
    LaunchedEffect(Unit) { vm.clearMessage() }
    LaunchedEffect(notice) {
        if (notice != null) {
            delay(6000)
            vm.clearMessage()
        }
    }

    Column(Modifier.fillMaxSize().imePadding().padding(horizontal = 20.dp)) {
        Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Mesh messages", style = MaterialTheme.typography.headlineMedium)
                Text(
                    if (mesh.running) "${mesh.peersNearby} phone${if (mesh.peersNearby == 1) "" else "s"} in range · relays up to 5 hops"
                    else "Relay is off — messages wait on this phone until it's on",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            TextButton(onClick = onClose) { Text("Back", color = Palette.Sand) }
        }
        Text(
            "Messages are unverified unless marked “${Rules.Provenance.OFFICIAL.label}”. Never forward rumours.",
            style = MaterialTheme.typography.bodySmall,
        )

        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth().padding(vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            reverseLayout = true, // newest at the bottom, like a chat
        ) {
            if (messages.isEmpty()) {
                item {
                    Text(
                        "No messages yet. Anything you send here reaches every phone running Volentify Mesh within Bluetooth range, and theirs pass it on — no signal needed.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
            items(messages, key = { it.eventId }) { MessageBubble(it) }
        }

        Column(Modifier.padding(bottom = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            notice?.let { Text(it, color = Palette.Gold, fontSize = 13.sp) }
            OutlinedTextField(
                value = draft,
                onValueChange = { draft = it.take(MAX_MESSAGE) },
                placeholder = { Text("Message everyone nearby") },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 4,
                supportingText = {
                    if (draftPii.isNotEmpty()) {
                        Text(
                            PiiGuard.describe(draftPii).replaceFirstChar { it.uppercase() } + " found — it will be removed before sending",
                            color = Palette.High,
                        )
                    } else {
                        Text("${draft.length}/$MAX_MESSAGE · sending as ${vm.settings.displayName}", color = Palette.Stone)
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Palette.Signal, unfocusedBorderColor = Palette.Line,
                    focusedTextColor = Palette.Ivory, unfocusedTextColor = Palette.Ivory, cursorColor = Palette.Signal,
                ),
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    if (urgent) "Urgent" else "Normal",
                    color = if (urgent) Palette.Critical else Palette.Sand,
                    fontSize = 13.sp,
                    modifier = Modifier
                        .border(1.dp, if (urgent) Palette.Critical else Palette.Line, RoundedCornerShape(50))
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                )
                TextButton(onClick = { urgent = !urgent }) { Text("Change priority", color = Palette.Stone, fontSize = 13.sp) }
                Spacer(Modifier.weight(1f))
                Button(
                    onClick = {
                        // Messages top out at HIGH (Rules): CRITICAL is kept for life-threatening field reports.
                        vm.sendMessage(draft, if (urgent) Priority.HIGH else Priority.MEDIUM) {
                            draft = ""
                            urgent = false
                        }
                    },
                    enabled = draft.isNotBlank(),
                    shape = RoundedCornerShape(50),
                    colors = ButtonDefaults.buttonColors(containerColor = Palette.Signal, contentColor = Palette.Ink),
                ) { Text("Send") }
            }
        }
    }
}

@Composable
private fun MessageBubble(e: MeshEvent) {
    val payload = remember(e.payloadJson) { runCatching { JSONObject(e.payloadJson) }.getOrNull() }
    val text = payload?.optString("message").orEmpty()
    val from = (payload?.opt("from") as? String).orEmpty().ifEmpty { "Field team" }
    val role = (payload?.opt("role") as? String).orEmpty().lowercase().replace('_', ' ')
    val mine = e.createdHere
    val provenance = provenanceOf(e, payload)
    val official = provenance == Rules.Provenance.OFFICIAL
    val sender = when {
        mine -> "You"
        official -> from
        // A peer can call itself anything; a name that reads as command is marked as such.
        Rules.claimsAuthority(from) -> "$from (unverified)"
        role.isNotEmpty() -> "$from · $role"
        else -> from
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
        Column(
            Modifier
                .widthIn(max = 320.dp)
                .background(if (mine) Palette.Ink700 else Palette.Ink800, RoundedCornerShape(16.dp))
                .border(
                    1.dp,
                    when {
                        official -> Palette.Signal.copy(alpha = 0.7f)
                        e.priority >= Priority.HIGH -> Palette.Critical.copy(alpha = 0.6f)
                        else -> Palette.Line
                    },
                    RoundedCornerShape(16.dp),
                )
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(provenance.label, color = provenanceColor(provenance), fontSize = 11.sp)
            Text(sender, color = Palette.Gold, fontSize = 12.sp)
            Text(text, color = Palette.Ivory, fontSize = 15.sp)
            Spacer(Modifier.height(2.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(e.observedAt)) + when {
                        mine -> ""
                        e.fromServer -> " · from the server"
                        else -> " · ${e.hopCount} hop${if (e.hopCount == 1) "" else "s"}"
                    },
                    color = Palette.Stone, fontSize = 11.sp,
                )
                Text(e.status.label, color = statusColor(e.status), fontSize = 11.sp)
            }
        }
    }
}
