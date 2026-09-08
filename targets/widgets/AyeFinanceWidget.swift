@preconcurrency import WidgetKit
import SwiftUI
import AppIntents

// MARK: - AyeTheme Custom Tint Environment Key

private struct AyeTintKey: EnvironmentKey {
    static let defaultValue: Color? = nil
}

extension EnvironmentValues {
    public var ayeTint: Color? {
        get { self[AyeTintKey.self] }
        set { self[AyeTintKey.self] = newValue }
    }
}

// MARK: - Widget Timeline Entry

public struct AyeFinanceWidgetEntry: TimelineEntry, Sendable {
    public let date: Date
    public let configuration: AyeFinanceConfigurationIntent
    public let metricResult: ComputedMetricResult
    public let grandTotal: String
    public let liquidTotal: String
    public let savingsTotal: String
    public let todayExpenses: String
    public let monthExpenses: String
    public let accounts: [AccountEntity]
    public let isConnected: Bool

    public init(
        date: Date,
        configuration: AyeFinanceConfigurationIntent,
        metricResult: ComputedMetricResult,
        grandTotal: String,
        liquidTotal: String,
        savingsTotal: String,
        todayExpenses: String = "$0.00",
        monthExpenses: String = "$0.00",
        accounts: [AccountEntity],
        isConnected: Bool
    ) {
        self.date = date
        self.configuration = configuration
        self.metricResult = metricResult
        self.grandTotal = grandTotal
        self.liquidTotal = liquidTotal
        self.savingsTotal = savingsTotal
        self.todayExpenses = todayExpenses
        self.monthExpenses = monthExpenses
        self.accounts = accounts
        self.isConnected = isConnected
    }

    public static var sample: AyeFinanceWidgetEntry {
        let sampleAccounts = [
            AccountEntity(
                id: "1",
                name: "BBVA Nómina",
                balance: 6250.0,
                currency: "USD",
                accountType: "corriente",
                colorHex: "#FE9D01"
            ),
            AccountEntity(
                id: "2",
                name: "Caja Ahorro",
                balance: 5200.0,
                currency: "USD",
                accountType: "ahorro",
                colorHex: "#10B981"
            ),
            AccountEntity(
                id: "3",
                name: "Santander Flex",
                balance: 3400.0,
                currency: "USD",
                accountType: "corriente",
                colorHex: "#3B82F6"
            )
        ]

        let sampleMetric = ComputedMetricResult(
            headerTitle: "BBVA Nómina",
            headerBadge: "USD",
            metricLabel: "SALDO ACTUAL",
            value: 6250.0,
            formattedValue: "$6,250.00",
            currency: "USD",
            colorHex: "#FE9D01",
            isExpense: false,
            isIncome: false,
            isGlobal: false,
            accountId: "1"
        )

        return AyeFinanceWidgetEntry(
            date: Date(),
            configuration: AyeFinanceConfigurationIntent(),
            metricResult: sampleMetric,
            grandTotal: "$14,850.00",
            liquidTotal: "$9,650.00",
            savingsTotal: "$5,200.00",
            todayExpenses: "$45.00",
            monthExpenses: "$850.00",
            accounts: sampleAccounts,
            isConnected: true
        )
    }
}

// MARK: - Widget Timeline Provider (AppIntentTimelineProvider)

public struct AyeFinanceAppIntentTimelineProvider: AppIntentTimelineProvider {
    public typealias Entry = AyeFinanceWidgetEntry
    public typealias Intent = AyeFinanceConfigurationIntent

    public init() {}

    public func placeholder(in context: Context) -> AyeFinanceWidgetEntry {
        AyeFinanceWidgetEntry.sample
    }

    public func snapshot(for configuration: AyeFinanceConfigurationIntent, in context: Context) async -> AyeFinanceWidgetEntry {
        loadData(for: configuration)
    }

