"use client";
import { useRef, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GoogleDrivePicker, {
  GoogleDriveFileMetadata,
} from "../components/googleDrivePicker";
import { ROUTES } from "@/constants/routes";
import { fetchData } from "@/lib/api";
import { useSession } from "next-auth/react";
import { Dataset, UserDatasetsDto } from "@/lib/dataset";
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
}

const getDatasetDetail = async (userId: string) =>
  await fetchData<UserDatasetsDto>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/userDatasets/${userId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

// Normalize any common shapes -> Dataset[]
// function toDatasetArray(payload: unknown): Dataset[] {
//   if (Array.isArray(payload)) return payload as Dataset[];
//   if (payload && typeof payload === "object") {
//     const obj = payload as any;
//     if (Array.isArray(obj.data)) return obj.data as Dataset[];
//     if (Array.isArray(obj.value)) return obj.value as Dataset[];
//     // fallback: single object
//     return [obj as Dataset];
//   }
//   return [];
// }

// export async function loadLatestDataset(userId: string): Promise<Dataset | null> {
//   const res = await getDatasetDetail(userId);
//   const datasets = toDatasetArray(res);

//   if (datasets.length === 0) return null;

//   // coerce ids to numbers in case they're strings
//   return datasets.reduce((max, ds) =>
//     Number(ds.datasetId) > Number(max.datasetId) ? ds : max
//   );
// }

export async function loadLatestDataset(userId: string): Promise<Dataset | null> {
  const res = await getDatasetDetail(userId); // res: UserDatasetsDto

  if (!res || res.datasets.length === 0) return null;

  return res.datasets.reduce((max, ds) =>
    ds.datasetId > max.datasetId ? ds : max
  );
}

export default function DatasetSelectionPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [uploadSource, setUploadSource] = useState("local");

  const [datasetId, setDatasetId] = useState<number | undefined>();
  const [datasetName, setDatasetName] = useState<string | undefined>();

  const { data: session } = useSession();
  const [latest, setLatest] = useState<Dataset | null>(null);

  const email = session?.user?.email ?? "";

  const router = useRouter();
  const [metadata, setMetadata] = useState<GoogleDriveFileMetadata | null>(
    null
  );
  const {dataFrame, setFileData, columns} = useLoadDataFrame();

  const handleFileUploadLocal = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.trim().split("\n").map((row) => row.split(","));
      setPreviewHeaders(rows[0]);
      setPreviewData(rows.slice(1));
      setShowPreview(true);
    };
    reader.readAsText(file);
  };

  const handleFileUploadGoogleDrive = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.trim().split("\n").map((row) => row.split(","));
      setPreviewHeaders(rows[0]);
      setPreviewData(rows.slice(1));
      setShowPreview(true);
    };
    reader.readAsText(file);
  };

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

  useEffect(() => {
    async function fetchLatest() {
      console.log("Fetching latest dataset for email:", email);
      const result = await loadLatestDataset(email);
      setLatest(result);
    }
    fetchLatest();
  }, [email]);

  return (
    <div className="flex items-start gap-4">
      <div className="card rounded-xl p-8 flex-1">
        <div id="upload-step" className="step-content">
          <div
            className="upload-zone rounded-lg p-12 text-center mb-6 border border-dashed border-slate-300"
            // onClick={() => fileInputRef.current?.click()}
          >
            {/* Selection Path */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                type="button"
                className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                  uploadSource === "local"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
                onClick={() => setUploadSource("local")}
              >
                Local Upload
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                  uploadSource === "google"
                    ? "bg-green-600 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
                onClick={() => setUploadSource("google")}
              >
                Google Drive
              </button>
            </div>
            {/* Local Upload Zone */}
            {uploadSource === "local" && (
              <div
                className="upload-zone rounded-lg p-12 text-center border border-dashed border-slate-300 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  className="w-16 h-16 text-purple-500 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-lg mb-2 text-slate-800">
                  Drag and drop your CSV file here
                </p>
                <p className="text-slate-500 mb-4">or click to browse</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileUploadLocal}
                />
                <button
                  type="button"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-colors font-semibold"
                >
                  {fileName ? fileName : "Choose File"}
                </button>
              </div>
            )}

            {/* Google Drive Upload */}
              {uploadSource === "google" && (
                <div className="p-12 text-center border rounded-lg border-dashed border-slate-300">
                  <svg
                  className="w-16 h-16 text-green-500 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4l2.5 4.5h-5L12 4zm0 16l-2.5-4.5h5L12 20zm-8-8l4.5-2.5v5L4 12zm16 0l-4.5 2.5v-5L20 12z"
                  />
                </svg>
                <p className="text-lg mb-4 text-slate-800">
                  Select your CSV file from Google Drive
                </p>
            
                  {/* Google Picker button */}
                  <GoogleDrivePicker handleFilePicked={handleFilePicked} />
            
                  {/* If file metadata is available, show card */}
                  {metadata && (
                    <div className="card bg-base-100 w-96 shadow-sm mx-auto mt-6">
                      <h2 className="card-title">{metadata.name}</h2>
                      <div className="card-body">
                        <p>Type: {metadata.mimeType}</p>
                        <p>Size: {(metadata.sizeBytes / 1024).toFixed(2)} KB</p>
                        <div className="card-actions justify-end">
                          <button
                            className="btn btn-primary"
                            onClick={handleConfirm}
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>

          {showPreview && (
            <div id="preview-section">
              <h3 className="text-lg font-semibold mb-4">Data Preview</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full table-auto text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      {previewHeaders.map((header, idx) => (
                        <th key={idx} className="px-4 py-2">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl glow font-semibold"
                onClick={handleConfirm}
              >
                Continue to Clean
              </button>
            </div>
          )}
        </div>
      </div>
      <a
      href="/pipeline/profiling"
      className="flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 hover:border-purple-500 hover:bg-purple-50 transition p-6 text-center"
      >
      <div>
        <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full bg-purple-100 text-purple-600">
          previous dataset
        </div>
        <p className="font-medium text-slate-700">ID: {latest?.datasetId}</p>
        <p className="font-medium text-slate-700">Name: {latest?.datasetName}</p>
      </div>
      </a>
    </div>
  );
}
