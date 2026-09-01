import Foundation

public enum AccountType: String, Codable, CaseIterable {
    case corriente
    case ahorro
    case inversion
    
    public var displayName: String {
        switch self {
        case .corriente: return "Corriente"
        case .ahorro: return "Ahorro"
        case .inversion: return "Inversión"
        }
    }
}

public struct Account: Codable, Identifiable, Hashable {
    public let id: String
    public let userId: String
    public var name: String
    public var accountType: AccountType
    public var currency: String
    public var currentBalance: String
    public var projectedBalance: String
    public var color: String
    public var icon: String
    public var isLiquid: Bool
    public let createdAt: String
    public let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case accountType = "account_type"
        case currency
        case currentBalance = "current_balance"
        case projectedBalance = "projected_balance"
        case color
        case icon
        case isLiquid = "is_liquid"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    public var currentBalanceDouble: Double {
        Double(currentBalance) ?? 0.0
    }
    
    public var projectedBalanceDouble: Double {
        Double(projectedBalance) ?? 0.0
    }
}

public struct AccountSummary: Codable {
    public let liquidTotal: String
    public let savingsTotal: String
    public let grandTotal: String
    public let projectedGrandTotal: String
    public let accountsCount: Int
    
    enum CodingKeys: String, CodingKey {
        case liquidTotal = "liquid_total"
        case savingsTotal = "savings_total"
        case grandTotal = "grand_total"
        case projectedGrandTotal = "projected_grand_total"
        case accountsCount = "accounts_count"
    }
}
