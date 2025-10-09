"use client";
import { useRef, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GoogleDrivePicker, { GoogleDriveFileMetadata } from "../components/googleDrivePicker";
import { ROUTES } from "@/constants/routes";
import { fetchData } from "@/lib/api";
import { useSession } from "next-auth/react";
import { Dataset, UserDatasetsDto } from "@/lib/dataset";
//
// --- Backend Helper Functions ---
//

// Backend: import dataset from Google Drive
const importFromDrive = async (
  userId: string,
  fileId: string,
  accessToken: string,
  datasetName: string
) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/importFromDrive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, fileId, accessToken, datasetName }),
  });
  if (!response.ok) throw new Error(`Import failed: ${response.statusText}`);
  return response.json(); // { datasetId, columnsInserted, status }
};

// Backend: user dataset management
const getDatasetDetail = async (userId: string) =>
  await fetchData<UserDatasetsDto>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/userDatasets/${userId}`,
    { method: "GET", headers: { "Content-Type": "application/json" } }
  );

const deleteDatasetById = async (datasetId: number) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) return false;
  try {
    const response = await fetch(`${backendUrl}/api/Dataset/${datasetId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    return response.status === 204 || response.status === 404 || response.ok;
  } catch (error) {
    console.error("Failed to delete dataset:", error);
    return false;
  }
};

//
// --- Main Component ---
//

export default function DatasetSelectionPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const [latest, setLatest] = useState<Dataset | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  // Only Google Drive upload
  const [fileData, setGoogleFileData] = useState<{ id: string; accessToken: string } | null>(null);
  const [metadata, setMetadata] = useState<GoogleDriveFileMetadata | null>(null);

  const handleFilePicked = useCallback(
    async (newAccessToken: string, newMetadata: GoogleDriveFileMetadata) => {
      setGoogleFileData({ id: newMetadata.id, accessToken: newAccessToken });
      setMetadata(newMetadata);
      setFileName(newMetadata.name);
      setDatasetName(newMetadata.name.replace(/\.[^/.]+$/, ""));
      setShowPreview(true);
    },
    []
  );

  const handleConfirm = async () => {
    const email = session?.user?.email ?? "";
    if (!email) return;

    setLoading(true);

    try {
      let datasetId: number;
      if (fileData && metadata) {
        const { datasetId: newId } = await importFromDrive(
          email,
          fileData.id,
          fileData.accessToken,
          metadata.name
        );
        datasetId = newId;
      } else {
        console.error("Missing required data for dataset creation.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("sessionFileData", JSON.stringify({ datasetId }));
      router.push(ROUTES.datasetProfilingPage);
    } catch (error) {
      console.error("Failed to import dataset:", error);
      setLoading(false);
    }
  };

  // --- History Management ---

  const handleHistorySelection = (dataset: Dataset) => {
    sessionStorage.setItem("sessionFileData", JSON.stringify({ datasetId: dataset.datasetId }));
    router.push(ROUTES.datasetProfilingPage);
  };

  const handleHistoryClick = (datasetId: number) => {
    setSelectedHistoryId((curr) => (curr === datasetId ? null : datasetId));
  };

  const handleDeleteRequest = (datasetId: number) => {
    setDeleteError(null);
    setConfirmDeleteId(datasetId);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setConfirmDeleteId(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleteLoading(true);
    const success = await deleteDatasetById(confirmDeleteId);
    if (!success) {
      setDeleteError("Failed to delete dataset. Please try again.");
      setDeleteLoading(false);
      return;
    }
    setDatasets((prev) => prev.filter((ds) => ds.datasetId !== confirmDeleteId));
    setConfirmDeleteId(null);
    setDeleteLoading(false);
  };

  // --- Fetch user datasets ---

  useEffect(() => {
    async function fetchDatasets() {
      const email = session?.user?.email;
      if (!email) return;
      try {
        const result = await getDatasetDetail(email);
        if (result && result.datasets.length > 0) {
          const sorted = [...result.datasets].sort((a, b) => b.datasetId - a.datasetId);
          setDatasets(sorted);
          setLatest(sorted[0]);
        } else {
          setDatasets([]);
          setLatest(null);
        }
      } catch (error) {
        console.error("Failed to fetch dataset history:", error);
      }
    }
    fetchDatasets();
  }, [session]);


  // --- Render ---

  return (
    <div className="flex flex-col gap-2">
      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 card rounded-xl p-6">
          <div className="p-12 text-center border rounded-lg border-dashed border-slate-300">
            <svg
              className="w-16 h-16 text-green-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4l2.5 4.5h-5L12 4zm0 16l-2.5-4.5h5L12 20zm-8-8l4.5-2.5v5L4 12zm16 0l-4.5 2.5v-5L20 12z" />
            </svg>
            <p className="text-lg mb-4 text-slate-800">Select your CSV file from Google Drive</p>
            <GoogleDrivePicker handleFilePicked={handleFilePicked} />
            {fileName && <p className="mt-4 text-slate-600">Selected: {fileName}</p>}
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-1 card rounded-xl p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Dataset History</h2>
          <div className="h-[350px] overflow-y-auto pr-2 space-y-3">
            {datasets.map((dataset, idx) => {
              const isSelected = selectedHistoryId === dataset.datasetId;
              return (
                <div key={dataset.datasetId} className={`w-full rounded-xl border transition ${idx === 0 ? "border-purple-300 bg-purple-50 hover:bg-purple-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  <button onClick={() => handleHistoryClick(dataset.datasetId)} className="flex w-full items-center gap-3 rounded-xl p-4 text-left">
                    <div className="flex-1">
                      <p className={`font-semibold ${idx === 0 ? "text-purple-800" : "text-slate-800"}`}>{dataset.datasetName || "Untitled Dataset"}</p>
                      <p className="text-sm text-slate-600">ID: {dataset.datasetId}</p>
                    </div>
                    {idx === 0 && <span className="rounded-full bg-purple-200 px-2 py-1 text-xs text-purple-700">Latest</span>}
                  </button>
                  {isSelected && (
                    <div className="flex gap-3 border-t border-slate-200 px-4 py-3">
                      <button className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" onClick={() => handleHistorySelection(dataset)}>
                        Apply to Profiling
                      </button>
                      <button className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100" onClick={() => handleDeleteRequest(dataset.datasetId)}>
                        Delete Dataset
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="card rounded-xl p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Dataset Preview</h2>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full table-auto text-left">
              <thead className="bg-slate-100">
                <tr>{previewHeaders.map((h, i) => <th key={i} className="px-4 py-2">{h}</th>)}</tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className="px-4 py-2">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold disabled:opacity-50"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Loading..." : "Continue to Profile"}
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete dataset?</h3>
            <p className="mt-2 text-sm text-slate-600">This will permanently delete dataset ID {confirmDeleteId}.</p>
            {deleteError && <p className="mt-3 bg-red-50 p-3 text-sm text-red-600 rounded-lg border border-red-200">{deleteError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}