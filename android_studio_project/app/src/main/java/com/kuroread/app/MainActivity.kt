package com.kuroread.app

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import com.kuroread.app.data.WebNovelScraper

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    inner class AndroidScraperBridge {
        @JavascriptInterface
        fun fetchChapterJson(url: String, chapterNum: Int): String {
            return WebNovelScraper.fetchChapterJson(url, chapterNum)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.parseColor("#161616")
        window.navigationBarColor = Color.parseColor("#111112")

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#161616"))
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                allowFileAccessFromFileURLs = true
                allowUniversalAccessFromFileURLs = true
                cacheMode = WebSettings.LOAD_DEFAULT
            }
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            addJavascriptInterface(AndroidScraperBridge(), "AndroidScraper")
            loadUrl("file:///android_asset/index.html")
        }

        setContentView(webView)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (this::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
