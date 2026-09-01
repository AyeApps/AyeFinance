package com.aye.finance.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aye.finance.network.AccountDto
import com.aye.finance.network.AccountSummaryDto
import com.aye.finance.network.ApiService
import com.aye.finance.network.TransactionDto
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DashboardUiState(
    val isLoading: Boolean = false,
    val summary: AccountSummaryDto? = null,
    val accounts: List<AccountDto> = emptyList(),
    val recentTransactions: List<TransactionDto> = emptyList(),
    val errorMessage: String? = null
)

class DashboardViewModel(private val apiService: ApiService) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    fun loadDashboardData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val sumDeferred = async { apiService.getSummary() }
                val accDeferred = async { apiService.getAccounts() }
                val txDeferred = async { apiService.getTransactions(page = 1, limit = 5) }

                val summary = sumDeferred.await()
                val accounts = accDeferred.await()
                val txs = txDeferred.await()

                _uiState.value = DashboardUiState(
                    isLoading = false,
                    summary = summary,
                    accounts = accounts,
                    recentTransactions = txs.items
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = e.localizedMessage ?: "Error al cargar datos")
            }
        }
    }
}