    public func timeline(for configuration: AyeFinanceConfigurationIntent, in context: Context) async -> Timeline<AyeFinanceWidgetEntry> {
        let entry = loadData(for: configuration)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func loadData(for configuration: AyeFinanceConfigurationIntent) -> AyeFinanceWidgetEntry {
        let accounts = AccountStorage.loadAccounts()
        let metricResult = AccountStorage.loadMetrics(account: configuration.account, metric: configuration.metric)
        let defaults = UserDefaults(suiteName: "group.com.ayeapps.ayefinance")
        let hasToken = defaults?.string(forKey: "ayefinance_token") != nil
            || defaults?.string(forKey: "ayefinance_access_token") != nil

        var grandTotal = "$0.00"
        var liquidTotal = "$0.00"
        var savingsTotal = "$0.00"
        var todayExpenses = "$0.00"
        var monthExpenses = "$0.00"

        if let summary = AccountStorage.loadSummaryDictionary() {
            if let gt = summary["grand_total"] as? String {
                grandTotal = formatCurrencyString(gt)
            } else if let gt = summary["grand_total"] as? Double {
                grandTotal = String(format: "$%.2f", gt)
            }

            if let lt = summary["liquid_total"] as? String {
                liquidTotal = formatCurrencyString(lt)
            } else if let lt = summary["liquid_total"] as? Double {
                liquidTotal = String(format: "$%.2f", lt)
            }

            if let st = summary["savings_total"] as? String {
                savingsTotal = formatCurrencyString(st)
            } else if let st = summary["savings_total"] as? Double {
                savingsTotal = String(format: "$%.2f", st)
            }

            if let targetId = metricResult.accountId,
               let byAccount = summary["by_account"] as? [String: Any],
               let accData = byAccount[targetId] as? [String: Any] {
                let te = AccountStorage.parseFlexibleDouble(accData["today_expenses"])
                let me = AccountStorage.parseFlexibleDouble(accData["month_expenses"])
                todayExpenses = String(format: "$%.2f", te)
                monthExpenses = String(format: "$%.2f", me)
            } else {
                let te = AccountStorage.parseFlexibleDouble(summary["today_expenses"])
                let me = AccountStorage.parseFlexibleDouble(summary["month_expenses"])
                todayExpenses = String(format: "$%.2f", te)
                monthExpenses = String(format: "$%.2f", me)
            }
        }

        if !accounts.isEmpty {
            let computedGrand = accounts.reduce(0.0) { $0 + $1.balance }
            let computedLiquid = accounts.filter { $0.accountType == "corriente" }
                .reduce(0.0) { $0 + $1.balance }
            let computedSavings = accounts.filter { $0.accountType == "ahorro" || $0.accountType == "inversion" || $0.accountType == "plazo" }
                .reduce(0.0) { $0 + $1.balance }

            if grandTotal == "$0.00" && computedGrand > 0 {
                grandTotal = String(format: "$%.2f", computedGrand)
            }
            if liquidTotal == "$0.00" && computedLiquid > 0 {
                liquidTotal = String(format: "$%.2f", computedLiquid)
            }
            if savingsTotal == "$0.00" && computedSavings > 0 {
                savingsTotal = String(format: "$%.2f", computedSavings)
            }
        }

        return AyeFinanceWidgetEntry(
            date: Date(),
            configuration: configuration,
            metricResult: metricResult,
            grandTotal: grandTotal,
            liquidTotal: liquidTotal,
            savingsTotal: savingsTotal,
            todayExpenses: todayExpenses,
            monthExpenses: monthExpenses,
            accounts: accounts,
            isConnected: hasToken || !accounts.isEmpty
        )
    }

    private func formatCurrencyString(_ raw: String) -> String {
        if raw.starts(with: "$") { return raw }
        if let num = Double(raw) {
            return String(format: "$%.2f", num)
        }
        return "$\(raw)"
    }
}

// MARK: - AyeTheme System (Adaptive Light, Dark, Tinted & Clear)

public struct AyeTheme {
    public let colorScheme: ColorScheme
    public let renderingMode: WidgetRenderingMode
    public let customTint: Color?

    public init(colorScheme: ColorScheme, renderingMode: WidgetRenderingMode = .fullColor, customTint: Color? = nil) {
        self.colorScheme = colorScheme
        self.renderingMode = renderingMode
        self.customTint = customTint
    }

    public var isDark: Bool { colorScheme == .dark }
    public var isTinted: Bool { renderingMode == .accented }
    public var isVibrant: Bool { renderingMode == .vibrant }

    // Background Canvas
    public var background: Color {
        if isVibrant { return .clear }
        if isTinted { return Color(red: 5 / 255.0, green: 5 / 255.0, blue: 5 / 255.0) }
        return isDark ? Color(red: 5 / 255.0, green: 5 / 255.0, blue: 5 / 255.0)
                      : Color(red: 247 / 255.0, green: 248 / 255.0, blue: 250 / 255.0)
    }

