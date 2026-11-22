package org.volentify.mesh.ui

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import org.volentify.mesh.data.EventType
import org.volentify.mesh.data.PiiGuard
import org.volentify.mesh.data.Priority
import org.volentify.mesh.data.Rules
import org.volentify.mesh.location.Fix
import org.volentify.mesh.location.LocationProvider
import org.volentify.mesh.location.LocationStatus
import org.volentify.mesh.ui.theme.Palette

private val PEOPLE_TYPES = setOf(EventType.PERSON_TRAPPED, EventType.PERSON_MISSING, EventType.PERSON_RESCUED, EventType.MEDICAL_EMERGENCY)
private const val ACQUIRE_TIMEOUT_MS = 25_000L
private const val SAVE_WAIT_MS = 8_000L

/**
 * @param onRequestLocation asks Android for location permission (or opens app settings when it was denied for good).
 * @param permissionVersion changes whenever a permission request returns, so the location row re-checks.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ReportScreen(vm: MeshViewModel, onClose: () -> Unit, onRequestLocation: () -> Unit, permissionVersion: Int) {
    var type by remember { mutableStateOf(EventType.PERSON_TRAPPED) }
    var priority by remember { mutableStateOf(Priority.HIGH) }
    var count by remember { mutableStateOf("") }
    var needs by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    val incidents = remember { vm.incidents() }
    var incident by remember { mutableStateOf(incidents.firstOrNull()?.id) }
    var saving by remember { mutableStateOf(false) }
    var waitingForGps by remember { mutableStateOf(false) }
    /** Why the last save was refused (duplicate SOS or hourly cap); the form stays filled in. */
    var refusal by remember { mutableStateOf<String?>(null) }
    val needsPii = remember(needs) { PiiGuard.scan(needs) }
    val notesPii = remember(notes) { PiiGuard.scan(notes) }

    // ─── Location: start as soon as the screen opens so the fix is ready by the time the form is filled ───
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var locStatus by remember { mutableStateOf(LocationProvider.status(context)) }
    var fix by remember { mutableStateOf(LocationProvider.lastKnown(context)) }
    var acquiring by remember { mutableStateOf(false) }
    var attempt by remember { mutableStateOf(0) }

    LaunchedEffect(attempt, permissionVersion) {
        locStatus = LocationProvider.status(context)
        if (locStatus != LocationStatus.Ready) {
            acquiring = false
            return@LaunchedEffect
        }
        acquiring = true
        val result = LocationProvider.current(context, ACQUIRE_TIMEOUT_MS) { progress -> fix = progress }
        if (result != null) fix = result
        // Deliberately not in a finally: a cancelled run has already been replaced by a newer one (key change), and
        // its late cleanup would otherwise clear the flag while the new run is still acquiring.
        acquiring = false
    }

    // Coming back from the permission dialog or the location settings screen: look again.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        var first = true
        val observer = LifecycleEventObserver { _, event ->
            if (event != Lifecycle.Event.ON_RESUME) return@LifecycleEventObserver
            if (first) { first = false; return@LifecycleEventObserver } // replayed when the observer is added
            val now = LocationProvider.status(context)
            if (now != locStatus || (fix == null && !acquiring)) attempt += 1
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row {
            Text("New field report", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.weight(1f))
            TextButton(onClick = onClose) { Text("Cancel", color = Palette.Sand) }
        }
        Text("Saved on this phone first. Works with no signal.", style = MaterialTheme.typography.bodySmall)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "In danger now? The mesh can take minutes to hours to reach responders.",
                style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f),
            )
            TextButton(onClick = { dial(context, "112") }) { Text("Call 112", color = Palette.Critical) }
        }

        LocationRow(
            status = locStatus, fix = fix, acquiring = acquiring, masked = vm.settings.maskLocation,
            onAllow = onRequestLocation,
            onTurnOn = {
                try {
                    context.startActivity(Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS))
                } catch (_: ActivityNotFoundException) {
                }
            },
            onRetry = { attempt += 1 },
        )

        Label("What is happening")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            EventType.entries.forEach { t ->
                Chip(t.label, t == type, Palette.Signal) {
                    type = t
                    priority = Rules.capPriority(t, priority)
                }
            }
        }

        Label("Priority")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Rules.allowedPriorities(type).reversed().forEach { p ->
                Chip(p.name.lowercase().replaceFirstChar { it.uppercase() }, p == priority, priorityColor(p)) { priority = p }
            }
        }
        if (type !in Rules.CRITICAL_TYPES) {
            Text(
                "Critical is kept for people trapped or missing, medical emergencies, fire and flooding.",
                style = MaterialTheme.typography.bodySmall,
            )
        }

        if (type in PEOPLE_TYPES) {
            Field("Number of people", count, KeyboardType.Number) { v -> count = v.filter { it.isDigit() }.take(4) }
        }
        Field("Needs (boats, insulin, water…)", needs, hint = piiHint(needsPii), warn = needsPii.isNotEmpty()) { needs = it.take(200) }
        Field(
            "Notes", notes, minLines = 3, warn = notesPii.isNotEmpty(),
            hint = piiHint(notesPii) ?: "Only what you see yourself. No ID, bank or phone numbers, or other people's full names.",
        ) { notes = it.take(1000) }

        if (incidents.isNotEmpty()) {
            Label("Incident")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip("Not sure", incident == null, Palette.Sand) { incident = null }
                incidents.forEach { i -> Chip(i.title, incident == i.id, Palette.Gold) { incident = i.id } }
            }
        }

        refusal?.let { Text(it, color = Palette.High, fontSize = 14.sp) }
        Button(
            onClick = {
                saving = true
                refusal = null
                val details = buildMap<String, Any> {
                    count.toIntOrNull()?.let { put("count", it) }
                    if (needs.isNotBlank()) put("needs", needs.split(',').map { it.trim() }.filter { it.isNotEmpty() })
                    if (notes.isNotBlank()) put("notes", notes.trim())
                }
                scope.launch {
                    if (fix == null && acquiring) {
                        // Give the GPS a few more seconds, then save without it rather than keep the user waiting.
                        waitingForGps = true
                        withTimeoutOrNull(SAVE_WAIT_MS) { snapshotFlow { fix != null || !acquiring }.first { it } }
                        waitingForGps = false
                    }
                    val finalFix = fix ?: LocationProvider.lastKnown(context)
                    vm.createReport(
                        type, priority, details, incident, finalFix,
                        onRefused = { reason ->
                            refusal = reason
                            saving = false
                        },
                    ) { onClose() }
                }
            },
            enabled = !saving,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(50),
            colors = ButtonDefaults.buttonColors(containerColor = Palette.Signal, contentColor = Palette.Ink),
        ) { Text(if (waitingForGps) "Waiting for GPS…" else if (saving) "Saving…" else "Save report", fontSize = 16.sp) }
    }
}

