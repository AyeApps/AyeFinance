import WidgetKit
import SwiftUI
import AppIntents

// MARK: - AyeFinanceControl (iOS 18 Control Center)

@available(iOS 18.0, *)
public struct AyeFinanceControl: ControlWidget {
    public static let kind: String = "com.ayeapps.ayefinance.control.add"

    public init() {}

    public var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: Self.kind) {
            ControlWidgetButton(action: AddTransactionIntent()) {
                Label("Registrar Movimiento", systemImage: "plus.circle.fill")
            }
            .tint(Color(red: 254 / 255.0, green: 157 / 255.0, blue: 1 / 255.0)) // Cyber-Amber #FE9D01
        }
        .displayName("Añadir Movimiento")
        .description("Registra transacciones de forma instantánea en AyeFinance desde el Centro de Control.")
    }
}

// MARK: - Quick Expense Control Widget (iOS 18)

@available(iOS 18.0, *)
public struct AyeFinanceQuickExpenseControl: ControlWidget {
    public static let kind: String = "com.ayeapps.ayefinance.control.expense"

    public init() {}

    public var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: Self.kind) {
            ControlWidgetButton(
                action: AddTransactionIntent(
                    type: .gasto,
                    amount: 0.0,
                    concept: "",
                    account: AccountEntity(
                        id: "principal",
                        name: "Cuenta Principal",
                        balance: 0.0,
                        currency: "USD",
                        accountType: "corriente",
                        colorHex: "#FE9D01"
                    )
                )
            ) {
                Label("Nuevo Gasto", systemImage: "dollarsign.circle.fill")
            }
            .tint(Color(red: 254 / 255.0, green: 157 / 255.0, blue: 1 / 255.0)) // Cyber-Amber #FE9D01
        }
        .displayName("Nuevo Gasto Rápido")
        .description("Acceso directo para asentar gastos rápidos con un solo toque.")
    }
}