    // Raised Surface (Cards, Panels)
    public var surface: Color {
        if isVibrant { return Color.white.opacity(0.08) }
        if isTinted { return Color.white.opacity(0.08) }
        return isDark ? Color(red: 13 / 255.0, green: 13 / 255.0, blue: 13 / 255.0)
                      : Color.white
    }

    // Secondary Surface (Inner rows, pills)
    public var surfaceSecondary: Color {
        if isVibrant { return Color.white.opacity(0.05) }
        if isTinted { return Color.white.opacity(0.05) }
        return isDark ? Color.white.opacity(0.05)
                      : Color(red: 241 / 255.0, green: 243 / 255.0, blue: 247 / 255.0)
    }

    // Borders
    public var border: Color {
        if isVibrant { return Color.white.opacity(0.18) }
        if isTinted { return (customTint ?? Color.white).opacity(0.16) }
        return isDark ? Color.white.opacity(0.10)
                      : Color.black.opacity(0.08)
    }

    // Typography
    public var textPrimary: Color {
        if isVibrant { return .white }
        if isTinted { return .white }
        return isDark ? .white : Color(red: 15 / 255.0, green: 23 / 255.0, blue: 42 / 255.0)
    }

    public var textSecondary: Color {
        if isVibrant { return Color.white.opacity(0.65) }
        if isTinted { return Color.white.opacity(0.65) }
        return isDark ? Color(white: 0.55) : Color(red: 100 / 255.0, green: 116 / 255.0, blue: 139 / 255.0)
    }

    // Brand Accents
    public var amber: Color {
        if isVibrant { return .white }
        if isTinted { return customTint ?? Color(red: 254 / 255.0, green: 157 / 255.0, blue: 1 / 255.0) }
        return isDark ? Color(red: 254 / 255.0, green: 157 / 255.0, blue: 1 / 255.0)
                      : Color(red: 217 / 255.0, green: 119 / 255.0, blue: 6 / 255.0)
    }

    public var green: Color {
        if isVibrant { return .white }
        if isTinted { return customTint ?? Color(red: 16 / 255.0, green: 185 / 255.0, blue: 129 / 255.0) }
        return isDark ? Color(red: 16 / 255.0, green: 185 / 255.0, blue: 129 / 255.0)
                      : Color(red: 5 / 255.0, green: 150 / 255.0, blue: 105 / 255.0)
    }

    public var red: Color {
        if isVibrant { return .white }
        if isTinted { return customTint ?? Color(red: 239 / 255.0, green: 68 / 255.0, blue: 68 / 255.0) }
        return isDark ? Color(red: 239 / 255.0, green: 68 / 255.0, blue: 68 / 255.0)
                      : Color(red: 220 / 255.0, green: 38 / 255.0, blue: 38 / 255.0)
    }

    public func resolveAccent(hex: String, isExpense: Bool, isIncome: Bool) -> Color {
        if isVibrant { return .white }
        if isTinted { return customTint ?? amber }
        if isExpense { return red }
        if isIncome { return green }
        if hex.uppercased() == "#FE9D01" { return amber }
        return Color(hex: hex)
    }

    public static func resolve(colorScheme: ColorScheme, renderingMode: WidgetRenderingMode = .fullColor, customTint: Color? = nil) -> AyeTheme {
        AyeTheme(colorScheme: colorScheme, renderingMode: renderingMode, customTint: customTint)
    }
}

public enum AyeTokens {
    public static let amber = Color(red: 254 / 255.0, green: 157 / 255.0, blue: 1 / 255.0)
    public static let amberSubtle = Color(red: 254 / 255.0, green: 157 / 255.0, blue: 1 / 255.0).opacity(0.15)
    public static let obsidian = Color(red: 5 / 255.0, green: 5 / 255.0, blue: 5 / 255.0)
    public static let surfaceRaised = Color(red: 13 / 255.0, green: 13 / 255.0, blue: 13 / 255.0)
    public static let border = Color.white.opacity(0.10)
    public static let green = Color(red: 16 / 255.0, green: 185 / 255.0, blue: 129 / 255.0)
    public static let red = Color(red: 239 / 255.0, green: 68 / 255.0, blue: 68 / 255.0)
    public static let textSecondary = Color(white: 0.55)
}

// MARK: - Interactive Widget Views

public struct AyeFinanceWidgetEntryView: View {
    var entry: AyeFinanceWidgetEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.widgetRenderingMode) var renderingMode
    @Environment(\.ayeTint) var ayeTint: Color?

