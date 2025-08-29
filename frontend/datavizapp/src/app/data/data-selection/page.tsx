"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import GoogleDrivePicker, {
  GoogleDriveFileMetadata,
} from "../components/googleDrivePicker";
import { ROUTES } from "@/constants/routes";
import { fetchData } from "@/lib/api";
import { useSession } from "next-auth/react";
import { Dataset } from "@/lib/dataset";
import {
  DataFrame,
  mapDataFrameToColumnData,
  useLoadDataFrame,
} from "@/lib/hooks/cleaningHooks";
import { ColumnProfile } from "../pipeline/profiling/components/CarouselItem";

// Create Dataset object in DB
const createDataset = async (
  userEmail: string,
  columns: ColumnProfile[],
  dataFrame: DataFrame,
  datasetName: string
) => {
  const dataset = await fetchData<Dataset>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userEmail,
        columns: columns,
        datasetName: datasetName
      }),
    }
  );

  const columnDataArr = mapDataFrameToColumnData(
    dataset.datasetId.toString(),
    dataFrame
  );

  await Promise.all(
    columnDataArr.map((columnData) =>
      fetchData(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/setColumnData`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(columnData),
        }
      )
    )
  );

  return dataset.datasetId;
};

export default function DatasetSelectionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [metadata, setMetadata] = useState<GoogleDriveFileMetadata | null>(
    null
  );
  const { dataFrame, setFileData, columns } = useLoadDataFrame();

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
    if (
      !metadata ||
      !dataFrame ||
      dataFrame.length === 0 ||
      !email ||
      !columns
    ) {
      return;
    }

    const datasetId = await createDataset(email, columns, dataFrame, "No Name");

    sessionStorage.setItem(
      "sessionFileData",
      JSON.stringify({ datasetId: datasetId })
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
              {dataFrame && session && (
                <button className="btn" onClick={handleConfirm}>
                  Confirm
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
