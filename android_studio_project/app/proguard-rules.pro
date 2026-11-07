# Keep JavaScript bridge interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