    public var body: some View {
        let theme = AyeTheme.resolve(colorScheme: colorScheme, renderingMode: renderingMode, customTint: ayeTint)

        Group {
            switch family {
            case .systemSmall:
                SmallWidgetView(entry: entry)
            case .systemMedium:
                MediumWidgetView(entry: entry)
            case .systemLarge:
                LargeWidgetView(entry: entry)
            default:
                MediumWidgetView(entry: entry)
            }
        }
        .applyContainerBackground(theme.background)
    }
}

// MARK: - Small Widget (Centered Hero Amount & Metric Title)

struct SmallWidgetView: View {
    let entry: AyeFinanceWidgetEntry
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.widgetRenderingMode) var renderingMode
    @Environment(\.ayeTint) var ayeTint: Color?

    var body: some View {
        let theme = AyeTheme.resolve(colorScheme: colorScheme, renderingMode: renderingMode, customTint: ayeTint)
        let metric = entry.metricResult
        let accentColor = theme.resolveAccent(hex: metric.colorHex, isExpense: metric.isExpense, isIncome: metric.isIncome)

        VStack(alignment: .leading, spacing: 0) {
            // ── Top Row: Metric Label as Title (Clean & Uncluttered) ──
            HStack(alignment: .center, spacing: 5) {
                if metric.isExpense {
                    Image(systemName: "arrow.down.right")
                        .font(.system(size: 8.5, weight: .black))
                        .foregroundColor(accentColor)
                        .widgetAccentable()
                } else if metric.isIncome {
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 8.5, weight: .black))
                        .foregroundColor(accentColor)
                        .widgetAccentable()
                } else {
                    Circle()
                        .fill(accentColor)
                        .frame(width: 6, height: 6)
                        .widgetAccentable()
                }

                Text(metric.metricLabel)
                    .font(.system(size: 9, weight: .black, design: .monospaced))
                    .foregroundColor(metric.isExpense || metric.isIncome ? accentColor : theme.amber)
                    .tracking(0.5)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .widgetAccentable()

                Spacer()
            }

            Spacer(minLength: 4)

            // ── Center Block: Account Name above Centered Hero Amount ──
            VStack(alignment: .center, spacing: 2) {
                HStack(spacing: 4) {
                    if !metric.isGlobal {
                        Circle()
                            .fill(accentColor)
                            .frame(width: 5, height: 5)
                            .widgetAccentable()
                    }
                    Text(metric.headerTitle)
                        .font(.system(size: 10, weight: .semibold, design: .default))
                        .foregroundColor(theme.textSecondary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .center)

                Text(metric.formattedValue)
                    .font(.system(size: 25, weight: .black, design: .rounded))
                    .foregroundColor(metric.isExpense || metric.isIncome ? accentColor : theme.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.55)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .widgetAccentable()
            }

            Spacer(minLength: 6)

            // ── Contextual Action / Navigation Row ──
            if let accountId = metric.accountId {
                Link(destination: URL(string: "ayefinance://transaction/new?account=\(accountId)&type=\(metric.isExpense ? "gasto" : (metric.isIncome ? "ingreso" : "gasto"))")!) {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.system(size: 9, weight: .bold))
                            .widgetAccentable()
                        Text(metric.isExpense ? "Nuevo Gasto" : (metric.isIncome ? "Nuevo Ingreso" : "Movimiento"))
                            .font(.system(size: 9.5, weight: .bold))
                            .widgetAccentable()
                    }
                    .foregroundColor(accentColor)
                    .frame(maxWidth: .infinity)
                    .frame(height: 24)
                    .background(accentColor.opacity(theme.isDark ? 0.14 : 0.09))
                    .cornerRadius(6)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(accentColor.opacity(theme.isDark ? 0.3 : 0.22), lineWidth: 0.5)
                    )
                }
            } else {
                HStack(spacing: 5) {
                    Link(destination: URL(string: "ayefinance://transaction/new?type=gasto")!) {
                        HStack(spacing: 2) {
                            Image(systemName: "arrow.down.right")
                                .font(.system(size: 8, weight: .black))
                                .widgetAccentable()
                            Text("Gasto")
                                .font(.system(size: 9, weight: .bold))
                                .widgetAccentable()
                        }
                        .foregroundColor(theme.red)
                        .frame(maxWidth: .infinity)
                        .frame(height: 24)
                        .background(theme.red.opacity(theme.isDark ? 0.12 : 0.08))
                        .cornerRadius(6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(theme.red.opacity(theme.isDark ? 0.25 : 0.20), lineWidth: 0.5)
                        )
                    }

                    Link(destination: URL(string: "ayefinance://transaction/new?type=ingreso")!) {
                        HStack(spacing: 2) {
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 8, weight: .black))
                                .widgetAccentable()
                            Text("Ingreso")
                                .font(.system(size: 9, weight: .bold))
                                .widgetAccentable()
                        }
                        .foregroundColor(theme.green)
                        .frame(maxWidth: .infinity)
                        .frame(height: 24)
                        .background(theme.green.opacity(theme.isDark ? 0.12 : 0.08))
                        .cornerRadius(6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(theme.green.opacity(theme.isDark ? 0.25 : 0.20), lineWidth: 0.5)
                        )
                    }
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
    }
}

