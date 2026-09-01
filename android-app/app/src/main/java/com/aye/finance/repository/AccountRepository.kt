package com.aye.finance.repository

import com.aye.finance.network.AccountDto
import com.aye.finance.network.AccountSummaryDto
import com.aye.finance.network.ApiService

class AccountRepository(private val apiService: ApiService) {
    suspend fun getSummary(): Result<AccountSummaryDto> = runCatching {
        apiService.getSummary()
    }

    suspend fun getAccounts(): Result<List<AccountDto>> = runCatching {
        apiService.getAccounts()
    }

    suspend fun createAccount(name: String, type: String, initialBalance: Double, isLiquid: Boolean, color: String): Result<AccountDto> = runCatching {
        val payload = mapOf(
            "name" to name,
            "account_type" to type,
            "initial_balance" to initialBalance,
            "is_liquid" to isLiquid,
            "color" to color
        )
        apiService.createAccount(payload)
    }

    suspend fun deleteAccount(id: String): Result<Unit> = runCatching {
        apiService.deleteAccount(id)
    }
}
