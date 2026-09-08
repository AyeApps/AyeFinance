import Foundation
import WidgetKit

// MARK: - Pure Swift AyeFinance Backend API Client

public actor AyeFinanceAPI {
    public static let shared = AyeFinanceAPI()

    public var financeBaseURL: String = "https://api-ayfice.ayeapps.com/api/v1"
    public var authBaseURL: String = "https://api-auth.ayeapps.com/api/v1"

    private let appGroup = "group.com.ayeapps.ayefinance"

    public init() {
        if let defaults = UserDefaults(suiteName: "group.com.ayeapps.ayefinance") {
            if let customUrl = defaults.string(forKey: "ayefinance_api_url"), !customUrl.isEmpty {
                self.financeBaseURL = customUrl
            }
        }
    }

    public func setBaseURLs(finance: String, auth: String) {
        self.financeBaseURL = finance
        self.authBaseURL = auth
        if let defaults = UserDefaults(suiteName: appGroup) {
            defaults.set(finance, forKey: "ayefinance_api_url")
        }
    }

    // ── Authentication ──

    public func login(email: String, password: String) async throws -> (token: String, name: String) {
        guard let url = URL(string: "\(authBaseURL)/auth/login") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines),
            "password": password,
            "app_client": "finance"
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        guard http.statusCode == 200 else {
            let errorJson = (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
            let detail = errorJson["detail"] as? String ?? "Error al autenticar (\(http.statusCode))"
            throw NSError(domain: "AyeFinanceAuth", code: http.statusCode, userInfo: [NSLocalizedDescriptionKey: detail])
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let token = json["access_token"] as? String else {
            throw NSError(domain: "AyeFinanceAuth", code: -1, userInfo: [NSLocalizedDescriptionKey: "Formato de token inválido"])
        }

        var userName = "Usuario"
        if let userObj = json["user"] as? [String: Any], let name = userObj["name"] as? String {
            userName = name
        }

        // Save token to App Group
        if let defaults = UserDefaults(suiteName: appGroup) {
            defaults.set(token, forKey: "ayefinance_token")
            defaults.set(token, forKey: "ayefinance_access_token")
            defaults.set(userName, forKey: "ayefinance_user_name")
        }

        return (token, userName)
    }

    // ── Fetch Accounts ──

    public func fetchAccounts(token: String) async throws -> [AccountEntity] {
        guard let url = URL(string: "\(financeBaseURL)/accounts/") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw NSError(domain: "AyeFinanceAPI", code: 400, userInfo: [NSLocalizedDescriptionKey: "Error obteniendo cuentas"])
        }

        guard let rawArray = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return []
        }

        return rawArray.map { dict in
            let id = dict["id"] as? String ?? UUID().uuidString
            let name = dict["name"] as? String ?? "Cuenta"
            let bal: Double = {
                if let d = dict["current_balance"] as? Double { return d }
                if let s = dict["current_balance"] as? String, let num = Double(s) { return num }
                return 0.0
            }()
            let currency = dict["currency"] as? String ?? "USD"
            let type = dict["account_type"] as? String ?? "corriente"
            let color = dict["color"] as? String ?? "#FE9D01"

            return AccountEntity(
                id: id,
                name: name,
                balance: bal,
                currency: currency,
                accountType: type,
                colorHex: color
            )
        }
    }

    // ── Fetch Transactions & Compute Metrics ──

    public func fetchTransactions(token: String) async throws -> [[String: Any]] {
        guard let url = URL(string: "\(financeBaseURL)/transactions/?limit=100") else {
            return []
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            return []
        }

        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let items = json["items"] as? [[String: Any]] {
            return items
        } else if let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            return array
        }
        return []
    }

    // ── Fetch Summary from Backend ──

    public func fetchSummary(token: String) async throws -> [String: Any]? {
        guard let url = URL(string: "\(financeBaseURL)/accounts/summary") else {
            return nil
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            return nil
        }

        return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    }

    // ── Synchronize All to App Group ──

    @discardableResult
    public func syncAllToAppGroup(token: String) async throws -> (accountCount: Int, grandTotal: String) {
        let accounts = try await fetchAccounts(token: token)
        let transactions = try await fetchTransactions(token: token)
        let backendSummary = try? await fetchSummary(token: token)

        let calendar = Calendar.current
        let today = Date()

        var todayExpenses = 0.0
        var todayIncome = 0.0
        var monthExpenses = 0.0
        var monthIncome = 0.0

        struct AccMetrics {
            var balance: Double
            var todayExpenses: Double = 0.0
            var todayIncome: Double = 0.0
            var monthExpenses: Double = 0.0
            var monthIncome: Double = 0.0
        }

        var byAccount: [String: AccMetrics] = [:]
        for acc in accounts {
            byAccount[acc.id] = AccMetrics(balance: acc.balance)
        }

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        for tx in transactions {
            let amountVal: Double = {
                if let d = tx["amount"] as? Double { return d }
                if let s = tx["amount"] as? String, let num = Double(s) { return num }
                return 0.0
            }()
            let type = tx["type"] as? String ?? ""
            let accId = tx["account_id"] as? String ?? ""

            var txDate: Date? = nil
            if let dateStr = tx["date"] as? String {
                txDate = isoFormatter.date(from: dateStr) ?? ISO8601DateFormatter().date(from: dateStr)
            }

            let isToday = txDate != nil && calendar.isDate(txDate!, inSameDayAs: today)
            let isCurrentMonth = txDate != nil && calendar.isDate(txDate!, equalTo: today, toGranularity: .month)

            if type == "gasto" {
                if isToday { todayExpenses += amountVal }
                if isCurrentMonth { monthExpenses += amountVal }
                if var accM = byAccount[accId] {
                    if isToday { accM.todayExpenses += amountVal }
                    if isCurrentMonth { accM.monthExpenses += amountVal }
                    byAccount[accId] = accM
                }
            } else if type == "ingreso" {
                if isToday { todayIncome += amountVal }
                if isCurrentMonth { monthIncome += amountVal }
                if var accM = byAccount[accId] {
                    if isToday { accM.todayIncome += amountVal }
                    if isCurrentMonth { accM.monthIncome += amountVal }
                    byAccount[accId] = accM
                }
            }
        }

        let grandTotalNum = accounts.reduce(0.0) { $0 + $1.balance }
        let liquidTotalNum = accounts.filter { $0.accountType == "corriente" }
            .reduce(0.0) { $0 + $1.balance }
        let savingsTotalNum = accounts.filter { $0.accountType == "ahorro" || $0.accountType == "inversion" || $0.accountType == "plazo" }
            .reduce(0.0) { $0 + $1.balance }

        var byAccountDict: [String: Any] = [:]
        for (id, m) in byAccount {
            byAccountDict[id] = [
                "balance": m.balance,
                "today_expenses": m.todayExpenses,
                "today_income": m.todayIncome,
                "month_expenses": m.monthExpenses,
                "month_income": m.monthIncome
            ]
        }

        var finalGrandTotal = grandTotalNum
        var finalLiquidTotal = liquidTotalNum
        var finalSavingsTotal = savingsTotalNum
        var finalTodayExpenses = todayExpenses
        var finalTodayIncome = todayIncome
        var finalMonthExpenses = monthExpenses
        var finalMonthIncome = monthIncome
        var finalByAccount = byAccountDict

        if let bSum = backendSummary {
            let bg = AccountStorage.parseFlexibleDouble(bSum["grand_total"])
            if bg > 0 { finalGrandTotal = bg }

            let bl = AccountStorage.parseFlexibleDouble(bSum["liquid_total"])
            if bl > 0 { finalLiquidTotal = bl }

            let bs = AccountStorage.parseFlexibleDouble(bSum["savings_total"])
            if bs > 0 { finalSavingsTotal = bs }

            finalTodayExpenses = AccountStorage.parseFlexibleDouble(bSum["today_expenses"])
            finalTodayIncome = AccountStorage.parseFlexibleDouble(bSum["today_income"])
            finalMonthExpenses = AccountStorage.parseFlexibleDouble(bSum["month_expenses"])
            finalMonthIncome = AccountStorage.parseFlexibleDouble(bSum["month_income"])

            if let ba = bSum["by_account"] as? [String: Any], !ba.isEmpty {
                finalByAccount = ba
            }
        }

        if finalSavingsTotal == 0.0 && savingsTotalNum > 0.0 {
            finalSavingsTotal = savingsTotalNum
        }
        if finalLiquidTotal == 0.0 && liquidTotalNum > 0.0 {
            finalLiquidTotal = liquidTotalNum
        }
        if finalGrandTotal == 0.0 && grandTotalNum > 0.0 {
            finalGrandTotal = grandTotalNum
        }

        let summaryPayload: [String: Any] = [
            "grand_total": String(format: "$%.2f", finalGrandTotal),
            "liquid_total": String(format: "$%.2f", finalLiquidTotal),
            "savings_total": String(format: "$%.2f", finalSavingsTotal),
            "today_expenses": finalTodayExpenses,
            "today_income": finalTodayIncome,
            "month_expenses": finalMonthExpenses,
            "month_income": finalMonthIncome,
            "by_account": finalByAccount,
            "updated_at": ISO8601DateFormatter().string(from: Date())
        ]

        // Serialize and save to App Group
        guard let defaults = UserDefaults(suiteName: appGroup) else {
            throw NSError(domain: "AyeFinanceStorage", code: -1, userInfo: [NSLocalizedDescriptionKey: "No se pudo acceder a App Group"])
        }

        // 1. Accounts JSON
        let accountsPayload: [[String: Any]] = accounts.map { acc in
            [
                "id": acc.id,
                "name": acc.name,
                "current_balance": acc.balance,
                "currency": acc.currency,
                "account_type": acc.accountType,
                "color": acc.colorHex
            ]
        }
        if let accData = try? JSONSerialization.data(withJSONObject: accountsPayload) {
            defaults.set(accData, forKey: "ayefinance_accounts")
        }

        // 2. Summary JSON
        if let sumData = try? JSONSerialization.data(withJSONObject: summaryPayload) {
            defaults.set(sumData, forKey: "ayefinance_summary")
        }

        defaults.set(token, forKey: "ayefinance_token")
        defaults.synchronize()

        // 3. Reload WidgetKit timelines immediately!
        WidgetCenter.shared.reloadAllTimelines()

        return (accounts.count, String(format: "$%.2f", finalGrandTotal))
    }

    // ── Create Transaction directly from Swift ──

    public func createTransaction(
        token: String,
        type: String,
        amount: Double,
        concept: String,
        accountId: String?
    ) async throws -> Bool {
        guard let url = URL(string: "\(financeBaseURL)/transactions/") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = [
            "type": type,
            "amount": amount,
            "concept": concept.isEmpty ? (type == "gasto" ? "Gasto rápido" : "Ingreso rápido") : concept,
            "category": "General"
        ]
        if let accId = accountId, !accId.isEmpty {
            body["account_id"] = accId
        }

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 201 || http.statusCode == 200 else {
            return false
        }

        // Refresh sync after creating transaction
        try? await syncAllToAppGroup(token: token)
        return true
    }

    // ── Seed Mock Data for Offline Testing ──

    public func seedMockData() {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }

        let sampleAccounts: [[String: Any]] = [
            ["id": "1", "name": "BBVA Nómina", "current_balance": 6250.0, "currency": "USD", "account_type": "corriente", "color": "#FE9D01"],
            ["id": "2", "name": "Caja Ahorro", "current_balance": 5200.0, "currency": "USD", "account_type": "ahorro", "color": "#10B981"],
            ["id": "3", "name": "Santander Flex", "current_balance": 3400.0, "currency": "USD", "account_type": "corriente", "color": "#3B82F6"]
        ]

        let summaryPayload: [String: Any] = [
            "grand_total": "$14,850.00",
            "liquid_total": "$9,650.00",
            "savings_total": "$5,200.00",
            "today_expenses": 65.50,
            "today_income": 120.00,
            "month_expenses": 1420.00,
            "month_income": 4500.00,
            "by_account": [
                "1": ["balance": 6250.0, "today_expenses": 45.0, "today_income": 0.0, "month_expenses": 850.0, "month_income": 3000.0],
                "2": ["balance": 5200.0, "today_expenses": 0.0, "today_income": 120.0, "month_expenses": 0.0, "month_income": 1500.0],
                "3": ["balance": 3400.0, "today_expenses": 20.5, "today_income": 0.0, "month_expenses": 570.0, "month_income": 0.0]
            ],
            "updated_at": ISO8601DateFormatter().string(from: Date())
        ]

        if let d = try? JSONSerialization.data(withJSONObject: sampleAccounts) {
            defaults.set(d, forKey: "ayefinance_accounts")
        }
        if let s = try? JSONSerialization.data(withJSONObject: summaryPayload) {
            defaults.set(s, forKey: "ayefinance_summary")
        }
        defaults.set("mock_token", forKey: "ayefinance_token")
        defaults.synchronize()
        WidgetCenter.shared.reloadAllTimelines()
    }

    // ── Simulate Local Transaction for Offline Mock Testing ──

    public func simulateLocalTransaction(type: String, amount: Double, concept: String, accountId: String?) {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }
        let accounts = AccountStorage.loadAccounts()
        guard !accounts.isEmpty else { return }

        let targetId = accountId ?? accounts.first?.id ?? ""
        var updatedAccounts: [AccountEntity] = []

        for var acc in accounts {
            if acc.id == targetId {
                if type == "gasto" {
                    acc.balance -= amount
                } else {
                    acc.balance += amount
                }
            }
            updatedAccounts.append(acc)
        }

        let accountsPayload: [[String: Any]] = updatedAccounts.map { acc in
            [
                "id": acc.id,
                "name": acc.name,
                "current_balance": acc.balance,
                "currency": acc.currency,
                "account_type": acc.accountType,
                "color": acc.colorHex
            ]
        }
        if let d = try? JSONSerialization.data(withJSONObject: accountsPayload) {
            defaults.set(d, forKey: "ayefinance_accounts")
        }

        var summary = AccountStorage.loadSummaryDictionary() ?? [:]
        var todayExp = (summary["today_expenses"] as? Double) ?? 0.0
        var todayInc = (summary["today_income"] as? Double) ?? 0.0
        var monthExp = (summary["month_expenses"] as? Double) ?? 0.0
        var monthInc = (summary["month_income"] as? Double) ?? 0.0

        if type == "gasto" {
            todayExp += amount
            monthExp += amount
        } else {
            todayInc += amount
            monthInc += amount
        }

        let newGrandTotal = updatedAccounts.reduce(0.0) { $0 + $1.balance }
        let newLiquidTotal = updatedAccounts.filter { $0.accountType == "corriente" }
            .reduce(0.0) { $0 + $1.balance }
        let newSavingsTotal = updatedAccounts.filter { $0.accountType == "ahorro" || $0.accountType == "inversion" }
            .reduce(0.0) { $0 + $1.balance }

        var byAccount = (summary["by_account"] as? [String: Any]) ?? [:]
        var accData = (byAccount[targetId] as? [String: Any]) ?? [:]
        var accTodayExp = (accData["today_expenses"] as? Double) ?? 0.0
        var accTodayInc = (accData["today_income"] as? Double) ?? 0.0
        var accMonthExp = (accData["month_expenses"] as? Double) ?? 0.0
        var accMonthInc = (accData["month_income"] as? Double) ?? 0.0

        if type == "gasto" {
            accTodayExp += amount
            accMonthExp += amount
        } else {
            accTodayInc += amount
            accMonthInc += amount
        }

        byAccount[targetId] = [
            "balance": updatedAccounts.first(where: { $0.id == targetId })?.balance ?? 0.0,
            "today_expenses": accTodayExp,
            "today_income": accTodayInc,
            "month_expenses": accMonthExp,
            "month_income": accMonthInc
        ]

        summary["grand_total"] = AccountStorage.formatCurrency(newGrandTotal)
        summary["liquid_total"] = AccountStorage.formatCurrency(newLiquidTotal)
        summary["savings_total"] = AccountStorage.formatCurrency(newSavingsTotal)
        summary["today_expenses"] = todayExp
        summary["today_income"] = todayInc
        summary["month_expenses"] = monthExp
        summary["month_income"] = monthInc
        summary["by_account"] = byAccount
        summary["updated_at"] = ISO8601DateFormatter().string(from: Date())

        if let s = try? JSONSerialization.data(withJSONObject: summary) {
            defaults.set(s, forKey: "ayefinance_summary")
        }
        defaults.synchronize()

        WidgetCenter.shared.reloadAllTimelines()
    }
}
