import Foundation
import Observation

@Observable
public final class TransactionsViewModel {
    public var transactions: [Transaction] = []
    public var isLoading = false
    public var errorMessage: String?
    public var page = 1
    public var hasMorePages = true
    
    public init() {}
    
    @MainActor
    public func loadTransactions(reset: Bool = false) async {
        if reset {
            page = 1
            transactions = []
            hasMorePages = true
        }
        
        guard !isLoading, hasMorePages else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let res: PaginatedTransactions = try await NetworkService.shared.request(
                endpoint: "transactions/?page=\(page)&limit=20"
            )
            
            if reset {
                self.transactions = res.items
            } else {
                self.transactions.append(contentsOf: res.items)
            }
            
            self.hasMorePages = res.page < res.pages
            self.page += 1
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    @MainActor
    public func createTransaction(
        accountId: String,
        destinationAccountId: String?,
        amount: Double,
        type: TransactionType,
        concept: String,
        category: String
    ) async -> Bool {
        do {
            var payload: [String: Any] = [
                "account_id": accountId,
                "amount": String(format: "%.2f", amount),
                "type": type.rawValue,
                "concept": concept,
                "category": category
            ]
            if let dest = destinationAccountId, type == .transferencia {
                payload["destination_account_id"] = dest
            }
            let data = try JSONSerialization.data(withJSONObject: payload)
            let _: Transaction = try await NetworkService.shared.request(endpoint: "transactions/", method: "POST", body: data)
            await loadTransactions(reset: true)
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            return false
        }
    }
    
    @MainActor
    public func deleteTransaction(id: String) async -> Bool {
        do {
            let _: EmptyResponse = try await NetworkService.shared.request(endpoint: "transactions/\(id)", method: "DELETE")
            await loadTransactions(reset: true)
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            return false
        }
    }
}
