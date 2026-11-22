import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

// Release signing comes from environment variables in CI (see .github/workflows/android.yml).
// Without them the release build is signed with the debug key so it still installs.
val keystorePath: String? = System.getenv("VOLENTIFY_KEYSTORE")
val defaultServer: String = System.getenv("VOLENTIFY_SERVER_URL")?.takeIf { it.isNotBlank() } ?: "https://volentify.vercel.app"
val versionCodeEnv: Int = (System.getenv("VERSION_CODE") ?: "1").toInt()

android {
    namespace = "org.volentify.mesh"
    compileSdk = 34

    defaultConfig {
        applicationId = "org.volentify.mesh"
        minSdk = 26
        targetSdk = 34
        versionCode = versionCodeEnv
        versionName = "1.0.$versionCodeEnv"
        buildConfigField("String", "DEFAULT_SERVER_URL", "\"$defaultServer\"")
    }

    signingConfigs {
        if (keystorePath != null) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("VOLENTIFY_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("VOLENTIFY_KEY_ALIAS")
                keyPassword = System.getenv("VOLENTIFY_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            // Shrinking off for the pilot: avoids R8 stripping reflection-loaded classes (Room, WorkManager).
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (keystorePath != null) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    testOptions { unitTests.isReturnDefaultValues = true }
    lint {
        // BLE calls are guarded by runtime permission checks in MeshPermissions; keep release builds unblocked.
        checkReleaseBuilds = false
        abortOnError = false
    }
}


dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.09.03")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("androidx.lifecycle:lifecycle-service:2.8.6")
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    debugImplementation("androidx.compose.ui:ui-tooling")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
