import { ColumnProfile } from "@/app/data/pipeline/profiling/components/Carousel";
import { useState } from "react";

export function useColumns(initial: ColumnProfile[]){
    const [columns, setColumns] = useState<ColumnProfile[]>(initial);

    return {columns, setColumns}
}