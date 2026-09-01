import SwiftUI

public struct DashboardView: View {
    @State private var viewModel = DashboardViewModel()
    @State private var showNewTxSheet = false
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#050505").ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Summary Cards
                        if let summary = viewModel.summary {
                            VStack(spacing: 12) {
                                SummaryCard(
                                    title: "Disponible Líquido",
                                    amount: summary.liquidTotal,
                                    subtitle: "Listo para gastar",
                                    color: Color(hex: "#10B981")
                                )
                                SummaryCard(
                                    title: "Total con Ahorros",
                                    amount: summary.grandTotal,
                                    subtitle: "Patrimonio actual",
                                    color: Color(hex: "#0EA5E9")
                                )
                                SummaryCard(
                                    title: "Proyectado (30 Días)",
                                    amount: summary.projectedGrandTotal,
                                    subtitle: "Flujo de caja estimado",
                                    color: Color(hex: "#FE9D01")
                                )
                            }
                        }
                        
                        // Accounts List
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Mis Cuentas")
                                .font(.headline)
                                .foregroundColor(.white)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(viewModel.accounts) { acc in
                                        VStack(alignment: .leading, spacing: 6) {
                                            Text(acc.name)
                                                .font(.subheadline)
                                                .fontWeight(.bold)
                                                .foregroundColor(.white)
                                            Text("$\(acc.currentBalance)")
                                                .font(.title3)
                                                .fontWeight(.black)
                                                .foregroundColor(Color(hex: "#FE9D01"))
                                            Text("Proy: $\(acc.projectedBalance)")
                                                .font(.caption2)
                                                .foregroundColor(.gray)
                                        }
                                        .padding()
                                        .frame(width: 150, alignment: .leading)
                                        .background(Color(hex: "#0d0d0d"))
                                        .cornerRadius(12)
                                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: acc.color).opacity(0.5), lineWidth: 1.5))
                                    }
                                }
                            }
                        }
                        
                        // Recent Transactions
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Últimos Movimientos")
                                .font(.headline)
                                .foregroundColor(.white)
                            
                            ForEach(viewModel.recentTransactions) { tx in
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(tx.concept)
                                            .font(.subheadline)
                                            .foregroundColor(.white)
                                        Text(tx.category)
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                    Spacer()
                                    Text("\(tx.type == .ingreso ? "+" : "-")$\(tx.amount)")
                                        .font(.subheadline)
                                        .fontWeight(.bold)
                                        .foregroundColor(tx.type == .ingreso ? .green : .red)
                                }
                                .padding()
                                .background(Color(hex: "#0d0d0d"))
                                .cornerRadius(10)
                            }
                        }
                    }
                    .padding()
                }
                .refreshable {
                    await viewModel.loadData()
                }
            }
            .navigationTitle("Dashboard")
            .toolbar {
                Button(action: { showNewTxSheet = true }) {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(Color(hex: "#FE9D01"))
                }
            }
            .task {
                await viewModel.loadData()
            }
            .sheet(isPresented: $showNewTxSheet) {
                NewTransactionView(accounts: viewModel.accounts) {
                    Task { await viewModel.loadData() }
                }
            }
        }
    }
}

struct SummaryCard: View {
    let title: String
    let amount: String
    let subtitle: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.gray)
            Text("$\(amount)")
                .font(.title2)
                .fontWeight(.black)
                .foregroundColor(color)
            Text(subtitle)
                .font(.caption2)
                .foregroundColor(.gray.opacity(0.8))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(hex: "#0d0d0d"))
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(color.opacity(0.3), lineWidth: 1))
    }
}
