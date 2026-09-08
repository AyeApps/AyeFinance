import AppIntents
import Foundation
import WidgetKit

// MARK: - MovementType Enum

public enum MovementType: String, AppEnum, Sendable {
    case gasto = "gasto"
    case ingreso = "ingreso"

    public static var typeDisplayRepresentation: TypeDisplayRepresentation = "Tipo de Movimiento"

    public static var caseDisplayRepresentations: [MovementType: DisplayRepresentation] = [
        .gasto: DisplayRepresentation(
            title: "Gasto",
            subtitle: "Egreso de fondos",
            image: .init(systemName: "arrow.up.right.circle.fill")
        ),
        .ingreso: DisplayRepresentation(
            title: "Ingreso",
            subtitle: "Entrada de capital",
            image: .init(systemName: "arrow.down.left.circle.fill")
        )
    ]
}

// MARK: - AddTransactionIntent

public struct AddTransactionIntent: AppIntent, Sendable {
    public static var title: LocalizedStringResource = "Registrar Movimiento"
    public static var description = IntentDescription("Registra un ingreso o gasto rápidamente en AyeFinance.")
    public static var openAppWhenRun: Bool = false

    @Parameter(title: "Tipo", default: .gasto)
    public var type: MovementType

    @Parameter(title: "Monto", default: 0.0)
    public var amount: Double

    @Parameter(title: "Nombre", default: "")
    public var concept: String

    @Parameter(title: "Cuenta")
    public var account: AccountEntity

    public init() {
        self.type = .gasto
        self.amount = 0.0
        self.concept = ""
        self.account = AccountEntity(
            id: "principal",
            name: "Cuenta Principal",
            balance: 0.0,
            currency: "USD",
            accountType: "corriente",
            colorHex: "#FE9D01"
        )
    }

    public init(type: MovementType, amount: Double, concept: String, account: AccountEntity) {
        self.type = type
        self.amount = amount
        self.concept = concept
        self.account = account
    }

    public func perform() async throws -> some IntentResult & ProvidesDialog {
        let appGroup = "group.com.ayeapps.ayefinance"
        let defaults = UserDefaults(suiteName: appGroup)

        // 1. Read token and API base URL from App Group
        let token = defaults?.string(forKey: "ayefinance_token")
            ?? defaults?.string(forKey: "ayefinance_access_token")
            ?? defaults?.string(forKey: "access_token")

        var baseURLString = defaults?.string(forKey: "ayefinance_api_url")
            ?? "https://api-ayfice.ayeapps.com/api/v1"

        if !baseURLString.hasSuffix("/api/v1") && !baseURLString.hasSuffix("/api/v1/") {
            if baseURLString.hasSuffix("/") {
                baseURLString += "api/v1"
            } else {
                baseURLString += "/api/v1"
            }
        }
        if baseURLString.hasSuffix("/") {
            baseURLString = String(baseURLString.dropLast())
        }

        let formattedAmount = String(format: "%.2f", amount)
        let safeConcept = concept.trimmingCharacters(in: .whitespacesAndNewlines)
        let conceptText = safeConcept.isEmpty ? (type == .gasto ? "Gasto rápido" : "Ingreso rápido") : safeConcept
        let encodedConcept = conceptText.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? conceptText
        let deepLinkString = "ayefinance://transaction/new?amount=\(formattedAmount)&concept=\(encodedConcept)&type=\(type.rawValue)&account=\(account.id)"

        // 2. Validate session token
        guard let validToken = token, !validToken.isEmpty else {
            // Token is missing: persist pending transaction & return actionable dialog
            savePendingTransaction(
                defaults: defaults,
                deepLink: deepLinkString,
                conceptText: conceptText,
                formattedAmount: formattedAmount
            )
            return .result(
                dialog: "Abre AyeFinance para confirmar tu movimiento de $\(formattedAmount) (sesión pendiente)."
            )
        }

        // 3. Make asynchronous URLSession POST to /api/v1/transactions/
        guard let url = URL(string: "\(baseURLString)/transactions/") else {
            savePendingTransaction(
                defaults: defaults,
                deepLink: deepLinkString,
                conceptText: conceptText,
                formattedAmount: formattedAmount
            )
            return .result(
                dialog: "Servidor no disponible. Movimiento de $\(formattedAmount) guardado en espera."
            )
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(validToken)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 8.0

        let payload: [String: Any] = [
            "account_id": account.id,
            "amount": amount,
            "type": type.rawValue,
            "concept": conceptText,
            "category": "General"
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
            let (_, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                savePendingTransaction(
                    defaults: defaults,
                    deepLink: deepLinkString,
                    conceptText: conceptText,
                    formattedAmount: formattedAmount
                )
                return .result(
                    dialog: "Sin respuesta de red. Movimiento de $\(formattedAmount) sincronizará al abrir la app."
                )
            }

            if (200...299).contains(httpResponse.statusCode) {
                // Success: update local cache balance for instant Widget reactivity
                updateLocalAccountBalance(defaults: defaults, accountId: account.id, amount: amount, type: type)
                return .result(
                    dialog: "Movimiento de $\(formattedAmount) registrado en \(account.name)"
                )
            } else {
                // Server returned non-2xx status code
                savePendingTransaction(
                    defaults: defaults,
                    deepLink: deepLinkString,
                    conceptText: conceptText,
                    formattedAmount: formattedAmount
                )
                return .result(
                    dialog: "Respuesta del servidor: \(httpResponse.statusCode). Abre la app para revisar el movimiento."
                )
            }
        } catch {
            // Network failure fallback
            savePendingTransaction(
                defaults: defaults,
                deepLink: deepLinkString,
                conceptText: conceptText,
                formattedAmount: formattedAmount
            )
            return .result(
                dialog: "Sin conexión. Movimiento de $\(formattedAmount) guardado para sincronizar."
            )
        }
    }

    private func savePendingTransaction(
        defaults: UserDefaults?,
        deepLink: String,
        conceptText: String,
        formattedAmount: String
    ) {
        guard let defaults = defaults else { return }
        defaults.set(deepLink, forKey: "ayefinance_last_deep_link")

        var pending = defaults.array(forKey: "ayefinance_pending_transactions") as? [[String: Any]] ?? []
        pending.append([
            "account_id": account.id,
            "account_name": account.name,
            "amount": amount,
            "type": type.rawValue,
            "concept": conceptText,
            "timestamp": Date().timeIntervalSince1970,
            "deep_link": deepLink
        ])
        defaults.set(pending, forKey: "ayefinance_pending_transactions")
    }

    private func updateLocalAccountBalance(
        defaults: UserDefaults?,
        accountId: String,
        amount: Double,
        type: MovementType
    ) {
        guard let defaults = defaults else { return }

        // Update summary grand_total
        if var summary = defaults.dictionary(forKey: "ayefinance_summary") {
            if let grandTotalStr = summary["grand_total"] as? String, var grandTotal = Double(grandTotalStr) {
                if type == .ingreso {
                    grandTotal += amount
                } else {
                    grandTotal -= amount
                }
                summary["grand_total"] = String(format: "%.2f", grandTotal)
                defaults.set(summary, forKey: "ayefinance_summary")
            }
        }

        // Notify WidgetKit to refresh timeline
        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
        #endif
    }
}
