package com.kuroread.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kuroread.app.model.Novel
import com.kuroread.app.ui.theme.*

@Composable
fun ReaderScreen(
    novel: Novel,
    initialChapter: Int = 1,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var chapterNum by remember { mutableIntStateOf(initialChapter) }
    var fontSizeSp by remember { mutableFloatStateOf(15f) }
    var useSerif by remember { mutableStateOf(true) }
    var immersiveMode by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(BgScreen)
    ) {
        // Top Reader Bar
        if (!immersiveMode) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .background(Color(0xFF121213))
                    .padding(horizontal = 18.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "‹",
                    fontSize = 22.sp,
                    color = TextPrimary,
                    modifier = Modifier.clickable { onBackClick() }
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = novel.title.uppercase(),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextSecondary,
                        letterSpacing = 0.6.sp
                    )
                    Text(
                        text = "Chapter $chapterNum — Cahaya di Ujung Kegelapan",
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                        maxLines = 1
                    )
                }
                Box(
                    modifier = Modifier
                        .height(30.dp)
                        .clip(RoundedCornerShape(7.dp))
                        .background(BgCard)
                        .border(1.dp, BorderCard, RoundedCornerShape(7.dp))
                        .clickable { useSerif = !useSerif }
                        .padding(horizontal = 11.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Aa",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }
            }
            HorizontalDivider(color = Color(0xFF242428))
        }

        // Novel Prose Area
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .clickable { immersiveMode = !immersiveMode },
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 26.dp)
        ) {
            item {
                Text(
                    text = "CHAPTER ${chapterNum.toString().padStart(3, '0')}",
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = AccentRed,
                    letterSpacing = 0.8.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Cahaya di Ujung Kegelapan",
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic,
                    fontWeight = FontWeight.Medium,
                    fontSize = 23.sp,
                    lineHeight = 29.sp,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "±8 menit membaca · 1.840 kata",
                    fontSize = 11.sp,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(18.dp))
                Box(
                    modifier = Modifier
                        .width(36.dp)
                        .height(2.dp)
                        .background(SplitLeftCrimson)
                )
                Spacer(modifier = Modifier.height(22.dp))
            }

            item {
                val paragraphs = listOf(
                    "Kegelapan adalah satu-satunya hal yang kuingat ketika kesadaranku perlahan memudar dari dunia lamaku. Sebagai Raja Grey, aku telah berdiri di puncak kekuasaan tertinggi—namun puncak itu dingin, sunyi, dan hampa.",
                    "Ketika kelopak mataku akhirnya terbuka kembali, bukan langit-langit istana batu yang menyambutku, melainkan cahaya hangat lampu minyak dan suara lembut seorang wanita yang belum pernah kudengar sebelumnya.",
                    "Butuh beberapa saat bagi pikiranku yang terlatih selama puluhan tahun di medan perang untuk menerima kenyataan ini. Aku telah dilahirkan kembali ke dunia yang sama sekali asing—sebuah dunia di mana energi murni berdenyut halus di setiap tarikan napas.",
                    "Di sinilah perjalanan keduaku dimulai. Bukan lagi sebagai penguasa tanpa hati di atas singgasana besi, melainkan sebagai Arthur Leywin."
                )

                Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    paragraphs.forEach { para ->
                        Text(
                            text = para,
                            fontFamily = if (useSerif) FontFamily.Serif else FontFamily.SansSerif,
                            fontSize = fontSizeSp.sp,
                            lineHeight = (fontSizeSp * 1.82f).sp,
                            color = Color(0xFFE8E8EC)
                        )
                    }
                }
            }

            // End of Chapter Navigation
            item {
                Spacer(modifier = Modifier.height(32.dp))
                HorizontalDivider(color = Color(0xFF242428))
                Spacer(modifier = Modifier.height(20.dp))
                Text(
                    text = "Akhir dari Chapter $chapterNum",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(14.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(40.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(BgCard)
                            .border(1.dp, BorderCard, RoundedCornerShape(8.dp))
                            .clickable(enabled = chapterNum > 1) { chapterNum-- },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "‹  Sebelumnya",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(40.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(SplitLeftCrimson)
                            .clickable { chapterNum++ },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Selanjutnya  ›",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                    }
                }
            }
        }

        // Bottom Reader Progress Bar
        if (!immersiveMode) {
            HorizontalDivider(color = Color(0xFF242428))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(42.dp)
                    .background(Color(0xFF121213))
                    .padding(horizontal = 22.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Ch. $chapterNum / ${novel.totalChapters}",
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary
                )
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(4.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF242428))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.68f)
                            .fillMaxHeight()
                            .clip(CircleShape)
                            .background(AccentRed)
                    )
                }
                Text(
                    text = "68%",
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary
                )
            }
        }
    }
}
