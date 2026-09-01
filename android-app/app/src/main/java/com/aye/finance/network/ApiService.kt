package com.aye.finance.network

import com.google.gson.annotations.SerializedName
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

data class AccountDto(
    val id: String,
    @SerializedName("user_id") val userId: String,
    val name: String,
    @SerializedName("account_type") val accountType: String,
    val currency: String,
    @SerializedName("current_balance") val currentBalance: String,
    @SerializedName("projected_balance") val projectedBalance: String,
    val color: String,
    val icon: String,
    @SerializedName("is_liquid") val isLiquid: Boolean
)

data class AccountSummaryDto(
    @SerializedName("liquid_total") val liquidTotal: String,
    @SerializedName("savings_total") val savingsTotal: String,
    @SerializedName("grand_total") val grandTotal: String,
    @SerializedName("projected_grand_total") val projectedGrandTotal: String,
    @SerializedName("accounts_count") val accountsCount: Int
)

data class TransactionDto(
    val id: String,
    @SerializedName("user_id") val userId: String,
    @SerializedName("account_id") val accountId: String,
    @SerializedName("destination_account_id") val destinationAccountId: String?,
    val amount: String,
    val type: String,
    val concept: String,
    val category: String,
    val date: String,
    val notes: String?
)

data class PaginatedTransactionsDto(
    val items: List<TransactionDto>,
    val total: Int,
    val page: Int,
    val limit: Int,
    val pages: Int
)

data class RecurringItemDto(
    val id: String,
    val name: String,
    val type: String,
    val amount: String,
    val frequency: String,
    @SerializedName("account_id") val accountId: String,
    @SerializedName("next_date") val nextDate: String,
    @SerializedName("is_active") val isActive: Boolean
)

data class LoginRequest(val email: String, val password: String)
data class AuthResponseDto(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String
)

interface ApiService {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponseDto

    @GET("accounts/summary")
    suspend fun getSummary(): AccountSummaryDto

    @GET("accounts/")
    suspend fun getAccounts(): List<AccountDto>

    @POST("accounts/")
    suspend fun createAccount(@Body payload: Map<String, Any>): AccountDto

    @DELETE("accounts/{id}")
    suspend fun deleteAccount(@Path("id") id: String)

    @GET("transactions/")
    suspend fun getTransactions(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("account_id") accountId: String? = null,
        @Query("type") type: String? = null
    ): PaginatedTransactionsDto

    @POST("transactions/")
    suspend fun createTransaction(@Body payload: Map<String, Any>): TransactionDto

    @DELETE("transactions/{id}")
    suspend fun deleteTransaction(@Path("id") id: String)

    @GET("recurring/")
    suspend fun getRecurringItems(): List<RecurringItemDto>
}
