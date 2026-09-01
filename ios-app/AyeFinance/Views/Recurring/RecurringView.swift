import SwiftUI

public struct RecurringView: View {
    @State private var items: [RecurringItem] = []
    @State private var isLoading = false
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#050505").ignoresSafeArea()
                
                List {
                    ForEach(items) { item in
                        HStack(spacing: 12) {
                            Image(systemName: "calendar.badge.clock")
                                .foregroundColor(item.type == .ingresoFijo ? .green : Color(hex: "#FE9D01"))
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.name)
                                    .font(.headline)
                                    .foregroundColor(.white)
                                Text(item.frequency.displayName)
                                    .font(.caption2)
                                    .foregroundColor(.gray)
                            }
                            
                            Spacer()
                            
                            Text("\(item.type == .ingresoFijo ? "+" : "-")$\(item.amount)")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(item.type == .ingresoFijo ? .green : .white)
                        }
                        .listRowBackground(Color(hex: "#0d0d0d"))
                    }
                }
                .scrollContentBackground(.hidden)
                .refreshable {
                    await loadData()
                }
            }
            .navigationTitle("Recurrentes")
            .task {
                await loadData()
            }
        }
    }
    
    private func loadData() async {
        isLoading = true
        do {
            self.items = try await NetworkService.shared.request(endpoint: "recurring/")
        } catch {
            print(error)
        }
        isLoading = false
    }
}
