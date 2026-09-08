import SwiftUI
import WidgetKit

@main
struct WidgetSandboxApp: App {
    var body: some Scene {
        WindowGroup {
            WidgetSandboxDashboardView()
        }
    }
}

// MARK: - AyeFinance Widget Sandbox Dashboard

struct WidgetSandboxDashboardView: View {
    @State private var environment: String = "Production"
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var manualToken: String = ""
    @State private var showTokenInput: Bool = false

    @State private var isBusy: Bool = false
    @State private var statusMessage: String = "Listo para sincronizar"
    @State private var statusColor: Color = .gray

    @State private var loadedAccounts: [AccountEntity] = []
    @State private var grandTotal: String = "$0.00"
    @State private var lastUpdated: String = "--"
    @State private var summaryDict: [String: Any]? = nil
    @State private var refreshId: UUID = UUID()

    // Quick transaction test state
    @State private var txType: String = "gasto"
    @State private var txAmount: String = "15.50"
    @State private var txConcept: String = "Café Atelier"
    @State private var selectedAccountId: String = ""
    @State private var selectedSizeFilter: String = "Mediano"
    @State private var selectedAppearance: String = "Oscuro"
    @State private var selectedTintIndex: Int = 0
    @State private var showControls: Bool = false

    let tintOptions: [(name: String, color: Color)] = [
        ("Amber", Color(red: 254/255.0, green: 157/255.0, blue: 1/255.0)),
        ("Cyan", Color(red: 6/255.0, green: 182/255.0, blue: 212/255.0)),
        ("Emerald", Color(red: 16/255.0, green: 185/255.0, blue: 129/255.0)),
        ("Violet", Color(red: 139/255.0, green: 92/255.0, blue: 246/255.0)),
        ("Rose", Color(red: 244/255.0, green: 63/255.0, blue: 94/255.0))
    ]

    var currentTint: Color {
        tintOptions[selectedTintIndex].color
    }

    var currentFinanceURL: String {
        environment == "Production"
            ? "https://api-ayfice.ayeapps.com/api/v1"
            : "http://localhost:8003/api/v1"
    }

    var currentAuthURL: String {
        environment == "Production"
            ? "https://api-auth.ayeapps.com/api/v1"
            : "http://localhost:8000/api/v1"
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 5/255.0, green: 5/255.0, blue: 5/255.0)
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        // ── Header Card ──
                        headerCard

                        if showControls {
                            // ── API & Sync Card ──
                            syncControlCard

                            // ── Quick Transaction Test Card ──
                            quickTransactionCard
                        }

