import AppIntents
import Foundation

// MARK: - AccountEntity for App Intents & WidgetKit

public struct AccountEntity: AppEntity, Identifiable, Hashable, Sendable {
    public static var defaultQuery = AccountEntityQuery()
    public static var typeDisplayRepresentation: TypeDisplayRepresentation = "Cuenta de AyeFinance"

    public var id: String
    public var name: String
    public var balance: Double
    public var currency: String
    public var accountType: String
    public var colorHex: String

    public var displayRepresentation: DisplayRepresentation {
        let formattedBalance = String(format: "%.2f", balance)
        let subtitleText = "\(currency) $\(formattedBalance)"
        return DisplayRepresentation(
            title: "\(name)",
            subtitle: "\(subtitleText)"
        )
    }

    public init(
        id: String,
        name: String,
        balance: Double = 0.0,
        currency: String = "USD",
        accountType: String = "corriente",
        colorHex: String = "#FE9D01"
    ) {
        self.id = id
        self.name = name
        self.balance = balance
        self.currency = currency
        self.accountType = accountType
        self.colorHex = colorHex
    }
}

// MARK: - Entity Query for Dynamic Accounts Picker

public struct AccountEntityQuery: EntityQuery, EntityStringQuery, Sendable {
    public init() {}

    public func entities(for identifiers: [AccountEntity.ID]) async throws -> [AccountEntity] {
        let all = AccountStorage.loadAccounts()
        return all.filter { identifiers.contains($0.id) }
    }

    public func entities(matching string: String) async throws -> [AccountEntity] {
        let all = AccountStorage.loadAccounts()
        if string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return all
        }
        return all.filter { $0.name.localizedCaseInsensitiveContains(string) }
    }

    public func suggestedEntities() async throws -> [AccountEntity] {
        let accounts = AccountStorage.loadAccounts()
        if accounts.isEmpty {
            return [
                AccountEntity(
                    id: "principal",
                    name: "Cuenta Principal",
                    balance: 0.0,
                    currency: "USD",
                    accountType: "corriente",
                    colorHex: "#FE9D01"
                )
            ]
        }
        return accounts
    }

    public func defaultResult() async -> AccountEntity? {
        let accounts = AccountStorage.loadAccounts()
        return accounts.first ?? AccountEntity(
            id: "principal",
            name: "Cuenta Principal",
            balance: 0.0,
            currency: "USD",
            accountType: "corriente",
            colorHex: "#FE9D01"
        )
    }
}

// MARK: - App Group UserDefaults Storage

public enum AccountStorage {
    public static let appGroup = "group.com.ayeapps.ayefinance"
    public static let accountsKey = "ayefinance_accounts"
    public static let summaryKey = "ayefinance_summary"
    public static let tokenKey = "ayefinance_token"
    public static let apiUrlKey = "ayefinance_api_url"

    public static func getSharedDefaults() -> UserDefaults? {
        return UserDefaults(suiteName: appGroup)
    }

    public static func loadAccounts() -> [AccountEntity] {
        guard let defaults = getSharedDefaults() else { return [] }

        // 1. Stored as binary JSON Data
        if let data = defaults.data(forKey: accountsKey),
           let decoded = decodeAccounts(from: data) {
            return decoded
        }

        // 2. Stored as JSON String
        if let string = defaults.string(forKey: accountsKey),
           let data = string.data(using: .utf8),
           let decoded = decodeAccounts(from: data) {
            return decoded
        }

        // 3. Stored as Array of Dictionaries
        if let array = defaults.array(forKey: accountsKey) as? [[String: Any]] {
            return array.compactMap { parseAccount(from: $0) }
        }

        return []
    }

    private static func decodeAccounts(from data: Data) -> [AccountEntity]? {
        do {
            struct RawAccountItem: Decodable {
                let id: String
                let name: String
                let current_balance: FlexibleNumber?
                let balance: FlexibleNumber?
                let currency: String?
                let account_type: String?
                let color: String?
            }

            let rawAccounts = try JSONDecoder().decode([RawAccountItem].self, from: data)
            return rawAccounts.map { raw in
                let bal = raw.current_balance?.value ?? raw.balance?.value ?? 0.0
                return AccountEntity(
                    id: raw.id,
                    name: raw.name,
                    balance: bal,
                    currency: raw.currency ?? "USD",
                    accountType: raw.account_type ?? "corriente",
                    colorHex: raw.color ?? "#FE9D01"
                )
            }
        } catch {
            return nil
        }
    }

    private static func parseAccount(from dict: [String: Any]) -> AccountEntity? {
        guard let id = dict["id"] as? String,
              let name = dict["name"] as? String else {
            return nil
        }

        var balance: Double = 0.0
        if let num = dict["current_balance"] as? Double {
            balance = num
        } else if let num = dict["balance"] as? Double {
            balance = num
        } else if let str = dict["current_balance"] as? String, let num = Double(str) {
            balance = num
        } else if let str = dict["balance"] as? String, let num = Double(str) {
            balance = num
        }

        let currency = (dict["currency"] as? String) ?? "USD"
        let accountType = (dict["account_type"] as? String) ?? "corriente"
        let color = (dict["color"] as? String) ?? "#FE9D01"

        return AccountEntity(
            id: id,
            name: name,
            balance: balance,
            currency: currency,
            accountType: accountType,
            colorHex: color
        )
    }

