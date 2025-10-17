"use client";
import { useEffect, useRef, useState } from "react";
import type { DrivePickerElement } from "@googleworkspace/drive-picker-element";

export interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  sizeBytes: number;
}

interface GoogleDrivePickerProps {
  handleFilePicked: (accessToken: string, metadata: GoogleDriveFileMetadata) => void;
}

export default function GoogleDrivePicker({
  handleFilePicked,
}: GoogleDrivePickerProps) {
  const pickerRef = useRef<DrivePickerElement | null>(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // useEffect for handling library import
  useEffect(() => {
    import("@googleworkspace/drive-picker-element").then(() => {
      setIsLibraryLoaded(true);
    });
  }, []);

  // useEffect for handling picker events
  useEffect(() => {
    // Only run this effect if the picker is visible and the library is loaded
    if (!isLibraryLoaded || !isPickerVisible || !pickerRef.current) {
      return;
    }

    const picker = pickerRef.current;

    const handleAuthenticated = (e: Event) => {
      const token = (e as CustomEvent).detail.token as string;
      setAccessToken(token); // Store the token
    };

    const handlePicked = (e: Event) => {
      const pickedFile = (e as CustomEvent).detail.docs?.[0];
      if (pickedFile) {
        const metadata: GoogleDriveFileMetadata = {
          id: pickedFile.id,
          name: pickedFile.name,
          mimeType: pickedFile.mimeType,
          url: pickedFile.url,
          sizeBytes: pickedFile.sizeBytes,
        };
        if (accessToken == null) {
          throw new Error("Error opening file, access token missing");
        }
        handleFilePicked(accessToken, metadata);
        setIsPickerVisible(false); // Close picker after a file is picked
      }
    };

    const handleClosed = () => {
      setIsPickerVisible(false); // Update state when the picker is closed
    };

    picker.addEventListener("picker:authenticated", handleAuthenticated);
    picker.addEventListener("picker:picked", handlePicked);
    picker.addEventListener("picker:closed", handleClosed);

    // Show the picker after the component has rendered
    picker.visible = true;

    return () => {
      picker.removeEventListener("picker:authenticated", handleAuthenticated);
      picker.removeEventListener("picker:picked", handlePicked);
      picker.removeEventListener("picker:closed", handleClosed);
      // Reset picker visibility on cleanup
      if (picker) {
        picker.visible = false;
      }
    };
  }, [isLibraryLoaded, isPickerVisible, handleFilePicked, accessToken]);

  const handleOpenPicker = () => {
    if (isLibraryLoaded) {
      // Force a fresh state by toggling off then on
      setIsPickerVisible(false);
      setTimeout(() => {
        setIsPickerVisible(true);
      }, 0);
    }
  };

  return (
    <div className="text-center">
      <button
        onClick={handleOpenPicker}
        disabled={!isLibraryLoaded}
        className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg ${
          isLibraryLoaded
            ? "bg-[#0F9D58] hover:bg-[#0c7a46] text-white cursor-pointer hover:scale-105"
            : "bg-slate-300 text-slate-500 cursor-not-allowed"
        }`}
      >
        {isLibraryLoaded ? "Open Google Drive" : "Loading..."}
      </button>

      {isPickerVisible && (
        <drive-picker
          ref={pickerRef}
          app-id={process.env.NEXT_PUBLIC_GOOGLE_APP_ID!}
          client-id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
          scope="https://www.googleapis.com/auth/drive.readonly"
        >
          <drive-picker-docs-view mime-types="text/csv"></drive-picker-docs-view>
        </drive-picker>
      )}
    </div>
  );
}