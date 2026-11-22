package org.volentify.mesh.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.volentify.mesh.ui.theme.Palette

/**
 * "Before you use Volentify Mesh": shown once on first run and must be acknowledged before the relay starts;
 * reachable again from Settings → Safety & rules ([firstRun] false).
 */
@Composable
fun SafetyScreen(firstRun: Boolean, onAcknowledge: () -> Unit, onClose: () -> Unit) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (firstRun) "Before you use Volentify Mesh" else "Safety & rules",
                style = MaterialTheme.typography.headlineMedium, modifier = Modifier.weight(1f),
            )
            if (!firstRun) TextButton(onClick = onClose) { Text("Back", color = Palette.Sand) }
        }
        Text("A one-minute read. Find it again any time in Settings → Safety & rules.", style = MaterialTheme.typography.bodySmall)

        Rule(
            Palette.Critical, "In danger now? Call 112",
            "The mesh is best-effort: a report can take minutes to hours to reach responders. " +
                "It never replaces 112, 108 (ambulance), 101 (fire) or 100 (police).",
        )
        Call112Button()
        Rule(
            Palette.Signal, "Mesh reports are unverified",
            "Reports and messages are unverified until an incident controller reviews them. Only messages marked " +
                "“Official · Volentify command” come from verified command. Never forward rumours.",
        )
        Rule(
            Palette.High, "False alarms are an offence",
            "Section 54, Disaster Management Act 2005: a false alarm or warning about a disaster can mean up to " +
                "1 year in prison or a fine. Report only what you see yourself.",
        )
        Rule(
            Palette.Moderate, "Stay out of danger",
            "Don't enter flood water, collapsed buildings, fire or gas-leak areas to file a report. Volunteers stay " +
                "out of zones command has closed and work only within their training.",
        )
        Rule(
            Palette.Info, "Protect privacy",
            "Don't type Aadhaar, ration-card, bank or phone numbers, caste or religion, or other people's full names " +
                "into notes: any phone that relays a report or message can read it. The app removes numbers it " +
                "recognises. Turn on “Mask my location” if you're worried about revealing exactly where you are; " +
                "turn it off if you need to be found.",
        )
        Rule(
            Palette.Low, "Battery",
            "Leave the relay on. When the battery is at 15% or less and not charging, the app relays less often " +
                "to save power.",
        )
        Rule(
            Palette.Stone, "Your data",
            "Reports the server has confirmed are deleted from this phone 72 hours later.",
        )

        if (firstRun) {
            Spacer(Modifier.height(4.dp))
            Button(
                onClick = onAcknowledge,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Signal, contentColor = Palette.Ink),
            ) { Text("I understand — continue", fontSize = 16.sp) }
        }
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun Rule(accent: Color, title: String, body: String) {
    Row(
        Modifier.fillMaxWidth().border(1.dp, Palette.Line, RoundedCornerShape(14.dp)).padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.padding(top = 7.dp).size(8.dp).background(accent, CircleShape))
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(body, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
