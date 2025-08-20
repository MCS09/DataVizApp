"use client";
import { usePathname } from "next/navigation";
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 
import Steps from "./components/Steps";
 


// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

export default function DataPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathName = usePathname();
  return (
    <div className="min-h-screen flex flex-col" data-theme="lofi">
      <div className="w-full p-6 flex justify-center">
        <Steps pathname={pathName} />
      </div>
      <main className="flex-grow">{children}</main>
    </div>
  );
}
