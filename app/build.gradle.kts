plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.example.infoapp"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.example.infoapp"
        minSdk = 24
        targetSdk = 34
        versionCode = 2
        versionName = "2.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = false
        aidl = false
        buildConfig = false
        shaders = false
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    // Core Android dependencies only - WebView is built into Android
    implementation(libs.androidx.core.ktx)
    // Use activity-ktx only (not activity-compose) to avoid pulling in Compose/navigation transitives
    implementation("androidx.activity:activity-ktx:1.13.0")
}
