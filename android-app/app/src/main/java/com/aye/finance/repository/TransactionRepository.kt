package com.aye.finance.repository

import com.aye.finance.network.ApiService
import com.aye.finance.network.PaginatedTransactionsDto
import com.aye.finance.network.TransactionDto

class TransactionRepository(private val apiService: ApiService) {
    suspend fun getTransactions(page: Int, type: String? = null, accountId: String? = null): Result<PaginatedTransactionsDto> = runCatching {
        apiService.getTransactions(page = page, limit = 20, accountId = accountId, type = type)
    }

    suspend fun createTransaction(
        accountId: String,
        destinationAccountId: String?,
        amount: Double,
        type: String,
        concept: String,
        category: String
    ): Result<TransactionDto> = runCatching {
        val payload = mutableMapOf<String, Any>(
            "account_id" to accountId,
            "amount" to amount,
            "type" to type,
            "concept" to concept,
            "category" to category
        )
        if (destinationAccountId != null && type == "transferencia") {
            payload["destination_account_id"] = destinationAccountId
        }
        apiService.createTransaction(payload)
    }

    suspend fun deleteTransaction(id: String): Result<Unit> = runCatching {
        apiService.deleteTransaction(id)
    }
}
