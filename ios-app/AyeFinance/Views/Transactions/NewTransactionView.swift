import SwiftUI

public struct NewTransactionView: View {
    @Environment(\.dismiss) private var dismiss
    let accounts: [Account]
    let onSaved: () -> Void
    
    @State private var type: TransactionType = .gasto
    @State private var amountString = ""
    @State private var concept = ""
    @State private var category = "Comida"
    @State private var selectedAccountId = ""
    @State private var isSaving = false
    
    public init(accounts: [Account], onSaved: @escaping () -> Void) {
        self.accounts = accounts
        self.onSaved = onSaved
        _selectedAccountId = State(initialValue: accounts.first?.id ?? "")
    }
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#050505").ignoresSafeArea()
                
                Form {
                    Section {
                        Picker("Tipo", selection: $type) {
                            ForEach(TransactionType.allCases, id: \.self) { t in
                                Text(t.displayName).tag(t)
                            }
                        }
                        .pickerStyle(.segmented)
                        
                        TextField("Monto", text: $amountString)
                            .keyboardType(.decimalPad)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(Color(hex: "#FE9D01"))
                        
                        TextField("Concepto", text: $concept)
                        
                        Picker("Cuenta", selection: $selectedAccountId) {
                            ForEach(accounts) { acc in
                                Text(acc.name).tag(acc.id)
                            }
                        }
                    }
                    .listRowBackground(Color(hex: "#0d0d0d"))
                    
                    Section {
                        Button(action: save) {
                            HStack {
                                Spacer()
                                if isSaving {
                                    ProgressView().tint(.black)
                                } else {
                                    Text("Guardar Movimiento")
                                        .fontWeight(.bold)
                                }
                                Spacer()
                            }
                            .padding()
                            .background(Color(hex: "#FE9D01"))
                            .foregroundColor(.black)
                            .cornerRadius(10)
                        }
                        .disabled(isSaving)
                        .listRowBackground(Color.clear)
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Nuevo Movimiento")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                        .foregroundColor(.gray)
                }
            }
        }
    }
    
    private func save() {
        guard let amt = Double(amountString), amt > 0, !concept.isEmpty else { return }
        isSaving = true
        
        Task {
            let vm = TransactionsViewModel()
            let ok = await vm.createTransaction(
                accountId: selectedAccountId,
                destinationAccountId: nil,
                amount: amt,
                type: type,
                concept: concept,
                category: category
            )
            isSaving = false
            if ok {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                onSaved()
                dismiss()
            }
        }
    }
}
