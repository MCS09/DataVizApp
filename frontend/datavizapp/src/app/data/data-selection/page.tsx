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

  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const [loading, setLoading] = useState(false);

  const { data: session } = useSession();
  const [latest, setLatest] = useState<Dataset | null>(null);

  const [datasetName, setDatasetName] = useState("");

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
    setDatasetName(file.name.replace(/\.[^/.]+$/, "")); // auto-fill without extension

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
      setFileData({ id: newMetadata.id, accessToken: newAccessToken });
      setMetadata(newMetadata);

      setFileName(newMetadata.name);
      setDatasetName(newMetadata.name.replace(/\.[^/.]+$/, "")); // auto-fill without extension

      // Fetch file contents
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${newMetadata.id}?alt=media`,
        { headers: { Authorization: `Bearer ${newAccessToken}` } }
      );
      const text = await res.text();
      const rows = text.trim().split("\n").map((row) => row.split(","));
      setPreviewHeaders(rows[0]);
      setPreviewData(rows.slice(1));
      setShowPreview(true);
    },
    [setFileData]
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

    setLoading(true);

    const datasetId = await createDataset(email, columns, dataFrame, "No Name");

    sessionStorage.setItem(
      "sessionFileData",
      JSON.stringify({ datasetId: datasetId})
    );
    router.push(ROUTES.datasetProfilingPage);
  };

  const handleUploadSourceChange = (source: "local" | "google") => {
    setUploadSource(source);
    setFileName("");
    setDatasetName("");
    setPreviewHeaders([]);
    setPreviewData([]);
    setShowPreview(false);
    setMetadata(null);
  };

  // ---- Fetch datasets ---- //
    useEffect(() => {
      async function fetchDatasets() {
        if (!email) return;
        console.log("Fetching dataset for email:", email);
        const result = await getDatasetDetail(email);
        setDatasets(result.datasets || []);
        const latest = result.datasets.reduce(
          (max, ds) => (ds.datasetId > max.datasetId ? ds : max),
          result.datasets[0]
        );
        setLatest(latest);
      }
      fetchDatasets();
    }, [email]);

  // ---- Render ---- //
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
                onClick={() => handleUploadSourceChange("local")}
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
                onClick={() => handleUploadSourceChange("google")}
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

                  {metadata && (
                    <div className="mt-6 text-slate-600">
                      <p>Selected: {metadata.name}</p>
                      <p>Type: {metadata.mimeType}</p>
                      <p>Size: {(metadata.sizeBytes / 1024).toFixed(2)} KB</p>
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
                {loading ? "Loading..." : "Continue to Clean"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dataset History Section */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Dataset History</h2>

        <div className="space-y-3">
          {/* Latest Dataset */}
          {latest && (
            <button
              onClick={handleConfirm}
              className="w-full flex items-center gap-3 rounded-xl border border-purple-300 bg-purple-50 p-4 hover:bg-purple-100 transition text-left"
            >
              <div className="flex-1">
                <p className="font-semibold text-purple-800">
                  {latest.datasetName || "Untitled Dataset"}
                </p>
                <p className="text-sm text-slate-600">ID: {latest.datasetId}</p>
              </div>
              <span className="px-2 py-1 text-xs rounded-full bg-purple-200 text-purple-700">
                Latest
              </span>
            </button>
          )}

          {/* Other Datasets */}
          {datasets
            .filter((d) => !latest || d.datasetId !== latest.datasetId)
            .map((dataset) => (
              <button
                key={dataset.datasetId}
                onClick={handleConfirm}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition text-left"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-800">
                    {dataset.datasetName || "Untitled Dataset"}
                  </p>
                  <p className="text-sm text-slate-600">ID: {dataset.datasetId}</p>
                </div>
              </button>
            ))}
        </div>
      </div>


      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-lg font-medium text-slate-700">Preparing profiling...</p>
          </div>
        </div>
      )}
    </div>
  );
}
