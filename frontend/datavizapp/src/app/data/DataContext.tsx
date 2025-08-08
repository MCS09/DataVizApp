"use client";
import { createContext, useContext } from "react";
import type { GoogleDriveFileMetadata } from "./components/googleDrivePicker";

type DataContextType = {
  fileId: string | null;
  setFileId: (id: string | null) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  metadata: GoogleDriveFileMetadata | null;
  setMetadata: (metadata: GoogleDriveFileMetadata | null) => void;
};

export const DataContext = createContext<DataContextType | undefined>(undefined);

export function useDataContext() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within a DataContext.Provider");
  }
  return context;
}