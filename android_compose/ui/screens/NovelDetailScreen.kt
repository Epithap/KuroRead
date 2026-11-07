package com.kuroread.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
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
fun NovelDetailScreen(
    novel: Novel,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isBookmarked by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(BgScreen),
        contentPadding = PaddingValues(horizontal = 22.dp, vertical = 14.dp)
    ) {
        // Top App Bar
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "‹  Novel detail",
                    fontSize = 17.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                    modifier = Modifier.clickable { onBackClick() }
                )
                Text(
                    text = "•••",
                    fontSize = 15.sp,
                    color = TextPrimary
                )
            }
            Spacer(modifier = Modifier.height(18.dp))
        }

        // Hero Row: Cover + Metadata
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .width(104.dp)
                        .height(156.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color(novel.coverPlaceholderColor))
                )
                Column {
                    Text(
                        text = novel.author,
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = novel.title,
                        fontFamily = FontFamily.Serif,
                        fontStyle = FontStyle.Italic,
                        fontWeight = FontWeight.Medium,
                        fontSize = 21.sp,
                        lineHeight = 26.sp,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Text(
                            text = "☆ ${novel.rating}",
                            fontSize = 13.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                        Text(
                            text = "${novel.totalChapters} chapter",
                            fontSize = 11.5.sp,
                            color = TextSecondary
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Box(
                        modifier = Modifier
                            .height(26.dp)
                            .clip(CircleShape)
                            .background(SplitLeftCrimson)
                            .padding(horizontal = 18.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = novel.status.label,
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Genre Pills
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                listOf("Fantasy", "Action", "Adventure", "Isekai").forEach { genre ->
                    Box(
                        modifier = Modifier
                            .height(27.dp)
                            .clip(CircleShape)
                            .background(BgCard)
                            .border(1.dp, BorderCard, CircleShape)
                            .padding(horizontal = 13.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = genre,
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFFDCDCE0)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // CTA Buttons Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(43.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(BgSearchBtn),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Read First",
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = BgScreen
                    )
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(43.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isBookmarked) Color(0xFF26171A) else BgCard)
                        .border(
                            1.dp,
                            if (isBookmarked) AccentRed else Color(0xFF34343A),
                            RoundedCornerShape(8.dp)
                        )
                        .clickable { isBookmarked = !isBookmarked },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (isBookmarked) "Bookmarked" else "Bookmark",
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.height(22.dp))

            // Synopsis
            Text(
                text = "Synopsis",
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = novel.synopsis,
                fontSize = 12.sp,
                lineHeight = 18.sp,
                color = Color(0xFFB8B8BC)
            )
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "Baca selengkapnya",
                fontSize = 11.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )

            HorizontalDivider(
                modifier = Modifier.padding(vertical = 18.dp),
                color = Color(0xFF242428)
            )

            // Chapter List Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Chapter list",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                    Text(
                        text = "${novel.totalChapters} chapter",
                        fontSize = 10.5.sp,
                        color = TextSecondary
                    )
                }
                Text(
                    text = "⇅ Terlama",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Chapters 001 to 006
        items(6) { idx ->
            val num = (idx + 1).toString().padStart(3, '0')
            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = num,
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextSecondary,
                        modifier = Modifier.width(44.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Chapter ${idx + 1}",
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                        Text(
                            text = "Sudah dibaca · ±8 menit",
                            fontSize = 10.sp,
                            color = TextMuted
                        )
                    }
                    Text(
                        text = "›",
                        fontSize = 16.sp,
                        color = TextPrimary
                    )
                }
                HorizontalDivider(color = Color(0xFF242428))
            }
        }
    }
}
