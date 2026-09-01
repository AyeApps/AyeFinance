import SwiftUI

public struct TransactionsView: View {
    @State private var viewModel = TransactionsViewModel()
    @State private var showNewTxSheet = false
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#050505").ignoresSafeArea()
                
                List {
                    ForEach(viewModel.transactions) { tx in
                        HStack(spacing: 12) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(tx.type == .ingreso ? Color.green.opacity(0.15) : Color.red.opacity(0.15))
                                    .frame(width: 36, height: 36)
                                
                                Image(systemName: tx.type == .ingreso ? "arrow.down.left" : "arrow.up.right")
                                    .foregroundColor(tx.type == .ingreso ? .green : .red)
                            }
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(tx.concept)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                                Text(tx.category)
                                    .font(.caption2)
                                    .foregroundColor(.gray)
                            }
                            
                            Spacer()
                            
                            Text("\(tx.type == .ingreso ? "+" : "-")$\(tx.amount)")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(tx.type == .ingreso ? .green : .red)
                        }
                        .listRowBackground(Color(hex: "#0d0d0d"))
                        .onAppear {
                            if tx == viewModel.transactions.last {
                                Task { await viewModel.loadTransactions() }
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)
                .refreshable {
                    await viewModel.loadTransactions(reset: true)
                }
            }
            .navigationTitle("Movimientos")
            .task {
                await viewModel.loadTransactions(reset: true)
            }
        }
    }
}
