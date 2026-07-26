package com.example.infoapp

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Bundle
import android.telephony.TelephonyManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.view.View
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

        window.statusBarColor = 0xFF1a73e8.toInt()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.setGeolocationEnabled(true)
            settings.allowFileAccess = true
            settings.mediaPlaybackRequiresUserGesture = false

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
     * JavaScript bridge providing native device and network information to the WebView.
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

        @JavascriptInterface
        fun getNetworkInfo(): String {
            val result = JSONObject()
            try {
                val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                val activeNetwork = cm.activeNetwork
                if (activeNetwork == null) {
                    result.put("isOnline", false)
                    result.put("connectionType", "Няма връзка")
                    result.put("technology", "Няма")
                    return result.toString()
                }

                val caps = cm.getNetworkCapabilities(activeNetwork)
                if (caps == null || !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
                    result.put("isOnline", false)
                    result.put("connectionType", "Няма връзка")
                    result.put("technology", "Няма")
                    return result.toString()
                }

                result.put("isOnline", true)

                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                    result.put("connectionType", "WiFi")
                    result.put("technology", "WiFi")
                } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
                    result.put("connectionType", "Мобилна мрежа")
                    
                    val tm = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                    val networkType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        try { tm.dataNetworkType } catch (e: Exception) { tm.networkType }
                    } else {
                        @Suppress("DEPRECATION")
                        tm.networkType
                    }

                    val tech = when (networkType) {
                        TelephonyManager.NETWORK_TYPE_NR -> "5G"
                        TelephonyManager.NETWORK_TYPE_LTE -> "4G (LTE)"
                        TelephonyManager.NETWORK_TYPE_UMTS,
                        TelephonyManager.NETWORK_TYPE_EVDO_0,
                        TelephonyManager.NETWORK_TYPE_EVDO_A,
                        TelephonyManager.NETWORK_TYPE_HSDPA,
                        TelephonyManager.NETWORK_TYPE_HSUPA,
                        TelephonyManager.NETWORK_TYPE_HSPA,
                        TelephonyManager.NETWORK_TYPE_EVDO_B,
                        TelephonyManager.NETWORK_TYPE_EHRPD,
                        TelephonyManager.NETWORK_TYPE_HSPAP -> "3G"
                        TelephonyManager.NETWORK_TYPE_GPRS,
                        TelephonyManager.NETWORK_TYPE_EDGE,
                        TelephonyManager.NETWORK_TYPE_CDMA,
                        TelephonyManager.NETWORK_TYPE_1xRTT,
                        TelephonyManager.NETWORK_TYPE_IDEN -> "2G"
                        else -> "5G / 4G"
                    }
                    result.put("technology", tech)
                } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                    result.put("connectionType", "Ethernet")
                    result.put("technology", "Кабелна")
                } else {
                    result.put("connectionType", "Друга")
                    result.put("technology", "Неизвестна")
                }
            } catch (e: Exception) {
                result.put("isOnline", true)
                result.put("connectionType", "Мобилна / WiFi")
                result.put("technology", "Неизвестна")
            }
            return result.toString()
        }
    }
}
