'use client';
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import GoogleDrivePicker, { GoogleDriveFileMetadata } from "../components/googleDrivePicker";
import { useDataContext } from "../DataContext";

export default function DatasetSelectionPage() {
  const { metadata, setMetadata, accessToken, setAccessToken } = useDataContext();
  const router = useRouter();

  const handleFilePicked = useCallback(
    (newAccessToken: string, newMetadata: GoogleDriveFileMetadata) => {
      setMetadata(newMetadata);
      setAccessToken(newAccessToken);
    },
    [setMetadata, setAccessToken]
  );

  const handleConfirm = useCallback(() => {
    if (metadata && accessToken) {
      router.push("/data/data-cleaning");
    }
  }, [metadata, accessToken, router]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Import data from Google Drive</h1>
      <GoogleDrivePicker handleFilePicked={handleFilePicked} />
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