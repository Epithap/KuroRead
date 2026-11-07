package com.kuroread.app.data

import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import org.jsoup.Jsoup
import java.net.HttpURLConnection
import java.net.URL

/**
 * Native Kotlin Multi-Source Indonesian Light Novel Scraper (Mihon-style Live Source Engine)
 * Primary Source: SakuraNovel (https://sakuranovel.id/wp-json/wp/v2/)
 * Secondary Sources: NovelRingan (novelringan.com) & Meionovel (meionovels.com)
 */
object WebNovelScraper {
    private const val USER_AGENT =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"

    /**
     * Fetches live latest series & chapter updates directly from SakuraNovel WP REST API
     */
    fun fetchSakuraLiveUpdatesJson(): String {
        return try {
            val url = URL("https://sakuranovel.id/wp-json/wp/v2/seri?per_page=40&orderby=id&order=desc")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("User-Agent", USER_AGENT)
                connectTimeout = 10000
                readTimeout = 10000
            }
            conn.inputStream.bufferedReader().use { it.readText() }
        } catch (e: Exception) {
            "[]"
        }
    }

    /**
     * Fetches any chapter of any SakuraNovel series by seriId and 1-based chapterNum
     */
    fun fetchSakuraChapterByOffsetJson(seriId: Int, chapterNum: Int): String {
        return try {
            val offset = (chapterNum - 1).coerceAtLeast(0)
            val apiUrl =
                "https://sakuranovel.id/wp-json/wp/v2/posts?seri=$seriId&per_page=1&offset=$offset&order=asc&_fields=id,title,content,date"
            val conn = (URL(apiUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("User-Agent", USER_AGENT)
                connectTimeout = 12000
                readTimeout = 12000
            }
            val raw = conn.inputStream.bufferedReader().use { it.readText() }
            val arr = JSONArray(raw)
            if (arr.length() == 0) return JSONObject().put("ok", false).toString()

            val post = arr.getJSONObject(0)
            val titleHtml = post.optJSONObject("title")?.optString("rendered") ?: "Chapter $chapterNum"
            val contentHtml = post.optJSONObject("content")?.optString("rendered") ?: ""

            val doc = Jsoup.parseBodyFragment(contentHtml)
            val paras = JSONArray()
            doc.select("p").forEach { p ->
                val text = p.text().trim()
                if (text.isNotEmpty()) paras.put(text)
            }

            JSONObject().apply {
                put("ok", paras.length() > 0)
                put("num", chapterNum)
                put("title", Jsoup.parse(titleHtml).text().replace(Regex("Bahasa Indonesia", RegexOption.IGNORE_CASE), "").trim())
                put("paragraphs", paras)
            }.toString()
        } catch (e: Exception) {
            JSONObject().apply {
                put("ok", false)
                put("error", e.message ?: "SakuraNovel scrape error")
            }.toString()
        }
    }

    fun fetchChapterJson(chapterUrl: String, chapterNum: Int): String {
        return try {
            val doc = Jsoup.connect(chapterUrl)
                .userAgent(USER_AGENT)
                .timeout(12000)
                .get()

            val isMeio = chapterUrl.contains("meionovels.com")
            val title = if (isMeio) {
                doc.selectFirst("ol.breadcrumb li.active")?.text()?.trim()
                    ?: doc.title()
            } else {
                doc.selectFirst("h1.entry-title")?.text()
                    ?.replace(Regex("Bahasa Indonesia", RegexOption.IGNORE_CASE), "")
                    ?.trim() ?: "Chapter $chapterNum"
            }

            val contentRoot = if (isMeio) {
                doc.selectFirst("div.text-left") ?: doc.selectFirst("div.reading-content")
            } else {
                doc.selectFirst("#nr-nv-content") ?: doc.selectFirst("div.entry-content")
            }

            contentRoot?.select("script, style, div.nrln, center")?.remove()

            val paras = JSONArray()
            contentRoot?.select("p")?.forEach { p ->
                val text = p.text().trim()
                if (text.isNotEmpty()) {
                    paras.put(text)
                }
            }

            JSONObject().apply {
                put("ok", paras.length() > 0)
                put("num", chapterNum)
                put("title", title)
                put("paragraphs", paras)
            }.toString()
        } catch (e: Exception) {
            JSONObject().apply {
                put("ok", false)
                put("error", e.message ?: "Scrape error")
            }.toString()
        }
    }
}
