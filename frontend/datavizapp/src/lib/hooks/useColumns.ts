import { ColumnProfile } from "@/app/data/pipeline/profiling/components/CarouselItem";
import { useState } from "react";

export type Column = {
    columnHeader: string,
    columnProfile: ColumnProfile
}

export function useColumns(initial: Column[]){
    const [columns, setColumns] = useState<Column[]>(initial);
    return {columns, setColumns}
}