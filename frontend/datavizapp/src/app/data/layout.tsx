"use client";
import { usePathname } from "next/navigation";
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 
import Steps from "./components/tempsteps";
import { useRouter } from "next/navigation";
import Button from "../components/input/Button";
import { ROUTES } from "@/constants/routes";
 


// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

export default function DataPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  let nextRoute = "";
  if (pathname === ROUTES.datasetProfilingPage) {
    nextRoute = ROUTES.datasetCleaningPage;
  } else if (pathname === ROUTES.datasetCleaningPage) {
    nextRoute = ROUTES.datasetVisualizationPage;
  }

  return (
    <div className="min-h-screen flex flex-col" data-theme="lofi">
      <div className="w-full p-6 flex justify-center">
        <Steps />
        <Button
          label={"Continue"}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl glow font-semibold disabled:opacity-50"
          disabled={!nextRoute}
          action={async () => {
            if (!nextRoute) {
              console.warn("No next route defined for this page");
              return;
            }
            router.push(nextRoute);
          }}
        />
      </div>
      <main className="flex-grow">{children}</main>
    </div>
  );
}
