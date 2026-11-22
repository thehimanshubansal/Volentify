package org.volentify.mesh.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import org.volentify.mesh.R

/** Mirrors the web design system: ink surfaces, ivory type, safety-orange signal, Instrument Serif display. */
object Palette {
    val Ink = Color(0xFF07080A)
    val Ink900 = Color(0xFF0C0D10)
    val Ink800 = Color(0xFF121418)
    val Ink700 = Color(0xFF1B1E23)
    val Ivory = Color(0xFFF4F1EA)
    val Sand = Color(0xFFC9C4B8)
    val Stone = Color(0xFF8D887E)
    val Signal = Color(0xFFFF6B00)
    val Gold = Color(0xFFD4B483)
    val Critical = Color(0xFFFF5A4E)
    val High = Color(0xFFFF9A3C)
    val Moderate = Color(0xFFE9C46A)
    val Low = Color(0xFF7FB69A)
    val Info = Color(0xFF8FB3D9)
    val Line = Color(0x14F4F1EA)
}

val InstrumentSerif = FontFamily(Font(R.font.instrument_serif))

private val typography = Typography(
    displaySmall = TextStyle(fontFamily = InstrumentSerif, fontSize = 40.sp, lineHeight = 42.sp, color = Palette.Ivory),
    headlineMedium = TextStyle(fontFamily = InstrumentSerif, fontSize = 30.sp, lineHeight = 34.sp, color = Palette.Ivory),
    headlineSmall = TextStyle(fontFamily = InstrumentSerif, fontSize = 24.sp, lineHeight = 28.sp, color = Palette.Ivory),
    titleMedium = TextStyle(fontSize = 16.sp, lineHeight = 22.sp, color = Palette.Ivory),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Palette.Sand),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Palette.Stone),
    labelLarge = TextStyle(fontSize = 14.sp, lineHeight = 18.sp),
)

@Composable
fun VolentifyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Palette.Signal, onPrimary = Palette.Ink, secondary = Palette.Gold,
            background = Palette.Ink, onBackground = Palette.Ivory, surface = Palette.Ink900, onSurface = Palette.Ivory,
            surfaceVariant = Palette.Ink800, onSurfaceVariant = Palette.Sand, outline = Palette.Line, error = Palette.Critical,
        ),
        typography = typography,
        content = content,
    )
}
