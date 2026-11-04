package app.matindesk.shell

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Toast
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
    private lateinit var progressBar: ProgressBar

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        refreshLayout = SwipeRefreshLayout(this)
        webView = WebView(this)
        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progress = 0
            visibility = View.GONE
            isIndeterminate = false
        }
        refreshLayout.addView(
            webView,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(progressBar, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                (3 * resources.displayMetrics.density).toInt().coerceAtLeast(2)
            ))
            addView(refreshLayout, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
            ))
        }
        setContentView(root)

        window.statusBarColor = 0xFF0D1512.toInt()

        webView.apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                mediaPlaybackRequiresUserGesture = true
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    safeBrowsingEnabled = true
                }
                javaScriptCanOpenWindowsAutomatically = false
                allowFileAccess = false
                allowContentAccess = false
                setSupportMultipleWindows(false)
            }
            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    progressBar.progress = 0
                    progressBar.visibility = View.VISIBLE
                }
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: android.webkit.WebResourceRequest?
                ): Boolean {
                    // stay inside the MatinDesk app; open external links in the browser
                    val url = request?.url ?: return false
                    val scheme = url.scheme?.lowercase()
                    if (scheme != "https" && scheme != "http") return true
                    val host = url.host ?: return true
                    val appHost = android.net.Uri.parse(BuildConfig.APP_URL).host ?: return true
                    val isAppHost = host.equals(appHost, ignoreCase = true) ||
                        host.endsWith(".${appHost}", ignoreCase = true)
                    if (isAppHost) return false
                    return try {
                        startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, url))
                        true
                    } catch (_: android.content.ActivityNotFoundException) {
                        Toast.makeText(this@MainActivity, "مرورگری برای باز کردن این پیوند پیدا نشد.", Toast.LENGTH_SHORT).show()
                        true
                    }
                }

                override fun onPageCommitVisible(view: WebView?, url: String?) {
                    // reveal the WebView on first paint for a cleaner launch
                    view?.visibility = View.VISIBLE
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    refreshLayout.isRefreshing = false
                    progressBar.visibility = View.GONE
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: android.webkit.WebResourceRequest?,
                    error: android.webkit.WebResourceError?
                ) {
                    if (request?.isForMainFrame == true) {
                        refreshLayout.isRefreshing = false
                        progressBar.visibility = View.GONE
                        webView.visibility = View.VISIBLE
                        Toast.makeText(
                            this@MainActivity,
                            "اتصال برقرار نشد؛ برای تلاش دوباره صفحه را پایین بکشید.",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    progressBar.progress = newProgress
                    progressBar.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
                }
            }
            // hide the raw WebView until first paint for a cleaner launch
            visibility = View.INVISIBLE
            if (savedInstanceState != null && restoreState(savedInstanceState) == null) {
                loadUrl(BuildConfig.APP_URL)
            } else if (savedInstanceState == null) {
                loadUrl(BuildConfig.APP_URL)
            }
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

    override fun onDestroy() {
        webView.stopLoading()
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.destroy()
        super.onDestroy()
    }
}
