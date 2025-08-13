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

// interface GoogleDrivePickerProps {
//   handleFilePicked: (accessToken: string, metadata: GoogleDriveFileMetadata) => void;
// }
interface GoogleDrivePickerProps {
  handleFilePicked: (accessToken: string, metadata: GoogleDriveFileMetadata) => void;
  clientId: string;
  developerKey?: string;
  scope?: string;
  appId?: string;
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
        if (accessToken == null){
          throw new Error ("Error opening file, access token missing")
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
    };
  }, [isLibraryLoaded, isPickerVisible, handleFilePicked, accessToken]);

  const handleOpenPicker = () => {
    if (isLibraryLoaded) {
      setIsPickerVisible(true);
    }
  };

  return (
    <div>
      <button
        onClick={handleOpenPicker}
        disabled={!isLibraryLoaded}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: isLibraryLoaded ? "#1a73e8" : "#ccc",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: isLibraryLoaded ? "pointer" : "not-allowed",
          marginBottom: "1rem",
        }}
      >
        Open Drive Picker
      </button>

      {isPickerVisible && (
        <drive-picker
          ref={pickerRef}
          app-id={process.env.NEXT_PUBLIC_GOOGLE_APP_ID!}
          client-id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
          scope="https://www.googleapis.com/auth/drive.readonly"
        >
        </drive-picker>
      )}
    </div>
  );
}

// "use client";

// import { useEffect, useRef, useState } from "react";
// import type { DrivePickerElement, DrivePickerElementProps } from "@googleworkspace/drive-picker-element";

// export interface GoogleDriveFileMetadata {
//   id: string;
//   name: string;
//   mimeType: string;
//   url: string;
//   sizeBytes: number;
// }

// interface GoogleDrivePickerProps {
//   handleFilePicked: (accessToken: string, metadata: GoogleDriveFileMetadata) => void;
//   clientId: string;
//   developerKey?: string;
//   scope?: string;
//   appId?: string;
// }

// export default function GoogleDrivePicker({
//   handleFilePicked,
//   clientId,
//   developerKey,
//   scope = "https://www.googleapis.com/auth/drive.readonly",
//   appId,
// }: GoogleDrivePickerProps) {
//   const pickerRef = useRef<DrivePickerElement | null>(null);
//   const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
//   const [isPickerVisible, setIsPickerVisible] = useState(false);
//   const [accessToken, setAccessToken] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const loadLibrary = async () => {
//       try {
//         if (!clientId) {
//           throw new Error("Google Client ID is required");
//         }

//         await import("@googleworkspace/drive-picker-element");
//         setIsLibraryLoaded(true);
//       } catch (err) {
//         setError("Failed to load Google Drive Picker library");
//         console.error("Error loading Google Drive Picker:", err);
//       }
//     };

//     loadLibrary();
//   }, [clientId]);

//   useEffect(() => {
//     if (!isLibraryLoaded || !isPickerVisible || !pickerRef.current) return;

//     const picker = pickerRef.current;

//     // Set required attributes
//     picker.setAttribute("client-id", clientId);
//     picker.setAttribute("scope", scope);
//     if (developerKey) picker.setAttribute("developer-key", developerKey);
//     if (appId) picker.setAttribute("app-id", appId);

//     const handleAuthenticated = (e: Event) => {
//       const token = (e as CustomEvent).detail.token as string;
//       setAccessToken(token);
//       setError(null);
//     };

//     const handlePicked = (e: Event) => {
//       try {
//         const pickedFile = (e as CustomEvent).detail.docs?.[0];
//         if (!pickedFile) return;

//         if (!accessToken) {
//           throw new Error("Access token missing");
//         }

//         const metadata: GoogleDriveFileMetadata = {
//           id: pickedFile.id,
//           name: pickedFile.name,
//           mimeType: pickedFile.mimeType,
//           url: pickedFile.url,
//           sizeBytes: pickedFile.sizeBytes,
//         };

//         handleFilePicked(accessToken, metadata);
//         setIsPickerVisible(false);
//       } catch (err) {
//         setError(err instanceof Error ? err.message : "Failed to process file");
//       }
//     };

//     const handleClosed = () => {
//       setIsPickerVisible(false);
//     };

//     const handleError = (e: Event) => {
//       const error = (e as CustomEvent).detail.error;
//       setError(error?.message || "Google Drive Picker error");
//     };

//     picker.addEventListener("picker:authenticated", handleAuthenticated);
//     picker.addEventListener("picker:picked", handlePicked);
//     picker.addEventListener("picker:closed", handleClosed);
//     picker.addEventListener("picker:error", handleError);

//     // Show the picker after setting up event listeners
//     picker.visible = true;

//     return () => {
//       picker.removeEventListener("picker:authenticated", handleAuthenticated);
//       picker.removeEventListener("picker:picked", handlePicked);
//       picker.removeEventListener("picker:closed", handleClosed);
//       picker.removeEventListener("picker:error", handleError);
//     };
//   }, [isLibraryLoaded, isPickerVisible, handleFilePicked, accessToken, clientId, scope, developerKey, appId]);

//   const handleOpenPicker = () => {
//     if (!isLibraryLoaded) return;
//     setError(null);
//     setIsPickerVisible(true);
//   };

//   return (
//     <div className="drive-picker-container">
//       <button
//         onClick={handleOpenPicker}
//         disabled={!isLibraryLoaded}
//         className={`drive-picker-button ${!isLibraryLoaded ? 'disabled' : ''}`}
//       >
//         {isLibraryLoaded ? 'Open Google Drive' : 'Loading...'}
//       </button>

//       {error && (
//         <div className="error-message">
//           {error}
//         </div>
//       )}

//       {isPickerVisible && (
//         <drive-picker
//           ref={pickerRef}
//           // These are now set via setAttribute in useEffect
//         />
//       )}

//       <style jsx>{`
//         .drive-picker-container {
//           display: flex;
//           flex-direction: column;
//           gap: 0.5rem;
//         }
        
//         .drive-picker-button {
//           padding: 0.5rem 1rem;
//           background-color: #1a73e8;
//           color: white;
//           border: none;
//           border-radius: 4px;
//           cursor: pointer;
//           font-weight: 500;
//           transition: background-color 0.2s;
//         }
        
//         .drive-picker-button:hover {
//           background-color: #1765cc;
//         }
        
//         .drive-picker-button.disabled {
//           background-color: #cccccc;
//           cursor: not-allowed;
//         }
        
//         .error-message {
//           color: #d32f2f;
//           font-size: 0.875rem;
//           margin-top: 0.25rem;
//         }
//       `}</style>
//     </div>
//   );
// }