    public static func loadSummaryDictionary() -> [String: Any]? {
        guard let defaults = getSharedDefaults() else { return nil }
        if let data = defaults.data(forKey: summaryKey),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            return json
        }
        if let dict = defaults.dictionary(forKey: summaryKey) {
            return dict
        }
        if let str = defaults.string(forKey: summaryKey),
           let data = str.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            return json
        }
        return nil
    }

    public static func loadMetrics(
        account: AccountEntity?,
        metric: WidgetMetricOption
    ) -> ComputedMetricResult {
        let accounts = loadAccounts()
        let summary = loadSummaryDictionary()

        // 1. Determine if Global or Specific Account
        let targetAccount: AccountEntity? = {
            guard let selected = account else { return nil }
            return accounts.first(where: { $0.id == selected.id }) ?? selected
        }()

        let isGlobal = (targetAccount == nil)
        let currency = targetAccount?.currency ?? accounts.first?.currency ?? "USD"

        // Default grand / liquid totals
        var grandTotal: Double = 0.0
        var liquidTotal: Double = 0.0
        var savingsTotal: Double = 0.0
        var todayExpenses: Double = 0.0
        var todayIncome: Double = 0.0
        var monthExpenses: Double = 0.0
        var monthIncome: Double = 0.0

        if let sum = summary {
            grandTotal = parseFlexibleDouble(sum["grand_total"])
            liquidTotal = parseFlexibleDouble(sum["liquid_total"])
            savingsTotal = parseFlexibleDouble(sum["savings_total"])
            todayExpenses = parseFlexibleDouble(sum["today_expenses"])
            todayIncome = parseFlexibleDouble(sum["today_income"])
            monthExpenses = parseFlexibleDouble(sum["month_expenses"])
            monthIncome = parseFlexibleDouble(sum["month_income"])
        }

        let computedGrand = accounts.reduce(0.0) { $0 + $1.balance }
        let computedLiquid = accounts.filter { $0.accountType == "corriente" }
            .reduce(0.0) { $0 + $1.balance }
        let computedSavings = accounts.filter { $0.accountType == "ahorro" || $0.accountType == "inversion" || $0.accountType == "plazo" }
            .reduce(0.0) { $0 + $1.balance }

        if grandTotal == 0.0 && computedGrand > 0 { grandTotal = computedGrand }
        if liquidTotal == 0.0 && computedLiquid > 0 { liquidTotal = computedLiquid }
        if savingsTotal == 0.0 && computedSavings > 0 { savingsTotal = computedSavings }

        // 2. Resolve per-account metrics if an account is selected
        var byAccountDict: [String: Any]? = nil
        if let sum = summary, let ba = sum["by_account"] as? [String: Any] {
            byAccountDict = ba
        }

        var accountTodayExpenses: Double = 0.0
        var accountTodayIncome: Double = 0.0
        var accountMonthExpenses: Double = 0.0
        var accountMonthIncome: Double = 0.0

        if let acc = targetAccount, let ba = byAccountDict, let accData = ba[acc.id] as? [String: Any] {
            accountTodayExpenses = parseFlexibleDouble(accData["today_expenses"])
            accountTodayIncome = parseFlexibleDouble(accData["today_income"])
            accountMonthExpenses = parseFlexibleDouble(accData["month_expenses"])
            accountMonthIncome = parseFlexibleDouble(accData["month_income"])
        }

        // 3. Compute Title, Subtitle, Value, Label, and Colors
        let headerTitle: String
        let headerBadge: String
        let metricLabel: String
        let value: Double
        let colorHex: String
        let isExpense: Bool
        let isIncome: Bool

        if let acc = targetAccount {
            headerTitle = acc.name
            headerBadge = acc.currency
            switch metric {
            case .saldo:
                value = acc.balance
                metricLabel = "SALDO ACTUAL"
                colorHex = acc.colorHex.isEmpty ? "#FE9D01" : acc.colorHex
                isExpense = false
                isIncome = false
            case .gastosHoy:
                value = accountTodayExpenses
                metricLabel = "GASTOS HOY"
                colorHex = "#EF4444"
                isExpense = true
                isIncome = false
            case .ingresosHoy:
                value = accountTodayIncome
                metricLabel = "INGRESOS HOY"
                colorHex = "#10B981"
                isExpense = false
                isIncome = true
            case .gastosMes:
                value = accountMonthExpenses
                metricLabel = "GASTOS MES"
                colorHex = "#EF4444"
                isExpense = true
                isIncome = false
            case .ingresosMes:
                value = accountMonthIncome
                metricLabel = "INGRESOS MES"
                colorHex = "#10B981"
                isExpense = false
                isIncome = true
            }
        } else {
            // Global Mode / Consolidated
            headerTitle = accounts.count == 1 ? (accounts.first?.name ?? "Todas las cuentas") : "Todas las cuentas"
            headerBadge = "GLOBAL"
            switch metric {
            case .saldo:
                value = grandTotal > 0 ? grandTotal : liquidTotal
                metricLabel = "SALDO CONSOLIDADO"
                colorHex = "#FE9D01" // Cyber-Amber
                isExpense = false
                isIncome = false
            case .gastosHoy:
                value = todayExpenses
                metricLabel = "GASTOS DE HOY"
                colorHex = "#EF4444"
                isExpense = true
                isIncome = false
            case .ingresosHoy:
                value = todayIncome
                metricLabel = "INGRESOS DE HOY"
                colorHex = "#10B981"
                isExpense = false
                isIncome = true
            case .gastosMes:
                value = monthExpenses
                metricLabel = "GASTOS DEL MES"
                colorHex = "#EF4444"
                isExpense = true
                isIncome = false
            case .ingresosMes:
                value = monthIncome
                metricLabel = "INGRESOS DEL MES"
                colorHex = "#10B981"
                isExpense = false
                isIncome = true
            }
        }

        let formattedValue = formatCurrency(value)

        return ComputedMetricResult(
            headerTitle: headerTitle,
            headerBadge: headerBadge,
            metricLabel: metricLabel,
            value: value,
            formattedValue: formattedValue,
            currency: currency,
            colorHex: colorHex,
            isExpense: isExpense,
            isIncome: isIncome,
            isGlobal: isGlobal,
            accountId: targetAccount?.id
        )
    }

    public static func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value)) ?? String(format: "$%.2f", value)
    }

    public static func parseFlexibleDouble(_ val: Any?) -> Double {
        guard let val = val else { return 0.0 }
        if let num = val as? NSNumber { return num.doubleValue }
        if let d = val as? Double { return d }
        if let i = val as? Int { return Double(i) }
        if let s = val as? String {
            let cleaned = s.replacingOccurrences(of: "$", with: "")
                           .replacingOccurrences(of: ",", with: "")
                           .trimmingCharacters(in: .whitespacesAndNewlines)
            return Double(cleaned) ?? 0.0
        }
        return 0.0
    }
}

