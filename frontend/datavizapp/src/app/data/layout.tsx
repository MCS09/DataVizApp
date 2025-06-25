"use client";
import Steps from "./components/steps";
import { usePathname } from "next/navigation";

export default function DataPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentPathname: string = usePathname();
  return (
    <div className="min-h-screen flex flex-col" data-theme="lofi">
      <div className="w-full p-6 flex justify-center">
        <Steps pathname={currentPathname} />
      </div>
      <main className="flex-grow">{children}</main>
    </div>
  );
}
