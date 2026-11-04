package app.matindesk.shell

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

/**
 * MatinDesk Android shell — a lightweight native wrapper around the MatinDesk web app.
 *
 * The full application (registration, tasks, notes, finance, accurate statistics,
 * GitHub backup, themes and 3 languages) runs on the MatinDesk server; this shell
 * renders it in a fast WebView with pull-to-refresh and offline service-worker
 * support provided by the app itself (PWA).
 *
 * The server URL is injected at build time:
 *   gradle assembleDebug -PappUrl=https://your-matindesk-server.example.com
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var refreshLayout: SwipeRefreshLayout

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        refreshLayout = SwipeRefreshLayout(this)
        webView = WebView(this)
        refreshLayout.addView(
            webView,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        setContentView(refreshLayout)

        window.statusBarColor = 0xFF0D1512.toInt()

        webView.apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                mediaPlaybackRequiresUserGesture = false
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            }
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: android.webkit.WebResourceRequest?
                ): Boolean {
                    // stay inside the MatinDesk app; open external links in the browser
                    val url = request?.url ?: return false
                    val host = url.host ?: return false
                    val appHost = android.net.Uri.parse(BuildConfig.APP_URL).host
                    return if (host == appHost || host.endsWith(".${appHost}")) {
                        false
                    } else {
                        startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, url))
                        true
                    }
                }

                override fun onPageCommitVisible(view: WebView?, url: String?) {
                    // reveal the WebView on first paint for a cleaner launch
                    view?.visibility = View.VISIBLE
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    refreshLayout.isRefreshing = false
                }
            }
            webChromeClient = WebChromeClient()
            // hide the raw WebView until first paint for a cleaner launch
            visibility = View.INVISIBLE
            loadUrl(BuildConfig.APP_URL)
        }

        // pull-to-refresh
        refreshLayout.setOnRefreshListener { webView.reload() }

        // back button navigates inside the app first
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }
}