// MARK: - Medium Widget (Balanced Hero & Contextual Stats)

struct MediumWidgetView: View {
    let entry: AyeFinanceWidgetEntry
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.widgetRenderingMode) var renderingMode
    @Environment(\.ayeTint) var ayeTint: Color?

    var body: some View {
        let theme = AyeTheme.resolve(colorScheme: colorScheme, renderingMode: renderingMode, customTint: ayeTint)
        let metric = entry.metricResult
        let accentColor = theme.resolveAccent(hex: metric.colorHex, isExpense: metric.isExpense, isIncome: metric.isIncome)

        VStack(alignment: .leading, spacing: 0) {
            // ── Top Row: Metric Label as Title (Matches Small) ──
            HStack(alignment: .center, spacing: 5) {
                if metric.isExpense {
                    Image(systemName: "arrow.down.right")
                        .font(.system(size: 8.5, weight: .black))
                        .foregroundColor(accentColor)
                        .widgetAccentable()
                } else if metric.isIncome {
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 8.5, weight: .black))
                        .foregroundColor(accentColor)
                        .widgetAccentable()
                } else {
                    Circle()
                        .fill(accentColor)
                        .frame(width: 6, height: 6)
                        .widgetAccentable()
                }

                Text(metric.metricLabel)
                    .font(.system(size: 9.5, weight: .black, design: .monospaced))
                    .foregroundColor(metric.isExpense || metric.isIncome ? accentColor : theme.amber)
                    .tracking(0.5)
                    .lineLimit(1)
                    .widgetAccentable()

                Spacer()

                if metric.isGlobal {
                    Text("\(entry.accounts.count) cuentas")
                        .font(.system(size: 8.5, weight: .semibold, design: .monospaced))
                        .foregroundColor(theme.textSecondary)
                } else {
                    Text(metric.currency)
                        .font(.system(size: 8.5, weight: .semibold, design: .monospaced))
                        .foregroundColor(theme.textSecondary)
                }
            }

            Spacer(minLength: 6)

            // ── Center Content: Hero Block & Secondary Stats ──
            HStack(alignment: .center, spacing: 12) {
                // Left Block: Account Name above Hero Amount
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        if !metric.isGlobal {
                            Circle()
                                .fill(accentColor)
                                .frame(width: 5, height: 5)
                                .widgetAccentable()
                        }
                        Text(metric.headerTitle)
                            .font(.system(size: 10.5, weight: .semibold))
                            .foregroundColor(theme.textSecondary)
                            .lineLimit(1)
                    }

                    Text(metric.formattedValue)
                        .font(.system(size: 26, weight: .black, design: .rounded))
                        .foregroundColor(metric.isExpense || metric.isIncome ? accentColor : theme.textPrimary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                        .widgetAccentable()
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Right Block: Surface Panel with Contextual Breakdown
                VStack(alignment: .leading, spacing: 5) {
                    if metric.isGlobal {
                        HStack {
                            Text("LÍQUIDO")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.textSecondary)
                            Spacer()
                            Text(entry.liquidTotal)
                                .font(.system(size: 9.5, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.textPrimary)
                                .widgetAccentable()
                        }
                        HStack {
                            Text("AHORRO")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.textSecondary)
                            Spacer()
                            Text(entry.savingsTotal)
                                .font(.system(size: 9.5, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.amber)
                                .widgetAccentable()
                        }
                    } else {
                        HStack {
                            Text("HOY")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.textSecondary)
                            Spacer()
                            Text(entry.todayExpenses)
                                .font(.system(size: 9.5, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.red)
                                .widgetAccentable()
                        }
                        HStack {
                            Text("MES")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.textSecondary)
                            Spacer()
                            Text(entry.monthExpenses)
                                .font(.system(size: 9.5, weight: .bold, design: .monospaced))
                                .foregroundColor(theme.textPrimary)
                                .widgetAccentable()
                        }
                    }
                }
                .frame(width: 120)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(theme.surface)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(theme.border, lineWidth: 1)
                )
            }

            Spacer(minLength: 8)

            // ── Bottom Action Dock: Sleek Buttons ──
            HStack(spacing: 8) {
                let gastoURL = metric.accountId != nil
                    ? "ayefinance://transaction/new?account=\(metric.accountId!)&type=gasto"
                    : "ayefinance://transaction/new?type=gasto"

                let ingresoURL = metric.accountId != nil
                    ? "ayefinance://transaction/new?account=\(metric.accountId!)&type=ingreso"
                    : "ayefinance://transaction/new?type=ingreso"

                Link(destination: URL(string: gastoURL)!) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.down.right")
                            .font(.system(size: 8.5, weight: .black))
                            .widgetAccentable()
                        Text(metric.isGlobal ? "Registrar Gasto" : "Gasto")
                            .font(.system(size: 9.5, weight: .bold))
                            .widgetAccentable()
                    }
                    .foregroundColor(theme.red)
                    .frame(maxWidth: .infinity)
                    .frame(height: 26)
                    .background(theme.red.opacity(theme.isDark ? 0.12 : 0.08))
                    .cornerRadius(6)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(theme.red.opacity(theme.isDark ? 0.25 : 0.20), lineWidth: 0.5)
                    )
                }

                Link(destination: URL(string: ingresoURL)!) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 8.5, weight: .black))
                            .widgetAccentable()
                        Text(metric.isGlobal ? "Registrar Ingreso" : "Ingreso")
                            .font(.system(size: 9.5, weight: .bold))
                            .widgetAccentable()
                    }
                    .foregroundColor(theme.green)
                    .frame(maxWidth: .infinity)
                    .frame(height: 26)
                    .background(theme.green.opacity(theme.isDark ? 0.12 : 0.08))
                    .cornerRadius(6)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(theme.green.opacity(theme.isDark ? 0.25 : 0.20), lineWidth: 0.5)
                    )
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
    }
}

