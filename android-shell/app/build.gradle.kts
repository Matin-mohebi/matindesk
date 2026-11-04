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
        versionCode = 2
        versionName = "1.0.1"
        buildConfigField("String", "APP_URL", "\"$appUrl\"")
    }

    // امضای نسخه انتشار — در CI از GitHub Secrets خوانده می‌شود (اختیاری)
    val ksB64 = System.getenv("KEYSTORE_BASE64")
    val ksPassword = System.getenv("KEYSTORE_PASSWORD")
    val keyAliasValue = System.getenv("KEY_ALIAS")
    val keyPasswordValue = System.getenv("KEY_PASSWORD")
    val releaseSigningConfigured = !ksB64.isNullOrBlank() &&
        !ksPassword.isNullOrBlank() && !keyAliasValue.isNullOrBlank() && !keyPasswordValue.isNullOrBlank()

    if (releaseSigningConfigured) {
        signingConfigs {
            create("release") {
                val tmp = File.createTempFile("matindesk", ".jks")
                tmp.writeBytes(Base64.getDecoder().decode(requireNotNull(ksB64)))
                storeFile = tmp
                storePassword = ksPassword
                keyAlias = keyAliasValue
                keyPassword = keyPasswordValue
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (releaseSigningConfigured) signingConfigs.getByName("release") else null
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
