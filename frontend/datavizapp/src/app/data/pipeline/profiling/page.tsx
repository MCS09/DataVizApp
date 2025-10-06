"use client";
import { useEffect, useState } from "react";
import ColumnProfileList from "./components/ColumnProfileList";
import { ColumnProfile } from "@/app/components/input/Fieldset";
import { fetchData, postData, safeJsonParse } from "@/lib/api";
import { useColumns, Column } from "@/lib/hooks/useColumns";
import useStore from "@/lib/store";
import { AIResponse } from "../layout";
import Button from "@/app/components/input/Button";
import { useRouter } from "next/navigation";

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
  const [columns, setColumns] = useState<{columnHeader: string; columnProfile: ColumnProfile & { oldColumnName?: string }}[]>([]);
  const { sharedState, updateState } = useStore();
  const router = useRouter();

  // load datasetId (From session store)
  useEffect(() => {
    const stored = sessionStorage.getItem("sessionFileData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setDatasetId(parsed.datasetId);
    }
  }, []);

  const updateColumn = (index: number, updatedColumn: ColumnProfile) => {
    const newColumns = [...columns];

    // track old column name if not already tracked
    if (!newColumns[index].columnProfile.oldColumnName) {
      newColumns[index].columnProfile.oldColumnName = newColumns[index].columnProfile.columnName;
    }

    newColumns[index].columnProfile = updatedColumn;
    const sorted = newColumns.sort(
      (a, b) => a.columnProfile.columnNumber - b.columnProfile.columnNumber
    );

    setColumns(sorted);
    updateState({ aiContext: JSON.stringify(sorted) });
  };

  // Update column schema
  useEffect(() => {
    const fetchColumns = async () => {
      if (datasetId) {
        const colsProfiles = await getColumnProfile(datasetId);
        const cols: Column[] = colsProfiles.map((curr) => ({
          columnHeader: curr.columnName,
          columnProfile: curr,
        }));
        return cols;
      }
    };

    const getColumnsAI = () => {
      if (sharedState.aiResponseContext) {
        const aiResponse = safeJsonParse<AIResponse<string>>(
          sharedState.aiResponseContext
        );
        if (!aiResponse) return;
        const columns = safeJsonParse<Column[]>(aiResponse.updatedData);
        if (columns) return columns;
      }
    };

    const loadColumns = async () => {
      const columns = getColumnsAI() ?? (await fetchColumns());
      if (columns) {
        setColumns(columns);
        updateState({ aiContext: JSON.stringify(columns) });
      }
    };
    loadColumns();
  }, [sharedState.aiResponseContext, datasetId]);

  return (
    <div style={{ overflowX: "auto" }}>
      {columns && (
        <div className="carousel">
          {columns.map((column, index) => (
            <CarouselItem
              key={index}
              columnHeader={column.columnHeader}
              columnProfile={column.columnProfile}
              updateColumn={(updatedColumn) =>
                updateColumn(index, updatedColumn)
              }
            />
          ))}
        </div>
      )}
      <Button
        label={"Next"}
        action={async () => {
          // save the columns to server
          const res = await saveColumns({
            datasetId: datasetId!,
            newColumns: columns.map((e) => ({
              columnNumber: e.columnProfile.columnNumber,
              columnName: e.columnProfile.columnName,
              columnDescription: e.columnProfile.columnDescription,
              dataType: e.columnProfile.dataType,
              relationship: e.columnProfile.relationship,
            })),
            columnNamesMap: columns.map((c) => ({
              oldColumnName: c.columnProfile.oldColumnName || c.columnProfile.columnName,
              newColumnName: c.columnProfile.columnName,
            })),
          });
          if (res) router.push("/data/pipeline/visualization");
        }}
      />
    <div className="flex flex-col h-full">
      <ColumnProfileList columns={columns} updateColumn={updateColumn} />

      <div className="flex justify-end p-4 border-t border-base-300">
        <Button
          label={"Continue to Cleaning"}
          className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl glow font-semibold disabled:opacity-50"
          action={async () => {
            if (!datasetId) return; // Guard clause
            const res = await saveColumns({
              datasetId: datasetId,
              newColumns: columns.map((e) => ({
                columnNumber: e.columnProfile.columnNumber,
                columnName: e.columnProfile.columnName,
                columnDescription: e.columnProfile.columnDescription,
                dataType: e.columnProfile.dataType,
                relationship: e.columnProfile.relationship,
              })),
            });
            if (res) router.push("/data/pipeline/visualization"); 
          }}
        />
      </div>
    </div>
  );
}