// MARK: - Large Widget (Complete Financial Atelier)

struct LargeWidgetView: View {
    let entry: AyeFinanceWidgetEntry
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.widgetRenderingMode) var renderingMode
    @Environment(\.ayeTint) var ayeTint: Color?

    var body: some View {
        let theme = AyeTheme.resolve(colorScheme: colorScheme, renderingMode: renderingMode, customTint: ayeTint)
        let metric = entry.metricResult
        let accentColor = theme.resolveAccent(hex: metric.colorHex, isExpense: metric.isExpense, isIncome: metric.isIncome)

        VStack(alignment: .leading, spacing: 0) {
            // ── Top Row: Metric Label as Title (Matches Small & Medium) ──
            HStack(alignment: .center, spacing: 5) {
                if metric.isExpense {
                    Image(systemName: "arrow.down.right")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(accentColor)
                        .widgetAccentable()
                } else if metric.isIncome {
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(accentColor)
                        .widgetAccentable()
                } else {
                    Circle()
                        .fill(accentColor)
                        .frame(width: 7, height: 7)
                        .widgetAccentable()
                }

                Text(metric.metricLabel)
                    .font(.system(size: 9.5, weight: .black, design: .monospaced))
                    .foregroundColor(metric.isExpense || metric.isIncome ? accentColor : theme.amber)
                    .tracking(0.5)
                    .lineLimit(1)
                    .widgetAccentable()

                Spacer()

                Text("\(entry.accounts.count) cuentas activas")
                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                    .foregroundColor(theme.textSecondary)
            }

            Spacer(minLength: 8)

            // ── Hero Section: Account Name above Centered Hero Amount ──
            VStack(alignment: .center, spacing: 3) {
                HStack(spacing: 5) {
                    if !metric.isGlobal {
                        Circle()
                            .fill(accentColor)
                            .frame(width: 6, height: 6)
                            .widgetAccentable()
                    }
                    Text(metric.headerTitle)
                        .font(.system(size: 11.5, weight: .semibold))
                        .foregroundColor(theme.textSecondary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .center)

                Text(metric.formattedValue)
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundColor(metric.isExpense || metric.isIncome ? accentColor : theme.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .widgetAccentable()
            }
            .padding(.vertical, 8)
            .background(theme.surface)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(theme.border, lineWidth: 1)
            )

            Spacer(minLength: 8)

            // ── Secondary Metrics Pill Cards Row ──
            HStack(spacing: 8) {
                if metric.isGlobal {
                    MetricPillCard(title: "LÍQUIDO", value: entry.liquidTotal, valueColor: theme.textPrimary, theme: theme)
                    MetricPillCard(title: "AHORRO", value: entry.savingsTotal, valueColor: theme.amber, theme: theme)
                    MetricPillCard(title: "GASTOS HOY", value: entry.todayExpenses, valueColor: theme.red, theme: theme)
                } else {
                    MetricPillCard(title: "GASTOS HOY", value: entry.todayExpenses, valueColor: theme.red, theme: theme)
                    MetricPillCard(title: "GASTOS MES", value: entry.monthExpenses, valueColor: theme.textPrimary, theme: theme)
                    MetricPillCard(title: "TIPO", value: entry.accounts.first(where: { $0.id == metric.accountId })?.accountType.capitalized ?? "Cuenta", valueColor: accentColor, theme: theme)
                }
            }

            Spacer(minLength: 10)

            // ── Accounts Breakdown List ──
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("CUENTAS")
                        .font(.system(size: 8.5, weight: .black, design: .monospaced))
                        .foregroundColor(theme.textSecondary)
                        .tracking(0.6)
                    Spacer()
                }

                if entry.accounts.isEmpty {
                    Text("Abre la app para sincronizar cuentas.")
                        .font(.system(size: 10, weight: .regular))
                        .foregroundColor(theme.textSecondary)
                        .padding(.vertical, 6)
                } else {
                    ForEach(entry.accounts.prefix(3)) { acc in
                        let isSelected = acc.id == metric.accountId
                        let accColor = theme.isTinted ? (theme.customTint ?? theme.amber) : Color(hex: acc.colorHex)
                        Link(destination: URL(string: "ayefinance://transaction/new?account=\(acc.id)")!) {
                            HStack(spacing: 6) {
                                Circle()
                                    .fill(accColor)
                                    .frame(width: 6, height: 6)
                                    .widgetAccentable()

                                Text(acc.name)
                                    .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                                    .foregroundColor(theme.textPrimary)
                                    .lineLimit(1)

                                Spacer()

                                Text(acc.currency)
                                    .font(.system(size: 8, weight: .semibold, design: .monospaced))
                                    .foregroundColor(theme.textSecondary)

                                Text("$\(String(format: "%.2f", acc.balance))")
                                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                                    .foregroundColor(theme.textPrimary)
                                    .widgetAccentable()
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(isSelected ? accColor.opacity(theme.isDark ? 0.12 : 0.08) : theme.surfaceSecondary)
                            .cornerRadius(6)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(isSelected ? accColor.opacity(theme.isDark ? 0.35 : 0.25) : Color.clear, lineWidth: 1)
                            )
                        }
                    }
                }
            }
            .padding(10)
            .background(theme.surface)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(theme.border, lineWidth: 1)
            )

            Spacer(minLength: 10)

            // ── Action Dock ──
            HStack(spacing: 8) {
                let gastoURL = metric.accountId != nil
                    ? "ayefinance://transaction/new?account=\(metric.accountId!)&type=gasto"
                    : "ayefinance://transaction/new?type=gasto"

                let ingresoURL = metric.accountId != nil
                    ? "ayefinance://transaction/new?account=\(metric.accountId!)&type=ingreso"
                    : "ayefinance://transaction/new?type=ingreso"

                Link(destination: URL(string: gastoURL)!) {
                    HStack(spacing: 5) {
                        Image(systemName: "arrow.down.right")
                            .font(.system(size: 9, weight: .black))
                            .widgetAccentable()
                        Text(metric.isGlobal ? "Registrar Gasto" : "Gasto")
                            .font(.system(size: 10, weight: .bold))
                            .lineLimit(1)
                            .widgetAccentable()
                    }
                    .foregroundColor(theme.red)
                    .frame(maxWidth: .infinity)
                    .frame(height: 30)
                    .background(theme.red.opacity(theme.isDark ? 0.12 : 0.08))
                    .cornerRadius(7)
                    .overlay(
                        RoundedRectangle(cornerRadius: 7)
                            .stroke(theme.red.opacity(theme.isDark ? 0.25 : 0.20), lineWidth: 0.5)
                    )
                }

                Link(destination: URL(string: ingresoURL)!) {
                    HStack(spacing: 5) {
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 9, weight: .black))
                            .widgetAccentable()
                        Text(metric.isGlobal ? "Registrar Ingreso" : "Ingreso")
                            .font(.system(size: 10, weight: .bold))
                            .lineLimit(1)
                            .widgetAccentable()
                    }
                    .foregroundColor(theme.green)
                    .frame(maxWidth: .infinity)
                    .frame(height: 30)
                    .background(theme.green.opacity(theme.isDark ? 0.12 : 0.08))
                    .cornerRadius(7)
                    .overlay(
                        RoundedRectangle(cornerRadius: 7)
                            .stroke(theme.green.opacity(theme.isDark ? 0.25 : 0.20), lineWidth: 0.5)
                    )
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
    }
}

