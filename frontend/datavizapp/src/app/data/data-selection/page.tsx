'use client';
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import GoogleDrivePicker, { GoogleDriveFileMetadata } from "../components/googleDrivePicker";
import { useDataContext } from "../DataContext";

export default function DatasetSelectionPage() {
  const { metadata, setMetadata, accessToken, setAccessToken } = useDataContext();
  const router = useRouter();

  // const handleFilePicked = useCallback(
  //   (newAccessToken: string, newMetadata: GoogleDriveFileMetadata) => {
  //     setMetadata(newMetadata);
  //     setAccessToken(newAccessToken);
  //   },
  //   [setMetadata, setAccessToken]
  // );

  const handleFilePicked = useCallback(
    (newAccessToken: string, newMetadata: GoogleDriveFileMetadata) => {
      try {
        // Validate inputs
        if (!newAccessToken || typeof newAccessToken !== 'string') {
          console.log('Invalid access token:', newAccessToken);
          throw new Error('Invalid access token');
        }

        if (!newMetadata || typeof newMetadata !== 'object') {
          console.log('Invalid file metadata:', newMetadata);
          throw new Error('Invalid file metadata');
        }

        // Required metadata fields validation
        const requiredFields = ['id', 'name', 'mimeType', 'url', 'sizeBytes'];
        for (const field of requiredFields) {
          if (!(field in newMetadata)) {
            console.log('Missing required field:', field);
            throw new Error(`Missing required field: ${field}`);
          }
        }

        // Update state
        setMetadata(newMetadata);
        setAccessToken(newAccessToken);

        // Log successful selection
        console.log('Google Drive file selected:', {
          name: newMetadata.name,
          type: newMetadata.mimeType,
          size: `${(newMetadata.sizeBytes / 1024).toFixed(2)} KB`
        });

      } catch (error) {
        console.error('Error handling picked file:', error);
        // You might want to set an error state here
      }
    },
    [setMetadata, setAccessToken]
  );

  // const handleConfirm = useCallback(() => {
  //   if (metadata && accessToken) {
  //     router.push("/data/data-cleaning");
  //   }
  // }, [metadata, accessToken, router]);

  const handleConfirm = useCallback(() => {
    if (metadata && accessToken) {
      // Store in localStorage for persistence
      console.log('Confirming file selection:', metadata, accessToken);
      localStorage.setItem('currentFile', JSON.stringify({
        metadata,
        accessToken
      }));
      router.push("/data/dataclean");
    }
  }, [metadata, accessToken, router]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Import data from Google Drive</h1>
      <GoogleDrivePicker
        clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
        developerKey={process.env.NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY}
        appId={process.env.NEXT_PUBLIC_GOOGLE_APP_ID}
        scope="https://www.googleapis.com/auth/drive.file"
        handleFilePicked={(token, metadata) => {
          console.log('File picked:', metadata);
          handleFilePicked(token, metadata);
        }}
      />
      {/* <GoogleDrivePicker
        handleFilePicked={(token, metadata) => {
          console.log('File picked:', metadata);
          handleFilePicked(token, metadata);
        }}
      /> */}
      {/* <GoogleDrivePicker
        clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
        scope="https://www.googleapis.com/auth/drive.file"
        handleFilePicked={handleFilePicked}
      /> */}
      {metadata && (
        <div className="card bg-base-100 w-96 shadow-sm">
          <h2 className="card-title">{metadata.name}</h2>
          <div className="card-body">
            <p>Type: {metadata.mimeType}</p>
            <p>Size: {(metadata.sizeBytes / 1024).toFixed(2)} KB</p>
            <div className="card-actions justify-end">
              <button className="btn btn-primary" onClick={handleConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}