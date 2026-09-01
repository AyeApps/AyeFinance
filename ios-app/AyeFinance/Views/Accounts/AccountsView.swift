import SwiftUI

public struct AccountsView: View {
    @State private var viewModel = AccountsViewModel()
    @State private var showCreateSheet = false
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#050505").ignoresSafeArea()
                
                List {
                    ForEach(viewModel.accounts) { acc in
                        HStack(spacing: 12) {
                            Circle()
                                .fill(Color(hex: acc.color))
                                .frame(width: 12, height: 12)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(acc.name)
                                    .font(.headline)
                                    .foregroundColor(.white)
                                Text(acc.accountType.displayName)
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("$\(acc.currentBalance)")
                                    .font(.subheadline)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                Text("Proy: $\(acc.projectedBalance)")
                                    .font(.caption2)
                                    .foregroundColor(Color(hex: "#FE9D01"))
                            }
                        }
                        .listRowBackground(Color(hex: "#0d0d0d"))
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                Task { await viewModel.deleteAccount(id: acc.id) }
                            } label: {
                                Label("Eliminar", systemImage: "trash")
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)
                .refreshable {
                    await viewModel.loadAccounts()
                }
            }
            .navigationTitle("Cuentas")
            .toolbar {
                Button(action: { showCreateSheet = true }) {
                    Image(systemName: "plus")
                        .foregroundColor(Color(hex: "#FE9D01"))
                }
            }
            .task {
                await viewModel.loadAccounts()
            }
        }
    }
}
