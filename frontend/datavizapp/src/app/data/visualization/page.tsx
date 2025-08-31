'use client' ;
import React, { useState } from 'react'
import { VegaEmbed } from "react-vega";
import { VisualizationSpec } from 'vega-embed';
import { useDatasetColumns} from "@/lib/hooks/useDataSetColumn"


const page = () => {
    const [spec, setSpec] = useState<string | VisualizationSpec>()
    const { columns, loading, error, refresh } = useDatasetColumns();

    if (loading) return <div className="p-4">Loading columns…</div>;
    if (error) return (
      <div className="p-4">
        Failed to load columns
        <button className="btn btn-sm ml-2" onClick={refresh}>Retry</button>
      </div>
    );
    
  return (
    // <div>
    //     {/* <VegaEmbed spec={spec} />; */}

    // </div>
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Columns</h2>

      {/* Example: list the columns you received */}
      <ul className="list-disc pl-6">
        {columns.map((c) => (
          <li key={c.columnProfile.columnNumber}>
            <span className="font-medium">{c.columnHeader}</span>
            , type {c.columnProfile.dataType}
            {c.columnProfile.columnDescription ? `, ${c.columnProfile.columnDescription}` : ""}
          </li>
        ))}
      </ul>

      {/* Your chart builder can now read columns to constrain encodings */}
      {/* pass columns to your vega lite suggestion logic */}
    </div>
  )
}

export default page
