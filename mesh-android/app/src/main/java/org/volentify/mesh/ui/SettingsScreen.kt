package org.volentify.mesh.ui

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.volentify.mesh.data.Rules
import org.volentify.mesh.ui.theme.Palette

@Composable
fun SettingsScreen(vm: MeshViewModel, onClose: () -> Unit, onSafety: () -> Unit) {
    var server by remember { mutableStateOf(vm.settings.serverUrl) }
    var token by remember { mutableStateOf(vm.settings.gatewayToken.orEmpty()) }
    var mask by remember { mutableStateOf(vm.settings.maskLocation) }
    var name by remember { mutableStateOf(vm.settings.displayName) }
    // Other phones would read such a name as command; only server-verified messages may look official.
    val nameClaimsAuthority = Rules.claimsAuthority(name)
    // Reports and the gateway token are never sent unencrypted.
    val serverSecure = Rules.isSecureServer(server)
    val colors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = Palette.Signal, unfocusedBorderColor = Palette.Line, focusedTextColor = Palette.Ivory,
        unfocusedTextColor = Palette.Ivory, cursorColor = Palette.Signal, focusedLabelColor = Palette.Signal,
        unfocusedLabelColor = Palette.Stone,
    )

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Settings", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.weight(1f))
            TextButton(onClick = onClose) { Text("Done", color = Palette.Sand) }
        }

        Row(
            Modifier.fillMaxWidth().border(1.dp, Palette.Line, RoundedCornerShape(14.dp)).clickable(onClick = onSafety)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text("Safety & rules", style = MaterialTheme.typography.titleMedium)
                Text("When to call 112, what's official, privacy and battery", style = MaterialTheme.typography.bodySmall)
            }
            Text("›", color = Palette.Sand, fontSize = 24.sp)
        }

        Text("Your name on messages", style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(
            name, { name = it.take(40) }, label = { Text("Name or team") }, singleLine = true, colors = colors,
            modifier = Modifier.fillMaxWidth(), isError = nameClaimsAuthority,
            supportingText = {
                Text(
                    if (nameClaimsAuthority) "Names can't include “Official” or “Volentify”"
                    else "Every phone that relays your messages sees this. Use your first name or team, never someone else's details.",
                    color = if (nameClaimsAuthority) Palette.Critical else Palette.Stone,
                )
            },
        )
        Text(
            "False alarms are an offence under Section 54 of the Disaster Management Act 2005 (up to 1 year in prison or a fine). Report only what you see.",
            style = MaterialTheme.typography.bodySmall,
        )

        Text("Gateway sync", style = MaterialTheme.typography.titleMedium)
        Text(
            "Whenever this phone gets mobile data or Wi-Fi it uploads every report it holds to the Volentify website automatically, and brings back messages from command for phones without signal. A gateway token (from your web dashboard) is optional: it marks uploads as coming from a verified responder.",
            style = MaterialTheme.typography.bodyMedium,
        )
        OutlinedTextField(
            server, { server = it }, label = { Text("Server address") }, singleLine = true, colors = colors,
            modifier = Modifier.fillMaxWidth(), isError = !serverSecure,
            supportingText = {
                if (!serverSecure) Text("Use an https:// address. Reports and tokens are never sent unencrypted.", color = Palette.Critical)
            },
        )
        OutlinedTextField(token, { token = it }, label = { Text("Gateway token (optional)") }, colors = colors, modifier = Modifier.fillMaxWidth(), maxLines = 3)
        Button(
            onClick = {
                vm.settings.serverUrl = server
                vm.settings.gatewayToken = token
                vm.settings.maskLocation = mask
                vm.settings.displayName = name
                vm.syncNow()
                onClose()
            },
            enabled = !nameClaimsAuthority && serverSecure,
            shape = RoundedCornerShape(50),
            colors = ButtonDefaults.buttonColors(containerColor = Palette.Signal, contentColor = Palette.Ink),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Save and sync") }

        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Mask my exact location", style = MaterialTheme.typography.titleMedium)
                Text("Shifts reported positions by up to 500 m", style = MaterialTheme.typography.bodySmall)
            }
            Switch(mask, { mask = it }, colors = SwitchDefaults.colors(checkedTrackColor = Palette.Signal, checkedThumbColor = Palette.Ink))
        }
        Text(
            "Any phone that relays your reports can read them. Turn masking on if you're worried about revealing exactly where you are; turn it off if you need to be found. Never type Aadhaar, bank or phone numbers into notes.",
            style = MaterialTheme.typography.bodySmall,
        )

        Text("This phone", style = MaterialTheme.typography.titleMedium)
        Text("Mesh node ID — a random identifier, not your hardware address", style = MaterialTheme.typography.bodySmall)
        Text(vm.settings.nodeId, fontFamily = FontFamily.Monospace, color = Palette.Sand)
    }
}
