package com.example.infoapp

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.view.View
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import org.json.JSONObject

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var geolocationCallback: GeolocationPermissions.Callback? = null
    private var geolocationOrigin: String? = null

    private val locationPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineLocationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseLocationGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        geolocationCallback?.invoke(
            geolocationOrigin,
            fineLocationGranted || coarseLocationGranted,
            false
        )
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make the app full screen with status bar visible
        window.statusBarColor = 0xFF1a73e8.toInt()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.setGeolocationEnabled(true)
            settings.allowFileAccess = true
            settings.mediaPlaybackRequiresUserGesture = false

            // Add JavaScript bridge for native device info
            addJavascriptInterface(DeviceBridge(), "AndroidBridge")

            webViewClient = WebViewClient()

            webChromeClient = object : WebChromeClient() {
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: GeolocationPermissions.Callback?
                ) {
                    geolocationOrigin = origin
                    geolocationCallback = callback

                    if (ContextCompat.checkSelfPermission(
                            this@MainActivity,
                            Manifest.permission.ACCESS_FINE_LOCATION
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        callback?.invoke(origin, true, false)
                    } else {
                        locationPermissionRequest.launch(
                            arrayOf(
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            )
                        )
                    }
                }
            }

            // Ensure proper scrolling behavior
            overScrollMode = View.OVER_SCROLL_NEVER

            loadUrl("file:///android_asset/www/index.html")
        }

        setContentView(webView)
    }

    @Deprecated("Use OnBackPressedDispatcher instead")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }

    /**
     * JavaScript bridge providing native device information to the WebView.
     * Accessible from JS via window.AndroidBridge
     */
    inner class DeviceBridge {
        @JavascriptInterface
        fun getDeviceInfo(): String {
            val info = JSONObject()
            info.put("platform", "Android")
            info.put("version", Build.VERSION.RELEASE)
            info.put("manufacturer", Build.MANUFACTURER)
            info.put("model", Build.MODEL)
            info.put("sdkVersion", Build.VERSION.SDK_INT.toString())
            info.put("brand", Build.BRAND)
            info.put("product", Build.PRODUCT)
            info.put("hardware", Build.HARDWARE)
            info.put("isVirtual",
                Build.FINGERPRINT.contains("generic") ||
                Build.FINGERPRINT.contains("emulator") ||
                Build.MODEL.contains("Emulator") ||
                Build.MODEL.contains("Android SDK")
            )
            return info.toString()
        }
    }
}
