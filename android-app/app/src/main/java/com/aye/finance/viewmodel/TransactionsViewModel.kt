package com.aye.finance.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aye.finance.network.ApiService
import com.aye.finance.network.TransactionDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TransactionsUiState(
    val isLoading: Boolean = false,
    val transactions: List<TransactionDto> = emptyList(),
    val page: Int = 1,
    val hasMorePages: Boolean = true,
    val errorMessage: String? = null
)

class TransactionsViewModel(private val apiService: ApiService) : ViewModel() {

    private val _uiState = MutableStateFlow(TransactionsUiState())
    val uiState: StateFlow<TransactionsUiState> = _uiState.asStateFlow()

    fun loadTransactions(reset: Boolean = false) {
        val currentPage = if (reset) 1 else _uiState.value.page
        if (!reset && !_uiState.value.hasMorePages) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val res = apiService.getTransactions(page = currentPage, limit = 20)
                val newItems = if (reset) res.items else _uiState.value.transactions + res.items
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    transactions = newItems,
                    page = currentPage + 1,
                    hasMorePages = res.page < res.pages
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = e.localizedMessage)
            }
        }
    }

    fun deleteTransaction(id: String) {
        viewModelScope.launch {
            try {
                apiService.deleteTransaction(id)
                loadTransactions(reset = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = e.localizedMessage)
            }
        }
    }
}
