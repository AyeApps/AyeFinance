import Foundation
import Observation

@Observable
public final class AccountsViewModel {
    public var accounts: [Account] = []
    public var isLoading = false
    public var errorMessage: String?
    
    public init() {}
    
    @MainActor
    public func loadAccounts() async {
        isLoading = true
        errorMessage = nil
        
        do {
            self.accounts = try await NetworkService.shared.request(endpoint: "accounts/")
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    @MainActor
    public func createAccount(name: String, type: AccountType, initialBalance: Double, isLiquid: Bool, color: String) async -> Bool {
        do {
            let payload: [String: Any] = [
                "name": name,
                "account_type": type.rawValue,
                "initial_balance": String(format: "%.2f", initialBalance),
                "is_liquid": isLiquid,
                "color": color
            ]
            let data = try JSONSerialization.data(withJSONObject: payload)
            let _: Account = try await NetworkService.shared.request(endpoint: "accounts/", method: "POST", body: data)
            await loadAccounts()
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            return false
        }
    }
    
    @MainActor
    public func deleteAccount(id: String) async -> Bool {
        do {
            let _: EmptyResponse = try await NetworkService.shared.request(endpoint: "accounts/\(id)", method: "DELETE")
            await loadAccounts()
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            return false
        }
    }
}
