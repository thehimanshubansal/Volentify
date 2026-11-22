package org.volentify.mesh

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.volentify.mesh.mesh.BleMeshService
import org.volentify.mesh.mesh.MeshPermissions
import org.volentify.mesh.sync.GatewaySync
import org.volentify.mesh.ui.HomeScreen
import org.volentify.mesh.ui.MeshViewModel
import org.volentify.mesh.ui.MessagesScreen
import org.volentify.mesh.ui.ReportScreen
import org.volentify.mesh.ui.SafetyScreen
import org.volentify.mesh.ui.SettingsScreen
import org.volentify.mesh.ui.theme.Palette
import org.volentify.mesh.ui.theme.VolentifyTheme

enum class Screen { Home, Report, Messages, Settings, Safety }

class MainActivity : ComponentActivity() {
    private val vm: MeshViewModel by viewModels()

    /** Set once location has been requested in this process, to tell "never asked" from "denied for good". */
    private var locationAsked = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // While the app is on screen, check the server downlink about once a minute (the uploader spaces fetches).
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (true) {
                    GatewaySync.uploadNow(this@MainActivity)
                    delay(DOWNLINK_POLL_MS)
                }
            }
        }
        setContent {
            VolentifyTheme {
                // First run: the safety screen comes first and must be acknowledged once.
                var acknowledged by remember { mutableStateOf(vm.settings.safetyAcknowledged) }
                var screen by remember { mutableStateOf(if (acknowledged) Screen.Home else Screen.Safety) }
                var permissionsAsked by remember { mutableStateOf(false) }
                var permissionVersion by remember { mutableStateOf(0) }
                val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
                    if (vm.settings.meshEnabled && MeshPermissions.bluetoothGranted(this)) BleMeshService.start(this)
                    permissionVersion += 1
                }
                val requestLocation: () -> Unit = {
                    if (MeshPermissions.locationGranted(this)) {
                        permissionVersion += 1
                    } else if (locationAsked && !shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION)) {
                        // Denied with "don't ask again": Android won't show the dialog, so open this app's settings.
                        openAppSettings()
                    } else {
                        locationAsked = true
                        launcher.launch(MeshPermissions.location())
                    }
                }
                LaunchedEffect(acknowledged) {
                    // Bluetooth and location are asked for (and the relay started) only after the safety screen.
                    if (!acknowledged) return@LaunchedEffect
                    val bluetooth = MeshPermissions.bluetoothGranted(this@MainActivity)
                    if (bluetooth && vm.settings.meshEnabled) BleMeshService.start(this@MainActivity)
                    if (!permissionsAsked) {
                        permissionsAsked = true
                        when {
                            !bluetooth -> {
                                locationAsked = true
                                launcher.launch(MeshPermissions.required())
                            }
                            // Bluetooth was granted earlier but location never was (older builds asked for FINE
                            // alone, which Android 12+ ignores): ask for location on its own.
                            !MeshPermissions.locationGranted(this@MainActivity) -> {
                                locationAsked = true
                                launcher.launch(MeshPermissions.location())
                            }
                        }
                    }
                }
                // Unacknowledged, Back leaves the app (system default) rather than skipping the safety screen.
                BackHandler(enabled = acknowledged && screen != Screen.Home) {
                    screen = if (screen == Screen.Safety) Screen.Settings else Screen.Home
                }
                Surface(color = Palette.Ink, modifier = Modifier.fillMaxSize()) {
                    Box(Modifier.safeDrawingPadding()) {
                        when (screen) {
                            Screen.Home -> HomeScreen(
                                vm = vm,
                                onNewReport = { screen = Screen.Report },
                                onMessages = { screen = Screen.Messages },
                                onSettings = { screen = Screen.Settings },
                                onGrantPermissions = { launcher.launch(MeshPermissions.required()) },
                            )
                            Screen.Report -> ReportScreen(
                                vm = vm,
                                onClose = { screen = Screen.Home },
                                onRequestLocation = requestLocation,
                                permissionVersion = permissionVersion,
                            )
                            Screen.Messages -> MessagesScreen(vm = vm, onClose = { screen = Screen.Home })
                            Screen.Settings -> SettingsScreen(
                                vm = vm,
                                onClose = { screen = Screen.Home },
                                onSafety = { screen = Screen.Safety },
                            )
                            Screen.Safety -> SafetyScreen(
                                firstRun = !acknowledged,
                                onAcknowledge = {
                                    vm.settings.safetyAcknowledged = true
                                    acknowledged = true
                                    screen = Screen.Home
                                },
                                onClose = { screen = Screen.Settings },
                            )
                        }
                    }
                }
            }
        }
    }

    private companion object {
        /** A little over the uploader's one-minute downlink spacing, so each poll actually fetches. */
        const val DOWNLINK_POLL_MS = 61_000L
    }

    private fun openAppSettings() {
        try {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null)))
        } catch (_: ActivityNotFoundException) {
        }
    }
}
