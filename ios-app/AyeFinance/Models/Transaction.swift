import Foundation

public enum TransactionType: String, Codable, CaseIterable {
    case ingreso
    case gasto
    case transferencia
    
    public var displayName: String {
        switch self {
        case .ingreso: return "Ingreso"
        case .gasto: return "Gasto"
        case .transferencia: return "Transferencia"
        }
    }
}

public struct Transaction: Codable, Identifiable, Hashable {
    public let id: String
    public let userId: String
    public let accountId: String
    public let destinationAccountId: String?
    public let amount: String
    public let type: TransactionType
    public let concept: String
    public let category: String
    public let date: String
    public let notes: String?
    public let isRecurring: Bool
    public let recurringItemId: String?
    public let createdAt: String
    public let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case accountId = "account_id"
        case destinationAccountId = "destination_account_id"
        case amount
        case type
        case concept
        case category
        case date
        case notes
        case isRecurring = "is_recurring"
        case recurringItemId = "recurring_item_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    public var amountDouble: Double {
        Double(amount) ?? 0.0
    }
}

public struct PaginatedTransactions: Codable {
    public let items: [Transaction]
    public let total: Int
    public let page: Int
    public let limit: Int
    public let pages: Int
}
