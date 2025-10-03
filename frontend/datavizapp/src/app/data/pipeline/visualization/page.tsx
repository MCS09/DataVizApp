"use client";

import React, { useEffect, useRef, useState } from "react";
import ChartControls from "./components/ChartControls";
import ChartThemePicker from "./components/ChartThemePicker";
import ChartBox from "./components/ChartBox";
import ExportButtons from "./components/ExportButtons";
import { useVegaSpec } from "./hooks/useVegaSpec";
import { chartThemes } from "./lib/chartThemes";
import { AIColumnsProfileContext, ColumnData } from "./data";
import { fetchData, safeJsonParse } from "@/lib/api";
import useStore from "@/lib/store";
import { AIResponse } from "../layout";

const getAIContext = async (datasetId: number) =>
  await fetchData<{ "profiles" : AIColumnsProfileContext[]}>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getSchema/${datasetId}`
  );

type GetColumnDataByNameRequestDto = 
{
  datasetId: number,
  columnName: string
}

const getColumnData = async (getColumnDataRequestDto: GetColumnDataByNameRequestDto) =>
    await fetchData<ColumnData>(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnDataByName`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getColumnDataRequestDto),
    });



export default function Page() {
  const [datasetId, setDatasetId] = useState<number | undefined>();
  const { sharedState, updateState } = useStore();

  // UI state
  const [width, setWidth] = useState(600);
  const [ratio, setRatio] = useState<"original" | "16:9" | "4:3" | "1:1">("16:9");
  const [theme, setTheme] = useState<string>("tableau10");
  const [error, setError] = useState<string | null>(null);


  // Render limits
  const MAX_WIDTH = 1000;

  // Vega view ref (passed up from ChartBox once the chart mounts)
  const vegaRef = useRef<any | null>(null);

  // Build spec (width, ratio, theme → vega-lite spec)
  const { setBaseSpec, setAIColumnsProfileContext, baseSpec, spec, clampedWidth, height } = useVegaSpec({
    width,
    ratio,
    theme,
    maxWidth: MAX_WIDTH,
    maxHeight: 500,
  });


  // load datasetId (From session store)
  useEffect(() => {
    const stored = sessionStorage.getItem("sessionFileData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setDatasetId(parsed.datasetId);
    }
  }, []);

  type AIContext = {
    profiles: AIColumnsProfileContext[];
    currentSpec: typeof baseSpec;
  }

  // Load initial AI context from backend
  // Set context to AI
  useEffect(() => {
    if (datasetId) {
      getAIContext(datasetId).then((data) => {
        if (data && data.profiles) {
          const aiContext: AIContext = {
            profiles: data.profiles,
            currentSpec: baseSpec
          }
          updateState({ aiContext: JSON.stringify(aiContext) });
        }
      });
    }
  }, [datasetId, baseSpec]);



  useEffect(() => {
    // If we have a new AI response, update the base spec
    if (sharedState.aiResponseContext) {
      const aiResponse = safeJsonParse<AIResponse<string>>(
        sharedState.aiResponseContext
      );
      if (!aiResponse) return;
      const specs = safeJsonParse<typeof baseSpec>(aiResponse.updatedData);
      if (!specs) return;
      setBaseSpec(specs);
    }
  }, [sharedState.aiResponseContext]);

    const cell = (v: string) => {
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : String(v).trim();
    };
    async function valuesFromFeatures(
      datasetId: number,
      features: string[]
    ): Promise<Record<string, any>[]> {
      // parallel fetch for all features
      // get column name
      const columns: ColumnData[] = (
        await Promise.all(
          features.map(async (f) => {
            try {
              return await getColumnData({ datasetId, columnName: f });
            } catch (err) {
              console.warn(`Failed to fetch column ${f}:`, err);
              return null; // ignore failures
            }
          })
        )
      ).filter((c): c is ColumnData => c !== null); // keep only successful fetches

      // merge column wise to row wise
      const rowMap = columns.reduce<Record<number, Record<string, any>>>((acc, col) => {
        col.dataRecords.forEach(({ recordNumber, value }) => {
          const row = acc[recordNumber] || (acc[recordNumber] = {});
          row[col.columnName] = cell(value);
        });
        return acc;
      }, {});

      // ordered array by recordNumber
      return Object.keys(rowMap)
        .map(Number)
        .sort((a, b) => a - b)
        .map(k => rowMap[k]);
    }

  async function extendSpecWithData(datasetId:number,initialSpec: typeof spec): Promise<typeof spec> {
    try {
      const feat = Object.keys(initialSpec.data?.values?.[0] ?? {});
      if (feat.length === 0) throw new Error("No features selected for chart.");

      const value = await valuesFromFeatures(datasetId, feat);
      if (!value || value.length === 0) throw new Error("No matching data found in the database.");
      return { ...initialSpec, data: { values: value } };
    } catch (err: any) {
      console.log("extendSpecWithData → datasetId:", datasetId, "features:", feat);
      setError(err.message || "Failed to fetch data.");
      throw err;
    }
  }

  // build the promise once per change
  const fullSpecPromise = React.useMemo(
    () =>
      datasetId !== undefined
        ? extendSpecWithData(datasetId, spec)   // returns Promise<Spec>
        : Promise.resolve(spec),
    [datasetId, spec]
  );

  // resolve to a plain object for ChartBox
  const [resolvedSpec, setResolvedSpec] = React.useState(spec);

  React.useEffect(() => {
    let alive = true;
    fullSpecPromise
      .then(s => { if (alive) setResolvedSpec(s); })
      .catch(() => { if (alive) setResolvedSpec(spec); });
    return () => { alive = false; };
  }, [fullSpecPromise, spec]);


  // function extendSpecWithData(initialSpec: typeof spec): typeof spec | null {return null}
  return (
    <div className="w-full h-screen flex justify-center items-center">
      <div className="w-full max-w-5xl flex flex-col gap-6 items-center justify-center">
        {/* Controls */}
        <ChartControls
          width={width}
          onWidthChange={setWidth}
          ratio={ratio}
          onRatioChange={setRatio}
          maxWidth={MAX_WIDTH}
          clampedWidth={clampedWidth}
          height={height}
        />

        {/* Chart */}
        {error ? (
        <div className="text-red-500 font-semibold">{error}</div>
      ) :
             <ChartBox spec={resolvedSpec} onViewReady={(view) => (vegaRef.current = view)} />

      }
        {/* Theme picker */}
        <ChartThemePicker
          themes={chartThemes}
          activeScheme={theme}
          onPick={(scheme) => setTheme(scheme)}
        />

        {/* Export */}
        <ExportButtons getView={() => vegaRef.current} />
      </div>
    </div>
  );
}
