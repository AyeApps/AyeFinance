import Foundation

public enum RecurringType: String, Codable, CaseIterable {
    case ingresoFijo = "ingreso_fijo"
    case gastoFijo = "gasto_fijo"
    case mensualidad = "mensualidad"
    
    public var displayName: String {
        switch self {
        case .ingresoFijo: return "Ingreso Fijo"
        case .gastoFijo: return "Gasto Fijo"
        case .mensualidad: return "Mensualidad"
        }
    }
}

public enum Frequency: String, Codable, CaseIterable {
    case semanal
    case quincenal
    case mensual
    
    public var displayName: String {
        switch self {
        case .semanal: return "Semanal"
        case .quincenal: return "Quincenal"
        case .mensual: return "Mensual"
        }
    }
}

public struct RecurringItem: Codable, Identifiable, Hashable {
    public let id: String
    public let userId: String
    public var name: String
    public var type: RecurringType
    public var amount: String
    public var frequency: Frequency
    public var dayOfMonth: Int?
    public var accountId: String
    public var nextDate: String
    public var isActive: Bool
    public let createdAt: String
    public let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case type
        case amount
        case frequency
        case dayOfMonth = "day_of_month"
        case accountId = "account_id"
        case nextDate = "next_date"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    public var amountDouble: Double {
        Double(amount) ?? 0.0
    }
}
