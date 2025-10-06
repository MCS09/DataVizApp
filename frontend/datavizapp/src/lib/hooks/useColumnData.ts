import { useEffect, useState } from "react";
import { fetchData } from "../api";
import { ColumnData } from "./cleaningHooks";

type GetColumnDataRequestDto = 
{
  datasetId: number,
  columnNumber: number
}

const getColumnData = async (getColumnDataRequestDto: GetColumnDataRequestDto) =>
    await fetchData<ColumnData>(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnData`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getColumnDataRequestDto),
    });

export function useColumnData(){
    const [datasetId, setDatasetId] = useState<number>();
    const [columnNumber, setColumnNumber] = useState<number>();
    const [columnData, setColumnData] = useState<ColumnData>();
    useEffect(
        () => {
            if (!(datasetId && columnNumber)) return;
            (
                async () => {
                    const columnData = await getColumnData({columnNumber: columnNumber, datasetId: datasetId});
                    setColumnData(columnData);
                }
            )();
        },
        [columnNumber, datasetId]
    )
    return {columnData, datasetId, setDatasetId, setColumnNumber, setColumnData};
}

