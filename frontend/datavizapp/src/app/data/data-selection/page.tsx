"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import GoogleDrivePicker, {
  GoogleDriveFileMetadata,
} from "../components/googleDrivePicker";
import { ROUTES } from "@/constants/routes";
import { fetchData } from "@/lib/api";
import { useSession } from "next-auth/react";
import { ColumnData, DataFrame, mapDataFrameToColumnData, useLoadDataFrame } from "@/lib/hooks/cleaningHooks";
import { ColumnProfile } from "../pipeline/profiling/components/CarouselItem";
import { Dataset, FileData, UserDatasetsDto } from "@/lib/dataset";

// Import dataset from Google Drive

const importFromDrive = async (userId: string, fileId: string, accessToken: string, datasetName: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/importFromDrive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, fileId, accessToken, datasetName }),
  });
  if (!response.ok) {
    throw new Error(`Import failed: ${response.statusText}`);
  }
  return response.json(); // { datasetId, columnsInserted, status }
};

export default function DatasetSelectionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [metadata, setMetadata] = useState<GoogleDriveFileMetadata | null>(
    null
  );
  const [fileData, setFileData] = useState<{ id: string; accessToken: string } | null>(null);

  const handleFilePicked = useCallback(
    async (newAccessToken: string, newMetadata: GoogleDriveFileMetadata) => {
      setFileData({
        id: newMetadata.id,
        accessToken: newAccessToken,
      });
      setMetadata(newMetadata);
    },
    [setFileData, setMetadata]
  );

  const handleConfirm = async () => {
    const email = session?.user?.email ?? "";
    if (!metadata || !fileData || !email) {
      return;
    }

    try {
      const { datasetId } = await importFromDrive(email, metadata.id, fileData.accessToken, metadata.name);

      sessionStorage.setItem(
        "sessionFileData",
        JSON.stringify({ datasetId })
      );

      router.push(ROUTES.datasetProfilingPage);
    } catch (error) {
      console.error("Failed to import dataset:", error);
    }
  };
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
              {fileData && session && 
                <button className="btn btn-primary" onClick={handleConfirm}>
                  Confirm
                </button>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
