import java.util.Base64

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// آدرس سرور ماتیندسک — هنگام ساخت با ‎-PappUrl=https://your-server.com‎ قابل تغییر است
val appUrl: String = (project.findProperty("appUrl") as String?)
    ?: "https://matindesk.onrender.com"

android {
    namespace = "app.matindesk.shell"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.matindesk.shell"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "APP_URL", "\"$appUrl\"")
    }

    // امضای نسخه انتشار — در CI از GitHub Secrets خوانده می‌شود (اختیاری)
    signingConfigs {
        create("release") {
            val ksB64 = System.getenv("KEYSTORE_BASE64")
            if (!ksB64.isNullOrBlank()) {
                val tmp = File.createTempFile("matindesk", ".jks")
                tmp.writeBytes(Base64.getDecoder().decode(ksB64))
                storeFile = tmp
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KEY_ALIAS")
                keyPassword = System.getenv("KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            val ks = System.getenv("KEYSTORE_BASE64")
            signingConfig = if (!ks.isNullOrBlank()) signingConfigs.getByName("release") else null
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
}
