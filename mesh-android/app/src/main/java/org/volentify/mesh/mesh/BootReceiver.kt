package org.volentify.mesh.mesh

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.volentify.mesh.data.Settings

/** Resume relaying after a reboot if the volunteer left the mesh switched on. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED && Settings(context).meshEnabled &&
            MeshPermissions.bluetoothGranted(context)
        ) {
            BleMeshService.start(context)
        }
    }
}
