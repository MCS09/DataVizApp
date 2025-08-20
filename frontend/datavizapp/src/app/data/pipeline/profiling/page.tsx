"use client";
import { useEffect, useState } from "react";
import { CarouselItem, ColumnProfile } from "./components/Carousel";
import { fetchData } from "@/lib/api";
import { useColumns } from "@/lib/hooks/useColumns";
import useStore from "@/lib/store";

// Get Column Profile
const getColumnProfile = async (datasetId: number) =>
  await fetchData<ColumnProfile[]>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnsByDatasetId/${datasetId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

export default function ProfilingPage() {
  const [datasetId] = useState<number | undefined>(9);
  const { columns, setColumns } = useColumns([]);
  const { sharedState, updateState } = useStore();

  useEffect(() => {
    const fetchData = async () => {
      if (datasetId) {
        const cols = await getColumnProfile(datasetId);
        setColumns(cols);
        updateState({ aiContext: JSON.stringify(cols)});
      }
      // save datasetId to 
    };
    fetchData();
  }, [datasetId]);

  const updateColumn = (index: number, updatedColumn: ColumnProfile) => {
    const newColumns = [...columns];
    newColumns[index] = updatedColumn;
    const sorted = newColumns.sort((a, b) => a.columnNumber - b.columnNumber);

    setColumns(sorted);
    updateState({ aiContext: JSON.stringify(sorted)});
  };

  useEffect(() => {
    if (sharedState.aiResponseContext){
      const newColumns = JSON.parse(sharedState.aiResponseContext);
      try{
        setColumns(newColumns.updatedData);
      }
      catch{
        console.warn("Failed to update Columns")
      }
      // reset
      updateState({aiResponseContext: ''})
    }
  }, [sharedState])

  return (
    <div style={{ overflowX: "auto" }}>
      {columns && (
        <div className="carousel">
          {columns.map((column, index) => (
            <CarouselItem
              key={index}
              column={column}
              updateColumn={(updatedColumn) => updateColumn(index, updatedColumn)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
