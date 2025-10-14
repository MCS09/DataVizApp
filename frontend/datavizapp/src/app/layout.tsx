"use client"
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
    <html lang="en" data-theme="corporate">
      <body className="bg-base-white min-h-screen flex flex-col">
          <SessionProvider>
            <NavBar />
            <main className="flex-1">{children}</main>
            <Footer />
          </SessionProvider>
      </body>
    </html>
  );
}
