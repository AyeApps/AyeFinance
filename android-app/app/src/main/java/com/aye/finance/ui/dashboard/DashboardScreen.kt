package com.aye.finance.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aye.finance.network.AccountDto
import com.aye.finance.ui.auth.CyberAmber
import com.aye.finance.ui.auth.ObsidianBg
import com.aye.finance.ui.auth.SurfaceDark
import com.aye.finance.viewmodel.DashboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(viewModel: DashboardViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadDashboardData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard", fontWeight = FontWeight.Bold, color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ObsidianBg)
            )
        },
        containerColor = ObsidianBg
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Summary Cards
            uiState.summary?.let { sum ->
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        SummaryBox("Disponible Líquido", "$${sum.liquidTotal}", "Para gastar sin tocar ahorro", Color(0xFF10B981))
                        SummaryBox("Total con Ahorros", "$${sum.grandTotal}", "Patrimonio completo", Color(0xFF0EA5E9))
                        SummaryBox("Gran Total Proyectado (30d)", "$${sum.projectedGrandTotal}", "Flujo proyectado", CyberAmber)
                    }
                }
            }

            // Accounts
            item {
                Text("Mis Cuentas", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }

            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(uiState.accounts) { acc ->
                        AccountItemCard(acc)
                    }
                }
            }

            // Transactions
            item {
                Text("Últimos Movimientos", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }

            items(uiState.recentTransactions) { tx ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark, shape = RoundedCornerShape(10.dp))
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(tx.concept, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Text(tx.category, color = Color.Gray, fontSize = 12.sp)
                    }
                    Text(
                        text = (if (tx.type == "ingreso") "+" else "-") + "$" + tx.amount,
                        color = if (tx.type == "ingreso") Color(0xFF10B981) else Color(0xFFEF4444),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

@Composable
fun SummaryBox(title: String, amount: String, subtitle: String, color: Color) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, color = Color.Gray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Text(amount, color = color, fontSize = 22.sp, fontWeight = FontWeight.Black)
            Text(subtitle, color = Color.Gray.copy(alpha = 0.8f), fontSize = 11.sp)
        }
    }
}

@Composable
fun AccountItemCard(account: AccountDto) {
    Card(
        modifier = Modifier.width(140.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(account.name, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            Text("$${account.currentBalance}", color = CyberAmber, fontSize = 16.sp, fontWeight = FontWeight.Black)
            Text("Proy: $${account.projectedBalance}", color = Color.Gray, fontSize = 10.sp)
        }
    }
}
