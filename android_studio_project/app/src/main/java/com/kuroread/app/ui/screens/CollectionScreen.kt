package com.kuroread.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kuroread.app.ui.theme.*

@Composable
fun CollectionScreen(
    onNovelClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var activeFilter by remember { mutableStateOf("Semua · 3") }
    val filters = listOf("Semua · 3", "Dibaca · 3", "Selesai · 0")

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(BgScreen),
        contentPadding = PaddingValues(horizontal = 22.dp, vertical = 16.dp)
    ) {
        item {
            Text(
                text = "Collection",
                fontSize = 24.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(14.dp))

            // Filter Pills
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                filters.forEach { filter ->
                    val isSelected = activeFilter == filter
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(34.dp)
                            .clip(CircleShape)
                            .background(if (isSelected) BgSearchBtn else Color.Transparent)
                            .border(
                                1.dp,
                                if (isSelected) BgSearchBtn else Color(0xFF36363C),
                                CircleShape
                            )
                            .clickable { activeFilter = filter },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = filter,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isSelected) BgScreen else TextSecondary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(22.dp))

            // Shelf Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Text(
                    text = "Rak novelmu",
                    fontSize = 16.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Text(
                    text = "Judul A–Z",
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextSecondary
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 3-Column Shelf Grid
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                ShelfGridItem(
                    title = "Lord of The\nMystery",
                    sub = "86 chapter dibaca",
                    unread = "24",
                    isAccentBadge = false,
                    coverColor = 0xFF121F2D,
                    modifier = Modifier.weight(1f),
                    onClick = { onNovelClick("lotm") }
                )
                ShelfGridItem(
                    title = "Reverend\nInsanity",
                    sub = "42 chapter dibaca",
                    unread = "12",
                    isAccentBadge = false,
                    coverColor = 0xFF242216,
                    modifier = Modifier.weight(1f),
                    onClick = { onNovelClick("ri") }
                )
                ShelfGridItem(
                    title = "The Beginning\nAfter The End",
                    sub = "137 / 529 chapter",
                    unread = "392",
                    isAccentBadge = true,
                    coverColor = 0xFF2D1418,
                    modifier = Modifier.weight(1f),
                    onClick = { onNovelClick("tbate") }
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Reading Overview Card (Matte Charcoal)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(BgCard)
                    .border(1.dp, BorderCard, RoundedCornerShape(12.dp))
                    .padding(horizontal = 16.dp, vertical = 14.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(5.dp)
                            .clip(CircleShape)
                            .background(AccentRed)
                    )
                    Text(
                        text = "RAK BACAAN",
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextSecondary,
                        letterSpacing = 0.6.sp
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "3 cerita. Banyak dunia.",
                    fontSize = 18.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "3 sedang dibaca · 0 sudah selesai",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFFD4D4D8)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Novel tersimpan tetap mudah ditemukan.",
                    fontSize = 10.5.sp,
                    color = TextMuted
                )
            }

            Spacer(modifier = Modifier.height(22.dp))

            Text(
                text = "Lanjut dari koleksi",
                fontSize = 16.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(12.dp))

            ContinueRowItem(
                title = "The Beginning After The End",
                sub = "Lanjutkan Chapter 137",
                coverColor = 0xFF2D1418,
                onClick = { onNovelClick("tbate") }
            )
            Spacer(modifier = Modifier.height(12.dp))
            ContinueRowItem(
                title = "Lord of The Mystery",
                sub = "Lanjutkan Chapter 86",
                coverColor = 0xFF121F2D,
                onClick = { onNovelClick("lotm") }
            )
        }
    }
}

@Composable
private fun ShelfGridItem(
    title: String,
    sub: String,
    unread: String,
    isAccentBadge: Boolean,
    coverColor: Long,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.clickable { onClick() }
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(108f / 158f)
                .clip(RoundedCornerShape(6.dp))
                .background(Color(coverColor))
                .padding(6.dp),
            contentAlignment = Alignment.TopEnd
        ) {
            Box(
                modifier = Modifier
                    .height(21.dp)
                    .defaultMinSize(minWidth = 25.dp)
                    .clip(RoundedCornerShape(5.dp))
                    .background(if (isAccentBadge) SplitLeftCrimson else Color(0xE60E0E10))
                    .padding(horizontal = 5.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = unread,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = title,
            fontSize = 11.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextPrimary,
            lineHeight = 15.5.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = sub,
            fontSize = 9.5.sp,
            color = TextSecondary
        )
    }
}

@Composable
private fun ContinueRowItem(
    title: String,
    sub: String,
    coverColor: Long,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .width(32.dp)
                .height(46.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(Color(coverColor))
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                text = sub,
                fontSize = 10.5.sp,
                color = TextSecondary
            )
        }
        Text(
            text = "›",
            fontSize = 18.sp,
            color = TextPrimary
        )
    }
}
