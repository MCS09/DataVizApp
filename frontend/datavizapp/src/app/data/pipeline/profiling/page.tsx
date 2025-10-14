"use client";
import { useEffect, useState } from "react";
import ColumnProfileList from "./components/ColumnProfileList";
import { ColumnProfile } from "@/app/components/input/Fieldset";
import { fetchData, postData, safeJsonParse } from "@/lib/api";
import { Column } from "@/lib/hooks/useColumns";
import useStore from "@/lib/store";
import { AIResponse } from "../layout";
import Button from "@/app/components/input/Button";

// Get Column Profile
export const getColumnProfile = async (datasetId: number) =>
  await fetchData<ColumnProfile[]>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnsByDatasetId/${datasetId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

export type ColumnsDto = {
  datasetId: number;
  newColumns: ColumnProfile[];
  columnNamesMap: { oldColumnName: string; newColumnName: string }[];
};

export const saveColumns = async (body: ColumnsDto) =>
  await postData(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/setColumns`,
    body
  );

export default function ProfilingPage() {
  const [datasetId, setDatasetId] = useState<number | undefined>();
  const [columns, setColumns] = useState<
    { columnHeader: string; columnProfile: ColumnProfile & { oldColumnName?: string } }[]
  >([]);
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
    if (!newColumns[index].columnProfile.oldColumnName) {
      newColumns[index].columnProfile.oldColumnName =
        newColumns[index].columnProfile.columnName;
    }
    newColumns[index].columnProfile = updatedColumn;

    // Keep consistent ordering by columnNumber
    const sorted = newColumns.sort(
      (a, b) => a.columnProfile.columnNumber - b.columnProfile.columnNumber
    );

    setColumns(sorted);
    updateState({ aiContext: JSON.stringify(sorted) });
  };

  // Load column profiles (from backend or AI)
  useEffect(() => {
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
      const cols = getColumnsFromAI() ?? (await fetchColumns());
      if (cols) {
        setColumns(cols);
        updateState({ aiContext: JSON.stringify(cols) });
      }
    };
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
            await saveColumns({
              datasetId: datasetId,
              newColumns: columns.map((e) => ({
                columnNumber: e.columnProfile.columnNumber,
                columnName: e.columnProfile.columnName,
                columnDescription: e.columnProfile.columnDescription,
                dataType: e.columnProfile.dataType,
                relationship: e.columnProfile.relationship,
              })),
              columnNamesMap: columns.map((c) => ({
                oldColumnName:
                  c.columnProfile.oldColumnName || c.columnProfile.columnName,
                newColumnName: c.columnProfile.columnName,
              })),
            });
          }}
        />
      </div>
    </div>
  );
}