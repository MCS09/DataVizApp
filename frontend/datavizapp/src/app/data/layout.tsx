"use client";
import Steps from "./components/steps";
import { usePathname } from "next/navigation";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import React, { useState } from "react";
import { DataContext } from "./DataContext";
import type { GoogleDriveFileMetadata } from "./components/googleDrivePicker";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function DataPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentPathname = usePathname();
  const [fileId, setFileId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<GoogleDriveFileMetadata | null>(null);

  return (
    <DataContext.Provider
      value={{ fileId, setFileId, accessToken, setAccessToken, metadata, setMetadata }}
    >
      <div className="min-h-screen flex flex-col" data-theme="lofi">
        <div className="w-full p-6 flex justify-center">
          <Steps pathname={currentPathname} />
        </div>
        <main className="flex-grow">{children}</main>
      </div>
    </DataContext.Provider>
  );
}