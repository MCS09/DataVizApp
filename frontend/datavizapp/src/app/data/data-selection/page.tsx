"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import GoogleDrivePicker, {
  GoogleDriveFileMetadata,
} from "../components/googleDrivePicker";
import { ROUTES } from "@/constants/routes";
import { fetchData } from "@/lib/api";
import { useSession } from "next-auth/react";
import { ColumnProfile } from "../pipeline/profiling/components/Carousel";
import { Dataset } from "@/lib/dataset";
import { useLoadDataFrame } from "@/lib/hooks/cleaningHooks";

// Create Dataset object in DB
const createDataset = async (userEmail: string, columns: ColumnProfile[]) =>
  await fetchData<Dataset>(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: userEmail,
      columns: columns,
    }),
  });

export default function DatasetSelectionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { dataFrame, fileData, setFileData } = useLoadDataFrame();
  const [metadata, setMetadata] = useState<GoogleDriveFileMetadata | null>(
    null
  );

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
    if (!metadata || !fileData || !dataFrame || dataFrame.length === 0 || !email) {
      return;
    }

    const columns = Object.keys(dataFrame[0]).map((key, index) => ({
      columnName: key,
      columnDescription: "",
      dataType: "",
      columnNumber: index,
    }));

    const dataset = await createDataset(email, columns);
    sessionStorage.setItem(
      "datasetId",
      JSON.stringify({ datasetId: dataset.datasetId })
    );

    router.push(ROUTES.datasetProfilingPage);
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
              {dataFrame && session && 
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