// MARK: - Metric Pill Card Helper

struct MetricPillCard: View {
    let title: String
    let value: String
    let valueColor: Color
    let theme: AyeTheme

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 7.5, weight: .bold, design: .monospaced))
                .foregroundColor(theme.textSecondary)
                .tracking(0.4)
                .lineLimit(1)

            Text(value)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .widgetAccentable()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(theme.surface)
        .cornerRadius(6)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(theme.border, lineWidth: 1)
        )
    }
}

// MARK: - AyeFinanceWidget Main Configuration

public struct AyeFinanceWidget: Widget {
    public static let kind: String = "AyeFinanceWidget"

    public init() {}

    public var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: Self.kind,
            intent: AyeFinanceConfigurationIntent.self,
            provider: AyeFinanceAppIntentTimelineProvider()
        ) { entry in
            AyeFinanceWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("AyeFinance Flujo de Caja")
        .description("Visualiza tu saldo consolidado o por cuenta y registra movimientos rápidamente.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - Color & View Extensions

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 254, 157, 1) // default amber
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

extension View {
    @ViewBuilder
    func applyContainerBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(color, for: .widget)
        } else {
            self.background(color)
        }
    }
}

// MARK: - Xcode Canvas Previews

#if DEBUG
@available(iOS 17.0, *)
#Preview("Small Widget - Global", as: .systemSmall) {
    AyeFinanceWidget()
} timeline: {
    AyeFinanceWidgetEntry.sample
}