                        // ── Live Widget Previews Gallery ──
                        widgetGalleryCard
                    }
                    .padding(16)
                }
                .id(refreshId)
            }
            .navigationTitle("Widget Atelier")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showControls.toggle()
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: showControls ? "chevron.up.circle.fill" : "slider.horizontal.3")
                                .font(.system(size: 13))
                            Text(showControls ? "Ocultar Controles" : "Controles")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundColor(Color(red: 254/255.0, green: 157/255.0, blue: 1/255.0))
                    }
                }
            }
            .onAppear {
                refreshLocalData()
                if loadedAccounts.isEmpty {
                    AyeFinanceAPI.shared.seedMockData()
                    refreshLocalData()
                }
                Task {
                    let defaults = UserDefaults(suiteName: "group.com.ayeapps.ayefinance")
                    if let token = defaults?.string(forKey: "ayefinance_token"), !token.isEmpty, token != "mock_token" {
                        _ = try? await AyeFinanceAPI.shared.syncAllToAppGroup(token: token)
                        await MainActor.run {
                            refreshLocalData()
                        }
                    }
                }
            }
        }
    }

    // ── Header Card ──
    private var headerCard: some View {
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 1)
                    .fill(Color(red: 254/255.0, green: 157/255.0, blue: 1/255.0))
                    .frame(width: 16, height: 3)
                Text("AYEFINANCE WIDGET ATELIER")
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .foregroundColor(Color(red: 254/255.0, green: 157/255.0, blue: 1/255.0))
                    .tracking(1.2)
                Spacer()
                HStack(spacing: 4) {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 6, height: 6)
                    Text(statusMessage)
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(statusColor)
                }
            }

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("TOTAL EN APP GROUP")
                        .font(.system(size: 8, weight: .bold, design: .monospaced))
                        .foregroundColor(.gray)
                    Text(grandTotal)
                        .font(.system(size: 22, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("CUENTAS SINCRONIZADAS")
                        .font(.system(size: 8, weight: .bold, design: .monospaced))
                        .foregroundColor(.gray)
                    Text("\(loadedAccounts.count) cuentas")
                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                }
            }
            .padding(10)
            .background(Color(red: 13/255.0, green: 13/255.0, blue: 13/255.0))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
        }
    }

    // ── API & Sync Control Card ──
    private var syncControlCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("CONEXIÓN & SINCRONIZACIÓN API")
                    .font(.system(size: 9.5, weight: .black, design: .monospaced))
                    .foregroundColor(.white)
                Spacer()
                Picker("Ambiente", selection: $environment) {
                    Text("Producción").tag("Production")
                    Text("Local (:8003)").tag("Local")
                }
                .pickerStyle(.segmented)
                .frame(width: 170)
            }

            if showTokenInput {
                TextField("Pega tu JWT Token aquí", text: $manualToken)
                    .font(.system(size: 11, design: .monospaced))
                    .padding(8)
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(6)
                    .foregroundColor(.white)
            } else {
                HStack(spacing: 8) {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                        .font(.system(size: 11))
                        .padding(8)
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(6)
                        .foregroundColor(.white)

                    SecureField("Contraseña", text: $password)
                        .font(.system(size: 11))
                        .padding(8)
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(6)
                        .foregroundColor(.white)
                }
            }

            HStack(spacing: 8) {
                // Sincronizar desde API
                Button {
                    Task { await performAPISync() }
                } label: {
                    HStack(spacing: 5) {
                        if isBusy {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .black))
                                .scaleEffect(0.7)
                        } else {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 10, weight: .bold))
                        }
                        Text("SINCRONIZAR API")
                            .font(.system(size: 9.5, weight: .black, design: .monospaced))
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .frame(height: 32)
                    .background(Color(red: 254/255.0, green: 157/255.0, blue: 1/255.0))
                    .cornerRadius(6)
                }
                .disabled(isBusy)

                // Cargar Mock Data (1 Tap)
                Button {
                    Task {
                        await AyeFinanceAPI.shared.seedMockData()
                        refreshLocalData()
                        statusMessage = "Mock Data cargada"
                        statusColor = Color(red: 16/255.0, green: 185/255.0, blue: 129/255.0)
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 10))
                        Text("MOCK (1-TAP)")
                            .font(.system(size: 9.5, weight: .black, design: .monospaced))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 32)
                    .background(Color.white.opacity(0.12))
                    .cornerRadius(6)
                }

                // Alternar Token / Login
                Button {
                    showTokenInput.toggle()
                } label: {
                    Image(systemName: showTokenInput ? "key.fill" : "person.fill")
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.7))
                        .frame(width: 32, height: 32)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(6)
                }
            }
        }
        .padding(12)
        .background(Color(red: 13/255.0, green: 13/255.0, blue: 13/255.0))
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.white.opacity(0.10), lineWidth: 1)
        )
    }

    // ── Quick Transaction Test Card ──
    private var quickTransactionCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("PROBAR CREACIÓN DE MOVIMIENTO")
                .font(.system(size: 9.5, weight: .black, design: .monospaced))
                .foregroundColor(.white)

            HStack(spacing: 8) {
                Picker("Tipo", selection: $txType) {
                    Text("Gasto").tag("gasto")
                    Text("Ingreso").tag("ingreso")
                }
                .pickerStyle(.segmented)
                .frame(width: 140)

                TextField("Monto", text: $txAmount)
                    .keyboardType(.decimalPad)
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .padding(6)
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(6)
                    .foregroundColor(.white)

                TextField("Concepto", text: $txConcept)
                    .font(.system(size: 11))
                    .padding(6)
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(6)
                    .foregroundColor(.white)
            }

            if !loadedAccounts.isEmpty {
                HStack {
                    Text("Cuenta:")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.gray)
                    Picker("Cuenta", selection: $selectedAccountId) {
                        Text("Automática").tag("")
                        ForEach(loadedAccounts) { acc in
                            Text(acc.name).tag(acc.id)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(Color(red: 254/255.0, green: 157/255.0, blue: 1/255.0))
                    Spacer()
                }
            }

            Button {
                Task { await performCreateTransaction() }
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 10))
                    Text("REGISTRAR Y RECARGAR WIDGETS")
                        .font(.system(size: 9.5, weight: .black, design: .monospaced))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 30)
                .background(txType == "gasto" ? Color.red.opacity(0.8) : Color.green.opacity(0.8))
                .cornerRadius(6)
            }
            .disabled(isBusy)
        }
        .padding(12)
        .background(Color(red: 13/255.0, green: 13/255.0, blue: 13/255.0))
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.white.opacity(0.10), lineWidth: 1)
        )
    }

    // ── Live Widget Previews Gallery ──
    private var widgetGalleryCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                Text("VISTA PREVIA EN VIVO DE LOS WIDGETS")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .foregroundColor(Color(red: 254/255.0, green: 157/255.0, blue: 1/255.0))
                    .tracking(1)

                // Selector de Tamaño
                Picker("Tamaño", selection: $selectedSizeFilter) {
                    Text("Mediano").tag("Mediano")
                    Text("Grande").tag("Grande")
                    Text("Pequeño").tag("Pequeño")
                    Text("Todos").tag("Todos")
                }
                .pickerStyle(.segmented)

                // Selector de Apariencia Dinámica (Claro, Oscuro, Tintado, Clear)
                Picker("Apariencia", selection: $selectedAppearance) {
                    Text("Oscuro").tag("Oscuro")
                    Text("Claro").tag("Claro")
                    Text("Tintado").tag("Tintado")
                    Text("Clear").tag("Clear")
                }
                .pickerStyle(.segmented)

                if selectedAppearance == "Tintado" {
                    HStack(spacing: 8) {
                        Text("TINTE:")
                            .font(.system(size: 8.5, weight: .bold, design: .monospaced))
                            .foregroundColor(.gray)

                        ForEach(0..<tintOptions.count, id: \.self) { idx in
                            Circle()
                                .fill(tintOptions[idx].color)
                                .frame(width: 20, height: 20)
                                .overlay(
                                    Circle()
                                        .stroke(Color.white, lineWidth: selectedTintIndex == idx ? 2.5 : 0)
                                )
                                .onTapGesture {
                                    withAnimation(.easeInOut(duration: 0.15)) {
                                        selectedTintIndex = idx
                                    }
                                }
                        }
                    }
                    .padding(.top, 2)
                }
            }

            if selectedSizeFilter == "Pequeño" || selectedSizeFilter == "Todos" {
                // Small Widget Previews Side-by-Side
                VStack(alignment: .leading, spacing: 8) {
                    Text("WIDGET PEQUEÑO (155 x 155)")
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(.gray)

                    HStack(spacing: 16) {
                        WidgetPreviewCard(
                            title: "Modo Global",
                            width: 155,
                            height: 155,
                            appearance: selectedAppearance,
                            tintColor: currentTint
                        ) {
                            SmallWidgetView(entry: liveEntry(account: nil, metric: .saldo))
                        }

                        let previewAccount = loadedAccounts.first(where: { $0.id == selectedAccountId }) ?? (loadedAccounts.count > 1 ? loadedAccounts[1] : loadedAccounts.first)
                        WidgetPreviewCard(
                            title: previewAccount?.name ?? "Por Cuenta",
                            width: 155,
                            height: 155,
                            appearance: selectedAppearance,
                            tintColor: currentTint
                        ) {
                            SmallWidgetView(entry: liveEntry(account: previewAccount, metric: .saldo))
                        }
                    }
                }
            }

            if selectedSizeFilter == "Mediano" || selectedSizeFilter == "Todos" {
                // Medium Widget Previews
                VStack(alignment: .leading, spacing: 8) {
                    Text("WIDGET MEDIANO (329 x 155)")
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(.gray)

                    VStack(alignment: .center, spacing: 12) {
                        WidgetPreviewCard(
                            title: "Modo Global",
                            width: 329,
                            height: 155,
                            appearance: selectedAppearance,
                            tintColor: currentTint
                        ) {
                            MediumWidgetView(entry: liveEntry(account: nil, metric: .saldo))
                        }

                        let previewAccount = loadedAccounts.first(where: { $0.id == selectedAccountId }) ?? (loadedAccounts.count > 1 ? loadedAccounts[1] : loadedAccounts.first)
                        WidgetPreviewCard(
                            title: previewAccount?.name ?? "Por Cuenta",
                            width: 329,
                            height: 155,
                            appearance: selectedAppearance,
                            tintColor: currentTint
                        ) {
                            MediumWidgetView(entry: liveEntry(account: previewAccount, metric: .saldo))
                        }
                    }
                }
            }

            if selectedSizeFilter == "Grande" || selectedSizeFilter == "Todos" {
                // Large Widget Previews
                VStack(alignment: .leading, spacing: 8) {
                    Text("WIDGET GRANDE (329 x 345)")
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(.gray)

                    VStack(alignment: .center, spacing: 12) {
                        WidgetPreviewCard(
                            title: "Modo Global",
                            width: 329,
                            height: 345,
                            appearance: selectedAppearance,
                            tintColor: currentTint
                        ) {
                            LargeWidgetView(entry: liveEntry(account: nil, metric: .saldo))
                        }

                        let previewAccount = loadedAccounts.first(where: { $0.id == selectedAccountId }) ?? (loadedAccounts.count > 1 ? loadedAccounts[1] : loadedAccounts.first)
                        WidgetPreviewCard(
                            title: previewAccount?.name ?? "Por Cuenta",
                            width: 329,
                            height: 345,
                            appearance: selectedAppearance,
                            tintColor: currentTint
                        ) {
                            LargeWidgetView(entry: liveEntry(account: previewAccount, metric: .saldo))
                        }
                    }
                }
            }
        }
    }

    // ── Helper: Refresh Local App Group Data ──
    private func refreshLocalData() {
        self.loadedAccounts = AccountStorage.loadAccounts()
        let summary = AccountStorage.loadSummaryDictionary()
        self.summaryDict = summary
        if let sum = summary {
            let gt = AccountStorage.parseFlexibleDouble(sum["grand_total"])
            if gt > 0 { self.grandTotal = String(format: "$%.2f", gt) }
            self.lastUpdated = sum["updated_at"] as? String ?? "Hoy"
        }
        if (self.grandTotal == "$0.00" || self.grandTotal.isEmpty) && !loadedAccounts.isEmpty {
            let total = loadedAccounts.reduce(0.0) { $0 + $1.balance }
            self.grandTotal = String(format: "$%.2f", total)
        }
        if selectedAccountId.isEmpty, let first = loadedAccounts.first {
            selectedAccountId = first.id
        }
        self.refreshId = UUID()
    }

    private func liveEntry(account: AccountEntity?, metric: WidgetMetricOption) -> AyeFinanceWidgetEntry {
        let metricRes = AccountStorage.loadMetrics(account: account, metric: metric)
        var liquid = "$0.00"
        var savings = "$0.00"
        var todayExp = "$0.00"
        var monthExp = "$0.00"

        if let sum = self.summaryDict ?? AccountStorage.loadSummaryDictionary() {
            let lt = AccountStorage.parseFlexibleDouble(sum["liquid_total"])
            if lt > 0 { liquid = String(format: "$%.2f", lt) }
            let st = AccountStorage.parseFlexibleDouble(sum["savings_total"])
            if st > 0 { savings = String(format: "$%.2f", st) }

            if let targetId = metricRes.accountId,
               let ba = sum["by_account"] as? [String: Any],
               let accData = ba[targetId] as? [String: Any] {
                let te = AccountStorage.parseFlexibleDouble(accData["today_expenses"])
                let me = AccountStorage.parseFlexibleDouble(accData["month_expenses"])
                todayExp = String(format: "$%.2f", te)
                monthExp = String(format: "$%.2f", me)
            } else {
                let te = AccountStorage.parseFlexibleDouble(sum["today_expenses"])
                let me = AccountStorage.parseFlexibleDouble(sum["month_expenses"])
                todayExp = String(format: "$%.2f", te)
                monthExp = String(format: "$%.2f", me)
            }
        }

        if !self.loadedAccounts.isEmpty {
            let compGrand = self.loadedAccounts.reduce(0.0) { $0 + $1.balance }
            let compLiq = self.loadedAccounts.filter { $0.accountType == "corriente" }.reduce(0.0) { $0 + $1.balance }
            let compSav = self.loadedAccounts.filter { $0.accountType == "ahorro" || $0.accountType == "inversion" || $0.accountType == "plazo" }.reduce(0.0) { $0 + $1.balance }

            if (self.grandTotal == "$0.00" || self.grandTotal.isEmpty) && compGrand > 0 {
                self.grandTotal = String(format: "$%.2f", compGrand)
            }
            if (liquid == "$0.00" || liquid.isEmpty) && compLiq > 0 {
                liquid = String(format: "$%.2f", compLiq)
            }
            if (savings == "$0.00" || savings.isEmpty) && compSav > 0 {
                savings = String(format: "$%.2f", compSav)
            }
        }

        return AyeFinanceWidgetEntry(
            date: Date(),
            configuration: AyeFinanceConfigurationIntent(account: account, metric: metric),
            metricResult: metricRes,
            grandTotal: self.grandTotal,
            liquidTotal: liquid,
            savingsTotal: savings,
            todayExpenses: todayExp,
            monthExpenses: monthExp,
            accounts: self.loadedAccounts,
            isConnected: !self.loadedAccounts.isEmpty
        )
    }

    // ── Actions ──
    private func performAPISync() async {
        isBusy = true
        statusMessage = "Conectando..."
        statusColor = .yellow

        await AyeFinanceAPI.shared.setBaseURLs(finance: currentFinanceURL, auth: currentAuthURL)

        do {
            var activeToken = manualToken.trimmingCharacters(in: .whitespacesAndNewlines)
            if activeToken.isEmpty {
                guard !email.isEmpty, !password.isEmpty else {
                    statusMessage = "Ingresa email y pass"
                    statusColor = .red
                    isBusy = false
                    return
                }
                let loginRes = try await AyeFinanceAPI.shared.login(email: email, password: password)
                activeToken = loginRes.token
            }

            let result = try await AyeFinanceAPI.shared.syncAllToAppGroup(token: activeToken)
            refreshLocalData()
            statusMessage = "\(result.accountCount) cuentas (\(result.grandTotal))"
            statusColor = Color(red: 16/255.0, green: 185/255.0, blue: 129/255.0)
        } catch {
            statusMessage = "Error: \(error.localizedDescription)"
            statusColor = .red
        }

        isBusy = false
    }

    private func performCreateTransaction() async {
        guard let amt = Double(txAmount.replacingOccurrences(of: ",", with: ".")) else {
            statusMessage = "Monto inválido"
            statusColor = .red
            return
        }

        isBusy = true
        statusMessage = "Registrando..."
        statusColor = .yellow

        let token = UserDefaults(suiteName: "group.com.ayeapps.ayefinance")?.string(forKey: "ayefinance_token") ?? manualToken

        // Modo MOCK / Offline: si el token es mock, o la cuenta seleccionada es un ID mock ("1", "2", etc.)
        let isMockMode = token == "mock_token" || (selectedAccountId.count < 10 && !selectedAccountId.isEmpty) || (token.isEmpty && !loadedAccounts.isEmpty)

        if isMockMode {
            AyeFinanceAPI.shared.simulateLocalTransaction(
                type: txType,
                amount: amt,
                concept: txConcept,
                accountId: selectedAccountId.isEmpty ? nil : selectedAccountId
            )
            refreshLocalData()
            statusMessage = "✓ Movimiento simulado en App Group"
            statusColor = Color(red: 16/255.0, green: 185/255.0, blue: 129/255.0)
            isBusy = false
            return
        }

        guard !token.isEmpty else {
            statusMessage = "Inicia sesión primero o usa MOCK"
            statusColor = .red
            isBusy = false
            return
        }

        do {
            let ok = try await AyeFinanceAPI.shared.createTransaction(
                token: token,
                type: txType,
                amount: amt,
                concept: txConcept,
                accountId: selectedAccountId.isEmpty ? nil : selectedAccountId
            )
            if ok {
                refreshLocalData()
                statusMessage = "✓ Movimiento registrado en API"
                statusColor = Color(red: 16/255.0, green: 185/255.0, blue: 129/255.0)
            } else {
                statusMessage = "Error en el servidor"
                statusColor = .red
            }
        } catch {
            statusMessage = "Error: \(error.localizedDescription)"
            statusColor = .red
        }

        isBusy = false
    }
}

