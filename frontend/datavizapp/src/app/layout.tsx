import { SessionProvider } from "next-auth/react";
import NavBar from "./components/navbar";
import Footer from "./components/footer";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="corporate">
      <body className="bg-base-200 min-h-screen flex flex-col">
        <NavBar />
          <main className="flex-1 flex flex-col items-center justify-center">
            {children}
          </main>
        <Footer />
      </body>
    </html>
  );
}
