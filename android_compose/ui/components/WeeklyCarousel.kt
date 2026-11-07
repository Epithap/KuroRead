package com.kuroread.app.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
fun WeeklyCarousel(
    novels: List<Novel>,
    onNovelClick: (Novel) -> Unit,
    modifier: Modifier = Modifier
) {
    val pagerState = rememberPagerState(pageCount = { novels.size })

    Column(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(horizontal = 22.dp)) {
            Text(
                text = "Rekomendasi Mingguan",
                fontSize = 17.5.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                text = "Pilihan terbaik untuk bacaan pekan ini",
                fontSize = 11.5.sp,
                color = TextSecondary
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        HorizontalPager(
            state = pagerState,
            contentPadding = PaddingValues(horizontal = 22.dp),
            pageSpacing = 14.dp,
            modifier = Modifier.fillMaxWidth()
        ) { page ->
            val novel = novels[page]
            WeeklyRecommendationCard(
                novel = novel,
                rankNumber = page + 1,
                onClick = { onNovelClick(novel) }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Pagination Dots
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            repeat(novels.size) { index ->
                val isSelected = pagerState.currentPage == index
                val width by animateDpAsState(
                    targetValue = if (isSelected) 16.dp else 5.dp,
                    label = "dotWidth"
                )
                Box(
                    modifier = Modifier
                        .padding(horizontal = 3.dp)
                        .height(5.dp)
                        .width(width)
                        .clip(CircleShape)
                        .background(if (isSelected) Color(0xFFEAEAEA) else Color(0xFF525256))
                )
            }
        }
    }
}

@Composable
fun WeeklyRecommendationCard(
    novel: Novel,
    rankNumber: Int,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(BgCard)
            .border(1.dp, BorderCard, RoundedCornerShape(18.dp))
            .clickable { onClick() }
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(13.dp)
    ) {
        // Top 3-column layout: Cover | Title | Rating + Rank Box
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(142.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 1. Left Cover
            Box(
                modifier = Modifier
                    .width(96.dp)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(novel.coverPlaceholderColor))
            )

            // 2. Center: PILIHAN EDITOR + Stacked Serif Italic Title
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(top = 2.dp)
            ) {
                Text(
                    text = "PILIHAN EDITOR",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary,
                    letterSpacing = 0.6.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = novel.title.replace(" ", "\n"),
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic,
                    fontWeight = FontWeight.Medium,
                    fontSize = 16.5.sp,
                    lineHeight = 20.sp,
                    color = TextPrimary
                )
            }

            // 3. Right: Rating, Author, and Minimalist Top Rank Box
            Column(
                modifier = Modifier
                    .width(94.dp)
                    .fillMaxHeight()
                    .padding(top = 14.dp),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "☆ ${novel.rating}",
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = novel.author,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextSecondary
                    )
                }

                // Minimalist Top Rank Box
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(BgRankBox)
                        .border(1.dp, BorderRankBox, RoundedCornerShape(10.dp))
                        .padding(vertical = 7.dp, horizontal = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "↗",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = AccentRed
                        )
                        Text(
                            text = "#$rankNumber",
                            fontSize = 19.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                    Text(
                        text = "Peringkat minggu ini",
                        fontSize = 8.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextMuted
                    )
                }
            }
        }

        // Bottom Split Pill Bar (Completed | 529 CH)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(29.dp)
                .clip(CircleShape)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .background(SplitLeftCrimson),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = novel.status.label,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .background(SplitRightGraphite),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "${novel.totalChapters} CH",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFF0F0F2)
                )
            }
        }
    }
}
