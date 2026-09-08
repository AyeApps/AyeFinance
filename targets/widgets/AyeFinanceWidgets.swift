import WidgetKit
import SwiftUI

// MARK: - AyeFinanceWidgets WidgetBundle

@main
struct AyeFinanceWidgets: WidgetBundle {
    var body: some Widget {
        AyeFinanceWidget()

        if #available(iOS 18.0, *) {
            AyeFinanceControl()
            AyeFinanceQuickExpenseControl()
        }
    }
}