// MARK: - Widget Preview Card Component

struct WidgetPreviewCard<Content: View>: View {
    let title: String
    let width: CGFloat
    let height: CGFloat
    let appearance: String
    let tintColor: Color
    @ViewBuilder let content: () -> Content

    var colorScheme: ColorScheme {
        appearance == "Claro" ? .light : .dark
    }

    var renderingMode: WidgetRenderingMode {
        switch appearance {
        case "Tintado": return .accented
        case "Clear": return .vibrant
        default: return .fullColor
        }
    }

    var containerBackground: Color {
        switch appearance {
        case "Claro":
            return Color(red: 247 / 255.0, green: 248 / 255.0, blue: 250 / 255.0)
        case "Tintado":
            return Color(red: 5 / 255.0, green: 5 / 255.0, blue: 5 / 255.0)
        case "Clear":
            return Color.white.opacity(0.08)
        default: // Oscuro
            return Color(red: 5 / 255.0, green: 5 / 255.0, blue: 5 / 255.0)
        }
    }

    var borderColor: Color {
        switch appearance {
        case "Claro":
            return Color.black.opacity(0.12)
        case "Tintado":
            return tintColor.opacity(0.35)
        case "Clear":
            return Color.white.opacity(0.25)
        default: // Oscuro
            return Color.white.opacity(0.15)
        }
    }

    var body: some View {
        VStack(alignment: .center, spacing: 4) {
            content()
                .frame(width: width, height: height)
                .background(containerBackground)
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .stroke(borderColor, lineWidth: 1)
                )
                .environment(\.colorScheme, colorScheme)
                .environment(\.widgetRenderingMode, renderingMode)
                .environment(\.ayeTint, tintColor)
                .tint(tintColor)

            Text(title)
                .font(.system(size: 8.5, weight: .medium))
                .foregroundColor(.gray)
        }
    }
}

