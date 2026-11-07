package com.kuroread.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kuroread.app.ui.theme.*

@Composable
fun HistoryScreen(
    onContinueClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(BgScreen),
        contentPadding = PaddingValues(horizontal = 22.dp, vertical = 16.dp)
    ) {
        item {
            Text(
                text = "History",
                fontSize = 24.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "Kembali ke cerita yang belum selesai.",
                fontSize = 12.5.sp,
                color = TextSecondary
            )
            Spacer(modifier = Modifier.height(22.dp))
            Text(
                text = "HARI INI",
                fontSize = 10.5.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 0.6.sp
            )
            Spacer(modifier = Modifier.height(14.dp))
        }

        item {
            HistoryEntryItem(
                title = "The Beginning\nAfter The End",
                chapter = "Chapter 137 dari 529",
                timeInfo = "12 menit lalu · 8 menit membaca",
                progressPercent = 0.68f,
                progressLabel = "68% chapter selesai",
                isPrimary = true,
                coverColor = 0xFF2D1418,
                onClick = { onContinueClick("tbate") }
            )
            HorizontalDivider(
                modifier = Modifier.padding(vertical = 18.dp),
                color = Color(0xFF242428)
            )
        }

        item {
            HistoryEntryItem(
                title = "Lord of The Mystery",
                chapter = "Chapter 86",
                timeInfo = "2 jam lalu · 14 menit membaca",
                progressPercent = 0.32f,
                progressLabel = "32% chapter selesai",
                isPrimary = false,
                coverColor = 0xFF121F2D,
                onClick = { onContinueClick("lotm") }
            )
            HorizontalDivider(
                modifier = Modifier.padding(vertical = 18.dp),
                color = Color(0xFF242428)
            )
        }

        item {
            Text(
                text = "KEMARIN",
                fontSize = 10.5.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 0.6.sp
            )
            Spacer(modifier = Modifier.height(14.dp))
            HistoryEntryItem(
                title = "Reverend Insanity",
                chapter = "Chapter 42",
                timeInfo = "Kemarin, 21:30 · 11 menit membaca",
                progressPercent = 0.85f,
                progressLabel = "85% chapter selesai",
                isPrimary = false,
                coverColor = 0xFF242216,
                onClick = { onContinueClick("ri") }
            )
            Spacer(modifier = Modifier.height(22.dp))
            Text(
                text = "Riwayat tersimpan otomatis di perangkat ini.",
                fontSize = 10.5.sp,
                color = TextMuted
            )
        }
    }
}

@Composable
private fun HistoryEntryItem(
    title: String,
    chapter: String,
    timeInfo: String,
    progressPercent: Float,
    progressLabel: String,
    isPrimary: Boolean,
    coverColor: Long,
    onClick: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onClick() },
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(62.dp)
                    .height(92.dp)
                    .clip(RoundedCornerShape(5.dp))
                    .background(Color(coverColor))
            )
            Column {
                Text(
                    text = title,
                    fontSize = 14.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                    lineHeight = 19.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = chapter,
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFFE0E0E4)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = timeInfo,
                    fontSize = 10.5.sp,
                    color = TextSecondary
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = progressLabel,
                    fontSize = 10.5.sp,
                    color = TextSecondary
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF28282C))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progressPercent)
                            .fillMaxHeight()
                            .clip(CircleShape)
                            .background(if (isPrimary) AccentRed else TextPrimary)
                    )
                }
            }

            Box(
                modifier = Modifier
                    .width(98.dp)
                    .height(34.dp)
                    .clip(RoundedCornerShape(7.dp))
                    .background(if (isPrimary) BgSearchBtn else BgCard)
                    .border(
                        1.dp,
                        if (isPrimary) BgSearchBtn else Color(0xFF34343A),
                        RoundedCornerShape(7.dp)
                    )
                    .clickable { onClick() },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Continue",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isPrimary) BgScreen else TextPrimary
                )
            }
        }
    }
}
