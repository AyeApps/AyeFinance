package com.aye.finance.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aye.finance.network.ApiService
import com.aye.finance.network.AuthInterceptor
import com.aye.finance.network.LoginRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val errorMessage: String? = null
)

class AuthViewModel(
    private val apiService: ApiService,
    private val authInterceptor: AuthInterceptor
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState(isAuthenticated = !authInterceptor.getToken().isNullOrEmpty()))
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun login(email: String, pass: String) {
        if (email.isBlank() || pass.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Completa todos los campos")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val res = apiService.login(LoginRequest(email, pass))
                authInterceptor.saveToken(res.accessToken)
                _uiState.value = _uiState.value.copy(isLoading = false, isAuthenticated = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = e.localizedMessage ?: "Error de autenticación")
            }
        }
    }

    fun logout() {
        authInterceptor.clearToken()
        _uiState.value = AuthUiState(isAuthenticated = false)
    }
}