@available(iOS 17.0, *)
#Preview("Small Widget - Gastos Hoy", as: .systemSmall) {
    AyeFinanceWidget()
} timeline: {
    AyeFinanceWidgetEntry(
        date: Date(),
        configuration: AyeFinanceConfigurationIntent(account: nil, metric: .gastosHoy),
        metricResult: ComputedMetricResult(
            headerTitle: "AYEFINANCE",
            headerBadge: "GLOBAL",
            metricLabel: "GASTOS DE HOY",
            value: 48.50,
            formattedValue: "$48.50",
            currency: "USD",
            colorHex: "#EF4444",
            isExpense: true,
            isIncome: false,
            isGlobal: true,
            accountId: nil
        ),
        grandTotal: "$14,850.00",
        liquidTotal: "$9,650.00",
        savingsTotal: "$5,200.00",
        accounts: AyeFinanceWidgetEntry.sample.accounts,
        isConnected: true
    )
}

@available(iOS 17.0, *)
#Preview("Medium Widget", as: .systemMedium) {
    AyeFinanceWidget()
} timeline: {
    AyeFinanceWidgetEntry.sample
}

@available(iOS 17.0, *)
#Preview("Large Widget", as: .systemLarge) {
    AyeFinanceWidget()
} timeline: {
    AyeFinanceWidgetEntry.sample
}
#endif



