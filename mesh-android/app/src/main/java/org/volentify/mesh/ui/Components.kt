package org.volentify.mesh.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONObject
import org.volentify.mesh.data.DeliveryStatus
import org.volentify.mesh.data.Envelope
import org.volentify.mesh.data.EventType
import org.volentify.mesh.data.MeshEvent
import org.volentify.mesh.data.Priority
import org.volentify.mesh.data.Rules
import org.volentify.mesh.ui.theme.Palette

fun priorityColor(p: Priority): Color = when (p) {
    Priority.CRITICAL -> Palette.Critical
    Priority.HIGH -> Palette.High
    Priority.MEDIUM -> Palette.Moderate
    Priority.LOW -> Palette.Low
}

fun statusColor(s: DeliveryStatus): Color = when (s) {
    DeliveryStatus.QUEUED -> Palette.Moderate
    DeliveryStatus.RELAYED -> Palette.Info
    DeliveryStatus.SYNCING -> Palette.Signal
    DeliveryStatus.SERVER_CONFIRMED -> Palette.Low
    DeliveryStatus.FAILED -> Palette.Critical
}

/** Trust label for a list item. "Official" only for server-downlinked, server-confirmed, server-flagged events. */
fun provenanceOf(e: MeshEvent, payload: JSONObject?): Rules.Provenance = Rules.provenance(
    fromServer = e.fromServer,
    confirmed = e.status == DeliveryStatus.SERVER_CONFIRMED,
    officialFlag = Envelope.truthy(payload?.opt(Envelope.KEY_OFFICIAL)),
    relayClaim = Envelope.truthy(payload?.opt(Envelope.KEY_RELAY_CLAIM)),
    isMessage = e.type == EventType.DISASTER_STATUS && payload?.has("message") == true,
)

fun provenanceColor(p: Rules.Provenance): Color = when (p) {
    Rules.Provenance.OFFICIAL -> Palette.Signal
    Rules.Provenance.UNVERIFIED_RELAY -> Palette.High
    else -> Palette.Stone
}

@Composable
fun Pill(text: String, color: Color, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .border(1.dp, color.copy(alpha = 0.4f), RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.size(6.dp).background(color, CircleShape))
        Text(text, color = color, fontSize = 12.sp)
    }
}

/** Opens the dialler with 112 filled in (no call permission needed; the person still taps call). */
@Composable
fun Call112Button(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    Button(
        onClick = { dial(context, "112") },
        modifier = modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(50),
        colors = ButtonDefaults.buttonColors(containerColor = Palette.Critical, contentColor = Palette.Ink),
    ) {
        Icon(Icons.Outlined.Call, contentDescription = null)
        Spacer(Modifier.width(8.dp))
        Text("Call 112", fontSize = 16.sp)
    }
}

fun dial(context: Context, number: String) {
    try {
        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number")))
    } catch (_: ActivityNotFoundException) {
        // Tablets without telephony: nothing to open.
    }
}