// MARK: - Computed Metric Result Data

public struct ComputedMetricResult: Sendable {
    public let headerTitle: String
    public let headerBadge: String
    public let metricLabel: String
    public let value: Double
    public let formattedValue: String
    public let currency: String
    public let colorHex: String
    public let isExpense: Bool
    public let isIncome: Bool
    public let isGlobal: Bool
    public let accountId: String?
}

// MARK: - Widget Metric Option (AppEnum)

public enum WidgetMetricOption: String, AppEnum, Sendable {
    case saldo = "saldo"
    case gastosHoy = "gastos_hoy"
    case ingresosHoy = "ingresos_hoy"
    case gastosMes = "gastos_mes"
    case ingresosMes = "ingresos_mes"

    public static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Métrica Financiera")

    public static var caseDisplayRepresentations: [WidgetMetricOption: DisplayRepresentation] = [
        .saldo: DisplayRepresentation(
            title: "Saldo Actual",
            subtitle: "Balance disponible de la cuenta seleccionada o consolidado"
        ),
        .gastosHoy: DisplayRepresentation(
            title: "Gastos de Hoy",
            subtitle: "Total de dinero gastado durante el día de hoy"
        ),
        .ingresosHoy: DisplayRepresentation(
            title: "Ingresos de Hoy",
            subtitle: "Total de dinero percibido durante el día de hoy"
        ),
        .gastosMes: DisplayRepresentation(
            title: "Gastos del Mes",
            subtitle: "Suma acumulada de egresos del mes actual"
        ),
        .ingresosMes: DisplayRepresentation(
            title: "Ingresos del Mes",
            subtitle: "Suma acumulada de ingresos del mes actual"
        )
    ]
}

// MARK: - Widget Configuration Intent (WidgetConfigurationIntent)

public struct AyeFinanceConfigurationIntent: WidgetConfigurationIntent, Sendable {
    public static var title: LocalizedStringResource = "Personalizar Widget AyeFinance"
    public static var description = IntentDescription("Selecciona una cuenta o tarjeta específica (o Modo Global) y la métrica financiera a visualizar.")

    @Parameter(title: "Cuenta / Tarjeta", description: "Selecciona una cuenta o déjalo vacío para Modo Global", default: nil)
    public var account: AccountEntity?

    @Parameter(title: "Métrica", description: "La métrica a destacar en el widget", default: .saldo)
    public var metric: WidgetMetricOption

    public init() {
        self.account = nil
        self.metric = .saldo
    }

    public init(account: AccountEntity?, metric: WidgetMetricOption) {
        self.account = account
        self.metric = metric
    }
}

// MARK: - Helper for Flexible JSON Decoding

enum FlexibleNumber: Decodable {
    case double(Double)

    var value: Double {
        switch self {
        case .double(let d): return d
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let d = try? container.decode(Double.self) {
            self = .double(d)
        } else if let i = try? container.decode(Int.self) {
            self = .double(Double(i))
        } else if let s = try? container.decode(String.self), let d = Double(s) {
            self = .double(d)
        } else {
            self = .double(0.0)
        }
    }
}
