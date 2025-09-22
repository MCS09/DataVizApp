import { useEffect, useState } from "react";
import { fetchData } from "../api";
import { ColumnData } from "./cleaningHooks";

type GetColumnDataRequestDto = {
  datasetId: number;
  columnNumber: number;
};

const getColumnData = async (getColumnDataRequestDto: GetColumnDataRequestDto) =>
  await fetchData<ColumnData>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnData`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getColumnDataRequestDto),
    }
  );

export function useColumnData() {
  const [datasetId, setDatasetId] = useState<number>();
  const [columnNumber, setColumnNumber] = useState<number>();
  const [columnData, setColumnData] = useState<ColumnData | undefined>();

  useEffect(() => {
    if (datasetId == null || columnNumber == null) return;

    let isCancelled = false;

    const loadColumnData = async () => {
      try {
        setColumnData(undefined);
        const data = await getColumnData({
          columnNumber,
          datasetId,
        });
        if (!isCancelled) {
          setColumnData(data);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to load column data", error);
          setColumnData(undefined);
        }
      }
    };

    loadColumnData();

    return () => {
      isCancelled = true;
    };
  }, [columnNumber, datasetId]);

  return {
    columnData,
    datasetId,
    columnNumber,
    setDatasetId,
    setColumnNumber,
    setColumnData,
  };
}
