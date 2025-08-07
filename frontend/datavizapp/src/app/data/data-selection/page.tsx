"use client";
import { useCallback, useState } from "react";
import GoogleDrivePicker, {
  GoogleDriveFileMetadata,
} from "./components/googleDrivePicker";

export default function DatasetSelectionPage() {
  const [metadata, setMetadata] = useState<GoogleDriveFileMetadata | null>(null);

  const handleFilePicked = useCallback(
    (accessToken: string, metadata: GoogleDriveFileMetadata) => {
      setMetadata(metadata);
      downloadFile(metadata.id, accessToken);
    },
    []
  );

  async function downloadFile(fileId: string, accessToken: string) {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // You can process the downloaded file here.
      // For example, get the file as a Blob and create a download link.
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "downloaded-file"; // You can get the file name from picker metadata
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  }
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
              <button className="btn btn-primary">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
