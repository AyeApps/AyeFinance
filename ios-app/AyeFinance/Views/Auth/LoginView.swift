import SwiftUI

public struct LoginView: View {
    @Bindable var viewModel: AuthViewModel
    
    public init(viewModel: AuthViewModel) {
        self.viewModel = viewModel
    }
    
    public var body: some View {
        ZStack {
            Color(hex: "#050505").ignoresSafeArea()
            
            VStack(spacing: 24) {
                Spacer()
                
                // Brand
                VStack(spacing: 12) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color(hex: "#FE9D01"))
                            .frame(width: 56, height: 56)
                            .shadow(color: Color(hex: "#FE9D01").opacity(0.3), radius: 10)
                        
                        Text("₳")
                            .font(.system(size: 32, weight: .black))
                            .foregroundColor(.black)
                    }
                    
                    Text("AyeFinance")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    
                    Text("Ecosistema AyeApps")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                // Form
                VStack(spacing: 16) {
                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal)
                    }
                    
                    TextField("Correo Electrónico", text: $viewModel.email)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                        .padding()
                        .background(Color(hex: "#121212"))
                        .cornerRadius(10)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.white.opacity(0.1), lineWidth: 1))
                        .foregroundColor(.white)
                    
                    SecureField("Contraseña", text: $viewModel.password)
                        .textContentType(.password)
                        .padding()
                        .background(Color(hex: "#121212"))
                        .cornerRadius(10)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.white.opacity(0.1), lineWidth: 1))
                        .foregroundColor(.white)
                    
                    Button(action: {
                        Task { await viewModel.login() }
                    }) {
                        HStack {
                            if viewModel.isLoading {
                                ProgressView().tint(.black)
                            } else {
                                Text("Iniciar Sesión")
                                    .fontWeight(.bold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(hex: "#FE9D01"))
                        .foregroundColor(.black)
                        .cornerRadius(10)
                    }
                    .disabled(viewModel.isLoading)
                }
                .padding(.horizontal, 28)
                
                Spacer()
            }
        }
    }
}

extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex.replacingOccurrences(of: "#", with: ""))
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
