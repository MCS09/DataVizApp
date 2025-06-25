import Footer from "./components/footer";
import NavBar from "./components/navbar";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="corporate" >
      <body className="bg-base-200 min-h-screen flex flex-col">
        <SessionProvider> 
          <NavBar />
        </SessionProvider>
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        <Footer />
      </body>
    </html>
  );
}
