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

