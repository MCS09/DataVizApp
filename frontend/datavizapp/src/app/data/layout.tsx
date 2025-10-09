"use client";
import { usePathname } from "next/navigation";
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 
import Steps from "./components/steps";
 


// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

export default function DataPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col" data-theme="lofi">
      <div className="w-full p-6 flex justify-center">
        <Steps />
      </div>
      <main className="flex-grow">{children}</main>
    </div>
  );
}
