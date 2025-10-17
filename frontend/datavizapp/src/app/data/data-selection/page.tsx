"use client";
import { useCallback, useState, useEffect } from "react";
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

//
// --- Main Component ---
//

export default function DatasetSelectionPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
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
        } else {
          setDatasets([]);
        }
      } catch (error) {
        console.error("Failed to fetch dataset history:", error);
      }
    }
    fetchDatasets();
  }, [session]);


  // --- Render ---

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            Dataset Manager
          </h1>
          <p className="mt-3 text-lg text-slate-600">Import new datasets or continue with saved ones</p>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Import Section */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 opacity-50 blur-2xl"></div>
            
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Import Dataset</h2>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-8 text-center">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-md transition-transform hover:scale-105">
                  <img
                    className="h-16 w-16"
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/512px-Google_Drive_icon_%282020%29.svg.png"
                    alt="Google Drive"
                  />
                </div>
                
                <h3 className="mb-3 text-lg font-semibold text-slate-800">Connect Google Drive</h3>
                <p className="mb-6 text-sm text-slate-600">Import your datasets directly from Google Drive</p>
                
                <GoogleDrivePicker handleFilePicked={handleFilePicked} />
                
                {fileName && (
                  <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 rounded-lg bg-green-50 p-4 duration-500">
                    <div className="flex items-center gap-2 text-green-700">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Selected:</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{fileName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-xl">
            <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 opacity-50 blur-2xl"></div>
            
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Saved Datasets</h2>
              </div>

              <div className="h-[400px] space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-slate-300">
                {datasets.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-4 rounded-full bg-slate-100 p-4">
                      <svg className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-slate-600">No saved datasets yet</p>
                    <p className="mt-2 text-sm text-slate-500">Import your first dataset to get started</p>
                  </div>
                ) : (
                  datasets.map((dataset, idx) => {
                    const isSelected = selectedHistoryId === dataset.datasetId;
                    const isLatest = idx === 0;
                    return (
                      <div
                        key={dataset.datasetId}
                        className={`overflow-hidden rounded-xl border-2 transition-all ${
                          isLatest
                            ? "border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50 shadow-md"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                        }`}
                      >
                        <button
                          onClick={() => handleHistoryClick(dataset.datasetId)}
                          className="flex w-full items-center gap-4 p-5 text-left transition-all"
                        >
                          <div className={`rounded-lg p-2 ${isLatest ? "bg-purple-200" : "bg-slate-100"}`}>
                            <svg className={`h-6 w-6 ${isLatest ? "text-purple-600" : "text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold ${isLatest ? "text-purple-900" : "text-slate-800"}`}>
                              {dataset.datasetName || "Untitled Dataset"}
                            </p>
                            <p className="text-sm text-slate-600">Dataset ID: {dataset.datasetId}</p>
                          </div>
                          {isLatest && (
                            <span className="rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                              Latest
                            </span>
                          )}
                        </button>
                        {isSelected && (
                          <div className="animate-in fade-in slide-in-from-top-2 border-t border-slate-200 bg-slate-50 p-4 duration-300">
                            <div className="flex gap-3">
                              <button
                                className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-md"
                                onClick={() => handleHistorySelection(dataset)}
                              >
                                Continue Analysis
                              </button>
                              <button
                                className="flex-1 rounded-lg border-2 border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 hover:border-red-300"
                                onClick={() => handleDeleteRequest(dataset.datasetId)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview/Confirmation Section */}
        {showPreview && (
          <div className="animate-in fade-in slide-in-from-bottom-8 mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 p-8 shadow-xl duration-500">
            <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-white">Ready to Profile Your Dataset</h3>
                <p className="mt-2 text-purple-100">Click continue to start analyzing your data</p>
              </div>
              <button
                type="button"
                className="group relative overflow-hidden rounded-xl bg-white px-8 py-4 font-semibold text-purple-600 shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                onClick={handleConfirm}
                disabled={loading}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue to Profile
                      <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDeleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
            <div className="animate-in zoom-in-95 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl duration-300">
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-white/20 p-2">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Delete Dataset</h3>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-slate-700">
                  Are you sure you want to permanently delete dataset <span className="font-semibold">ID {confirmDeleteId}</span>?
                </p>
                <p className="mt-2 text-sm text-slate-500">This action cannot be undone.</p>
                
                {deleteError && (
                  <div className="mt-4 rounded-lg border-2 border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-700">{deleteError}</p>
                  </div>
                )}
                
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Add your delete logic here
                      setConfirmDeleteId(null);
                    }}
                    className="flex-1 rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 font-semibold text-white shadow-sm transition-all hover:from-red-700 hover:to-red-800 hover:shadow-md"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}