import Foundation
import Observation

public struct AuthPayload: Codable {
    public let accessToken: String
    public let tokenType: String
    public let expiresIn: Int
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
    }
}

@Observable
public final class AuthViewModel {
    public var email = ""
    public var password = ""
    public var isLoading = false
    public var errorMessage: String?
    public var isAuthenticated = false
    
    public init() {
        self.isAuthenticated = KeychainService.shared.getToken() != nil
    }
    
    @MainActor
    public func login() async {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Ingresa tu correo y contraseña"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let bodyDict: [String: String] = ["email": email, "password": password]
            let bodyData = try JSONSerialization.data(withJSONObject: bodyDict)
            
            let authResponse: AuthPayload = try await NetworkService.shared.request(
                endpoint: "auth/login",
                method: "POST",
                body: bodyData
            )
            
            _ = KeychainService.shared.saveToken(authResponse.accessToken)
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    public func logout() {
        KeychainService.shared.clearAll()
        isAuthenticated = false
    }
}
