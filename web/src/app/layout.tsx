import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AyeFinance — Control Financiero Personal',
  description: 'Libro de registro y análisis de flujo de efectivo inteligente para el ecosistema AyeApps.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="dot-pattern-animated min-h-screen text-[#f5f5f5] selection:bg-[#FE9D01] selection:text-black">
        {children}
      </body>
    </html>
  );
}
