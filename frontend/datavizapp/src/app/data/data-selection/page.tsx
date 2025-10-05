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
import { ColumnProfile } from "@/app/components/input/Fieldset";
import pako from "pako";

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
        "Content-Encoding": "gzip",
      },
      body: new Blob([
        pako.gzip(
          JSON.stringify({
            userId: userEmail,
            columns: columns,
            datasetName: datasetName,
          })
        ),
      ]),
    }
  );

  const columnDataArr = mapDataFrameToColumnData(
    dataset.datasetId.toString(),
    dataFrame
  );

  const batchSize = 500;
  const promises: Promise<any>[] = [];
  for (let i = 0; i < columnDataArr.length; i += batchSize) {
    const batch = columnDataArr.slice(i, i + batchSize);
    promises.push(
      fetchData(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/setColumnDataBatch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Encoding": "gzip",
          },
          body: new Blob([pako.gzip(JSON.stringify({ columnDataList: batch }))]),
        }
      )
    );
  }
  await Promise.all(promises);

  return dataset.datasetId;
};

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
  const res = await getDatasetDetail(userId);
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
  const router = useRouter();
  
  const { dataFrame, setFileData, columns } = useLoadDataFrame();

  const handleFileUploadLocal = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileData(file);

    setFileName(file.name);
    setDatasetName(file.name.replace(/\.[^/.]+$/, ""));

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.trim().split("\n").map((row) => row.split(","));
      setPreviewHeaders(rows[0] || []);
      setPreviewData(rows.slice(1));
      setShowPreview(true);
    };
    reader.readAsText(file);
  };

  const handleFilePicked = useCallback(
    async (newAccessToken: string, newMetadata: GoogleDriveFileMetadata) => {
      setFileData({ id: newMetadata.id, accessToken: newAccessToken });
      setFileName(newMetadata.name);
      setDatasetName(newMetadata.name.replace(/\.[^/.]+$/, ""));

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${newMetadata.id}?alt=media`,
        { headers: { Authorization: `Bearer ${newAccessToken}` } }
      );
      const text = await res.text();
      const rows = text.trim().split("\n").map((row) => row.split(","));
      setPreviewHeaders(rows[0] || []);
      setPreviewData(rows.slice(1));
      setShowPreview(true);
    },
    [setFileData]
  );

  const handleConfirm = async () => {
    const email = session?.user?.email ?? "";
    if (
      !datasetName ||
      !dataFrame ||
      dataFrame.length === 0 ||
      !email ||
      !columns
    ) {
      console.error("Confirmation failed: Missing required data.");
      return;
    }

    setLoading(true);

    try {
      const datasetId = await createDataset(email, columns, dataFrame, datasetName);

      sessionStorage.setItem(
        "sessionFileData",
        JSON.stringify({ datasetId: datasetId })
      );
      router.push(ROUTES.datasetProfilingPage);
    } catch (error) {
      console.error("Failed to create dataset:", error);
      setLoading(false);
    }
  };

  const handleHistorySelection = (dataset: Dataset) => {
    setLoading(true);
    try {
      sessionStorage.setItem(
        "sessionFileData",
        JSON.stringify({ datasetId: dataset.datasetId })
      );
      router.push(ROUTES.datasetProfilingPage);
    } catch (error) {
      console.error("Failed to load dataset for profiling:", error);
      setLoading(false);
    }
  };

  const handleUploadSourceChange = (source: "local" | "google") => {
    setUploadSource(source);
    setFileName(null);
    setDatasetName("");
    setPreviewHeaders([]);
    setPreviewData([]);
    setShowPreview(false);
    setFileData(null);
  };

  useEffect(() => {
    async function fetchDatasets() {
      const email = session?.user?.email;
      if (!email) return;
      try {
        const result = await getDatasetDetail(email);
        if (result && result.datasets && result.datasets.length > 0) {
          const sorted = [...result.datasets].sort((a,b) => b.datasetId - a.datasetId);
          setDatasets(sorted);
          setLatest(sorted[0]);
        }
      } catch (error) {
        console.error("Failed to fetch dataset history:", error);
      }
    }
    fetchDatasets();
  }, [session]);

  // ---- Render ---- //
  return (
    // Main Container: Vertical flex layout
    <div className="flex flex-col gap-2">
      
      {/* --- Top Section: Contains Upload and History --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        
        {/* Top-Left Card: Upload Section */}
        <div className="lg:col-span-2 card rounded-xl p-6">
          <div className="upload-options mb-6">
             <div className="flex justify-center gap-4 mb-6">
              <button type="button" className={`px-4 py-2 rounded-xl font-semibold transition-colors ${ uploadSource === "local" ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-700"}`} onClick={() => handleUploadSourceChange("local")}>
                Local Upload
              </button>
              <button type="button" className={`px-4 py-2 rounded-xl font-semibold transition-colors ${ uploadSource === "google" ? "bg-green-600 text-white" : "bg-slate-200 text-slate-700"}`} onClick={() => handleUploadSourceChange("google")}>
                Google Drive
              </button>
            </div>
          </div>

          {uploadSource === "local" && (
            <div className="upload-zone rounded-lg p-12 text-center border-2 border-dashed border-purple-400 bg-slate-50 cursor-pointer transition-colors hover:border-purple-500 hover:bg-slate-100" onClick={() => fileInputRef.current?.click()}>
              <svg className="w-16 h-16 text-purple-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className="text-lg mb-2 text-slate-800">Drag and drop your CSV file here</p>
              <p className="text-slate-500 mb-4">or click to browse</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUploadLocal} />
              <button type="button" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-colors font-semibold">
                {fileName || "Choose File"}
              </button>
            </div>
          )}

          {uploadSource === "google" && (
            <div className="p-12 text-center border rounded-lg border-dashed border-slate-300">
              <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4l2.5 4.5h-5L12 4zm0 16l-2.5-4.5h5L12 20zm-8-8l4.5-2.5v5L4 12zm16 0l-4.5 2.5v-5L20 12z" /></svg>
              <p className="text-lg mb-4 text-slate-800">Select your CSV file from Google Drive</p>
              <GoogleDrivePicker handleFilePicked={handleFilePicked} />
              {fileName && <p className="mt-4 text-slate-600">Selected: {fileName}</p>}
            </div>
          )}
        </div>

        {/* Top-Right Card: Dataset History */}
        <div className="lg:col-span-1 card rounded-xl p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Dataset History</h2>
          <div className="h-[350px] overflow-y-auto pr-2">
              <div className="space-y-3">
              {datasets.map((dataset, index) => (
                  <button
                  key={dataset.datasetId}
                  onClick={() => handleHistorySelection(dataset)}
                  className={`w-full flex items-center gap-3 rounded-xl p-4 transition text-left ${
                      index === 0
                      ? "border border-purple-300 bg-purple-50 hover:bg-purple-100"
                      : "border border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  >
                  <div className="flex-1">
                      <p className={`font-semibold ${index === 0 ? "text-purple-800" : "text-slate-800"}`}>
                      {dataset.datasetName || "Untitled Dataset"}
                      </p>
                      <p className="text-sm text-slate-600">ID: {dataset.datasetId}</p>
                  </div>
                  {index === 0 && (
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-200 text-purple-700">Latest</span>
                  )}
                  </button>
              ))}
              </div>
          </div>
        </div>
      </div>

      {/* --- Bottom Section: Preview (Only shows when a file is selected) --- */}
      {showPreview && (
        <div className="card rounded-xl p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Dataset Preview</h2>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full table-auto text-left">
              <thead className="bg-slate-100">
                <tr>
                  {previewHeaders.map((h, i) => (
                    <th key={i} className="px-4 py-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl glow font-semibold disabled:opacity-50" onClick={handleConfirm} disabled={loading || !dataFrame}>
            {loading ? "Loading..." : "Continue to Profile"}
          </button>
        </div>
      )}

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
