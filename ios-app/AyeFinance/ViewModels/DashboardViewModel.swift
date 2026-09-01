import Foundation
import Observation

@Observable
public final class DashboardViewModel {
    public var summary: AccountSummary?
    public var accounts: [Account] = []
    public var recentTransactions: [Transaction] = []
    public var upcomingRecurring: [RecurringItem] = []
    public var isLoading = false
    public var errorMessage: String?
    
    public init() {}
    
    @MainActor
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            async let summaryTask: AccountSummary = NetworkService.shared.request(endpoint: "accounts/summary")
            async let accountsTask: [Account] = NetworkService.shared.request(endpoint: "accounts/")
            async let txTask: PaginatedTransactions = NetworkService.shared.request(endpoint: "transactions/?limit=5")
            async let recTask: [RecurringItem] = NetworkService.shared.request(endpoint: "recurring/")
            
            self.summary = try await summaryTask
            self.accounts = try await accountsTask
            self.recentTransactions = try await txTask.items
            self.upcomingRecurring = Array(try await recTask.prefix(3))
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}
