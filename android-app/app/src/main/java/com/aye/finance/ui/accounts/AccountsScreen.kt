package com.aye.finance.ui.accounts

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
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
import com.aye.finance.repository.AccountRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountsScreen(accountRepository: AccountRepository) {
    var accounts by remember { mutableStateOf<List<AccountDto>>(emptyList()) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            accountRepository.getAccounts().onSuccess { accounts = it }
        }
    }

    LaunchedEffect(Unit) { load() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Mis Cuentas", fontWeight = FontWeight.Bold, color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ObsidianBg)
            )
        },
        containerColor = ObsidianBg
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(accounts) { acc ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark, shape = RoundedCornerShape(12.dp))
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(acc.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text(acc.accountType.uppercase(), color = Color.Gray, fontSize = 11.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Column(horizontalAlignment = Alignment.End) {
                            Text("$${acc.currentBalance}", color = Color.White, fontWeight = FontWeight.Black, fontSize = 15.sp)
                            Text("Proy: $${acc.projectedBalance}", color = CyberAmber, fontSize = 11.sp)
                        }
                        IconButton(onClick = {
                            scope.launch {
                                accountRepository.deleteAccount(acc.id)
                                load()
                            }
                        }) {
                            Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = Color.Red.copy(alpha = 0.7f))
                        }
                    }
                }
            }
        }
    }
}
