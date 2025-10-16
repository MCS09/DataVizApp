"use client";
import { useEffect, useState } from "react";
import ColumnProfileList from "./components/ColumnProfileList";
import { safeJsonParse } from "@/lib/api";
import { Column } from "@/lib/hooks/useColumns";
import useStore from "@/lib/store";
import { AIResponse } from "../layout";
import Button from "@/app/components/input/Button";
import { ColumnProfile, getColumnProfile, saveColumns } from "@/lib/dataset";




export default function ProfilingPage() {
  const [datasetId, setDatasetId] = useState<number | undefined>();
  const [columns, setColumns] = useState<
    { columnHeader: string; columnProfile: ColumnProfile}[]
  >([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { sharedState, updateState } = useStore();

  // Load datasetId (From session storage)
  useEffect(() => {
    const stored = sessionStorage.getItem("sessionFileData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setDatasetId(parsed.datasetId);
    }
  }, []);

  // Update individual column
  const updateColumn = (index: number, updatedColumn: ColumnProfile) => {
    const newColumns = [...columns];
    newColumns[index].columnProfile = updatedColumn;

    // Keep consistent ordering by columnNumber
    const sorted = newColumns.sort(
      (a, b) => a.columnProfile.columnNumber - b.columnProfile.columnNumber
    );

    setColumns(sorted);
    updateState({ aiContext: JSON.stringify(sorted) });
  };

  const fetchColumns = async () => {
      if (!datasetId) return;
      const colsProfiles = await getColumnProfile(datasetId);
      return colsProfiles.map((curr) => ({
        columnHeader: curr.columnName,
        columnProfile: curr,
      }));
    };

    const getColumnsFromAI = () => {
      if (!sharedState.aiResponseContext) return;
      const aiResponse = safeJsonParse<AIResponse<string>>(
        sharedState.aiResponseContext
      );
      if (!aiResponse) return;
      const parsed = safeJsonParse<Column[]>(aiResponse.updatedData);
      return parsed ?? null;
    };

    const loadColumns = async () => {
      const originalColumns = await fetchColumns();
      const aiColumns = getColumnsFromAI();
      let cols = originalColumns;

      if (aiColumns && aiColumns.length > 0) {
        const allMatched = aiColumns.every(e =>
          originalColumns?.some(o => o.columnHeader === e.columnHeader)
        );

        if (allMatched) {
          cols = aiColumns.map(e => ({
            ...e,
            columnHeader:
              originalColumns?.find(o => o.columnHeader === e.columnHeader)
                ?.columnHeader ?? "error",
          }));
        } else {
          console.warn("AI response columns do not fully match original columns. Using originalColumns instead.");
        }
      }
      if (cols) {
        setColumns(cols);
        updateState({ aiContext: JSON.stringify(cols) });
      }
    };

  // Load column profiles (from backend or AI)
  useEffect(() => {
    loadColumns();
  }, [sharedState.aiResponseContext, datasetId]);

  // Render
  return (
    <div className="flex flex-col h-full">
      {/* Column List */}
      <ColumnProfileList columns={columns} updateColumn={updateColumn} />

      {/* Save Button */}
      <div className="flex justify-end p-4 border-t border-base-300">
        <Button
          label={"Save Changes"}
          className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl glow font-semibold disabled:opacity-50"
          action={async () => {
            if (!datasetId) return;
            const res = await saveColumns({
              datasetId: datasetId,
              newColumns: columns.map((e) => ({
                columnNumber: e.columnProfile.columnNumber,
                columnName: e.columnProfile.columnName,
                columnDescription: e.columnProfile.columnDescription,
                dataType: e.columnProfile.dataType,
                relationship: e.columnProfile.relationship,
              })),
              columnNamesMap: columns.map(e => {return {
                oldColumnName: e.columnHeader,
                newColumnName: e.columnProfile.columnName
              }}),
            });
          if (res) {
            setToastMessage("Changes saved successfully!");
            window.location.reload();
          } else {
            setToastMessage("Failed to save changes");
          }
          setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      </div>
      {toastMessage && (
        <div className="toast toast-top toast-start z-50">
          <div className="alert alert-info">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}