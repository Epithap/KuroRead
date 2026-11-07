package com.kuroread.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kuroread.app.model.Novel
import com.kuroread.app.model.sampleWeeklyNovels
import com.kuroread.app.ui.components.NovelListItem
import com.kuroread.app.ui.components.WeeklyCarousel
import com.kuroread.app.ui.theme.*

@Composable
fun HomeScreen(
    onNovelSelected: (Novel) -> Unit,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }

    Scaffold(
        containerColor = BgScreen
    ) { paddingValues ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(top = 12.dp, bottom = 32.dp)
        ) {
            // 1. Top Greeting & Pill Search Row
            item {
                Column(modifier = Modifier.padding(horizontal = 22.dp)) {
                    Text(
                        text = "Temukan cerita berikutnya.",
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .clip(CircleShape)
                                .background(BgSearchPill)
                                .border(1.dp, BorderSearchPill, CircleShape)
                                .padding(horizontal = 18.dp),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            if (searchQuery.isEmpty()) {
                                Text(
                                    text = "cari novel favoritmu...",
                                    fontSize = 12.5.sp,
                                    color = TextMuted
                                )
                            }
                            BasicTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                singleLine = true,
                                textStyle = TextStyle(
                                    color = TextPrimary,
                                    fontSize = 12.5.sp,
                                    fontWeight = FontWeight.Medium
                                ),
                                cursorBrush = SolidColor(TextPrimary),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        IconButton(
                            onClick = { /* Search Action */ },
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(BgSearchBtn)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = "Cari",
                                tint = BgScreen,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }

            // 2. Rekomendasi Mingguan Carousel (Swipeable)
            item {
                WeeklyCarousel(
                    novels = sampleWeeklyNovels,
                    onNovelClick = onNovelSelected
                )
            }

            item { Spacer(modifier = Modifier.height(22.dp)) }

            // 3. Maybe you like Section Header
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 22.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column {
                        Text(
                            text = "Maybe you like",
                            fontSize = 17.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(3.dp))
                        Text(
                            text = "Kurasi untuk rak bacaanmu",
                            fontSize = 11.5.sp,
                            color = TextSecondary
                        )
                    }

                    Icon(
                        imageVector = Icons.Default.KeyboardArrowRight,
                        contentDescription = "Lihat semua",
                        tint = TextPrimary
                    )
                }
                Spacer(modifier = Modifier.height(14.dp))
            }

            // 4. Borderless Minimalist Novel List
            items(sampleWeeklyNovels.drop(1).take(2)) { novel ->
                NovelListItem(
                    novel = novel,
                    onClick = { onNovelSelected(novel) },
                    modifier = Modifier.padding(horizontal = 22.dp, vertical = 9.dp)
                )
            }
        }
    }
}