@Composable
private fun LocationRow(
    status: LocationStatus, fix: Fix?, acquiring: Boolean, masked: Boolean,
    onAllow: () -> Unit, onTurnOn: () -> Unit, onRetry: () -> Unit,
) {
    val (dot, title, detail, action) = when {
        status == LocationStatus.NoPermission -> LocationUi(Palette.High, "Location permission needed",
            "Reports save without GPS until you allow it", "Allow" to onAllow)
        status == LocationStatus.ServicesOff -> LocationUi(Palette.High, "Location is off",
            "Turn on location so responders can find this report", "Turn on" to onTurnOn)
        fix != null -> LocationUi(Palette.Low,
            fix.accuracyRounded?.let { "Location ±$it m" } ?: "Location found",
            buildString {
                append(if (acquiring) "Improving accuracy…" else "Attached to this report")
                if (masked) append(" · shifted up to 500 m (Settings)")
            }, null)
        acquiring -> LocationUi(Palette.Moderate, "Getting your location…",
            "Works best outdoors or near a window", null)
        else -> LocationUi(Palette.Stone, "No fix yet",
            "The report can still be saved without GPS", "Retry" to onRetry)
    }
    Row(
        Modifier.fillMaxWidth().border(1.dp, Palette.Line, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.size(8.dp).background(dot, CircleShape))
        Column(Modifier.weight(1f)) {
            Text(title, color = Palette.Ivory, fontSize = 14.sp)
            Text(detail, style = MaterialTheme.typography.bodySmall)
        }
        action?.let { (label, onClick) -> TextButton(onClick = onClick) { Text(label, color = Palette.Signal) } }
    }
}

private data class LocationUi(val dot: Color, val title: String, val detail: String, val action: Pair<String, () -> Unit>?)

@Composable
private fun Label(text: String) = Text(text, style = MaterialTheme.typography.titleMedium)

@Composable
private fun Chip(text: String, selected: Boolean, color: Color, onClick: () -> Unit) {
    Text(
        text,
        color = if (selected) Palette.Ivory else Palette.Sand,
        fontSize = 13.sp,
        modifier = Modifier
            .border(1.dp, if (selected) color else Palette.Line, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    )
}

/** Live warning while typing; the numbers themselves are removed when the report is saved. */
private fun piiHint(found: Set<PiiGuard.Kind>): String? =
    if (found.isEmpty()) null
    else PiiGuard.describe(found).replaceFirstChar { it.uppercase() } + " found — it will be removed when you save"

@Composable
private fun Field(
    label: String, value: String, keyboard: KeyboardType = KeyboardType.Text, minLines: Int = 1,
    hint: String? = null, warn: Boolean = false, onChange: (String) -> Unit,
) {
    OutlinedTextField(
        value = value, onValueChange = onChange, label = { Text(label) }, minLines = minLines,
        supportingText = if (hint != null) {
            @Composable { Text(hint, color = if (warn) Palette.High else Palette.Stone) }
        } else null,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
        modifier = Modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Palette.Signal, unfocusedBorderColor = Palette.Line,
            focusedTextColor = Palette.Ivory, unfocusedTextColor = Palette.Ivory, cursorColor = Palette.Signal,
            focusedLabelColor = Palette.Signal, unfocusedLabelColor = Palette.Stone,
        ),
    )
}
