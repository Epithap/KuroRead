package com.kuroread.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
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
fun ProfileScreen(
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
                text = "Profile & More",
                fontSize = 24.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = "Ruang baca pribadimu.",
                fontSize = 19.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Cerita bagus dimulai dari satu chapter.",
                fontSize = 12.5.sp,
                color = TextSecondary
            )
            Spacer(modifier = Modifier.height(14.dp))

            // Local Reader Profile Badge
            Row(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(BgCard)
                    .border(1.dp, BorderCard, CircleShape)
                    .padding(horizontal = 13.dp, vertical = 5.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(7.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(AccentRed)
                )
                Text(
                    text = "Profil lokal · Tanpa akun",
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFFE0E0E4)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "STATISTIK MEMBACA",
                fontSize = 10.5.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 0.6.sp
            )
            Spacer(modifier = Modifier.height(14.dp))

            // 2 Stat Cards
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCardItem(
                    value = "265",
                    label = "Chapter dibaca",
                    modifier = Modifier.weight(1f)
                )
                StatCardItem(
                    value = "38j 24m",
                    label = "Waktu membaca",
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(22.dp))

            // Daily Target
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Text(
                    text = "Target harian",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Text(
                    text = "14 / 20 chapter",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFFD4D4D8)
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(5.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF28282C))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.70f)
                        .fillMaxHeight()
                        .clip(CircleShape)
                        .background(AccentRed)
                )
            }
            Spacer(modifier = Modifier.height(9.dp))
            Text(
                text = "Sedikit lagi untuk menutup target hari ini.",
                fontSize = 11.5.sp,
                color = TextSecondary
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "PENGATURAN",
                fontSize = 10.5.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 0.6.sp
            )
            Spacer(modifier = Modifier.height(14.dp))

            SettingsRowItem(
                title = "Reader preferences",
                desc = "Font, tema, dan pengalaman membaca"
            )
            HorizontalDivider(
                modifier = Modifier.padding(vertical = 16.dp),
                color = Color(0xFF242428)
            )
            SettingsRowItem(
                title = "Storage",
                desc = "Kelola unduhan dan cache"
            )
            HorizontalDivider(
                modifier = Modifier.padding(vertical = 16.dp),
                color = Color(0xFF242428)
            )
            SettingsRowItem(
                title = "Backup",
                desc = "Simpan dan pulihkan koleksimu"
            )

            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Disimpan lokal. Dirancang untuk fokus membaca.",
                fontSize = 10.5.sp,
                color = TextMuted
            )
        }
    }
}

@Composable
private fun StatCardItem(
    value: String,
    label: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .height(96.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(BgCard)
            .border(1.dp, BorderCard, RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = value,
            fontSize = 26.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextPrimary
        )
        Text(
            text = label,
            fontSize = 11.5.sp,
            fontWeight = FontWeight.Medium,
            color = TextSecondary
        )
    }
}

@Composable
private fun SettingsRowItem(
    title: String,
    desc: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = title,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.Medium,
                color = TextPrimary
            )
            Text(
                text = desc,
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
