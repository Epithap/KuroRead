package com.kuroread.app.model

data class Novel(
    val id: String,
    val title: String,
    val author: String,
    val rating: Double,
    val totalChapters: Int,
    val status: NovelStatus,
    val rankLabel: String? = null,
    val genres: List<String>,
    val synopsis: String,
    val coverPlaceholderColor: Long
)

enum class NovelStatus(val label: String) {
    COMPLETED("Tamat"),
    ONGOING("Berjalan"),
    HIATUS("Hiatus")
}

val sampleWeeklyNovels = listOf(
    Novel(
        id = "tbate",
        title = "The Beginning After The End",
        author = "TurtleMe",
        rating = 4.8,
        totalChapters = 529,
        status = NovelStatus.COMPLETED,
        rankLabel = "#1 Pekan Ini",
        genres = listOf("Fantasy", "Action"),
        synopsis = "Raja Grey memiliki kekuatan dan prestise tak tertandingi di dunia bela diri. Terlahir kembali ke dunia baru penuh sihir, ia berjuang melindungi mereka yang ia sayangi.",
        coverPlaceholderColor = 0xFF2D1418
    ),
    Novel(
        id = "lotm",
        title = "Lord of the Mysteries",
        author = "Cuttlefish That Loves Diving",
        rating = 4.9,
        totalChapters = 1432,
        status = NovelStatus.COMPLETED,
        rankLabel = "#2 Pekan Ini",
        genres = listOf("Mystery", "Steampunk"),
        synopsis = "Di tengah era uap dan mesin, Klein Moretti menjelajahi rahasia kuno, urutan ramuan okultisme, dan dewa tersembunyi.",
        coverPlaceholderColor = 0xFF121F2D
    ),
    Novel(
        id = "ri",
        title = "Reverend Insanity",
        author = "Gu Zhen Ren",
        rating = 4.8,
        totalChapters = 2334,
        status = NovelStatus.HIATUS,
        rankLabel = "#3 Pekan Ini",
        genres = listOf("Cultivation", "Dark Fantasy"),
        synopsis = "Fang Yuan terlahir kembali 500 tahun ke masa lalu. Berjalan di jalur tanpa belas kasihan menuju puncak keabadian.",
        coverPlaceholderColor = 0xFF242216
    ),
    Novel(
        id = "orv",
        title = "Omniscient Reader's Viewpoint",
        author = "sing N song",
        rating = 4.9,
        totalChapters = 551,
        status = NovelStatus.COMPLETED,
        rankLabel = "#4 Pekan Ini",
        genres = listOf("Fantasy", "Apocalyptic"),
        synopsis = "Kim Dokja adalah satu-satunya pembaca novel web yang bertahan hingga akhir, tepat ketika novel tersebut menjadi kenyataan.",
        coverPlaceholderColor = 0xFF1D1D28
    )
)
