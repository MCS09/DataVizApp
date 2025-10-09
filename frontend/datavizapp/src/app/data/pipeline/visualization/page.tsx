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
import ChartPlaceholder from "./components/ChartPlaceholder";

/**
 * Fetches the schema and column profiles for a given dataset.
 * This data is used as context for the AI assistant.
 */
const getAIContext = async (datasetId: number) =>
  await fetchData<{ profiles: AIColumnsProfileContext[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getSchema/${datasetId}`
  );

type GetColumnDataByNameRequestDto = {
  datasetId: number;
  columnName: string;
};

/**
 * Fetches the actual data records for a specific column in a dataset.
 */
const getColumnData = async (
  getColumnDataRequestDto: GetColumnDataByNameRequestDto
) =>
  await fetchData<ColumnData>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnDataByName`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getColumnDataRequestDto),
    }
  );

export default function Page() {
  // The ID of the current dataset, loaded from session storage.
  const [datasetId, setDatasetId] = useState<number | undefined>();
  // Zustand global store for sharing state between components (e.g., AI responses).
  const { sharedState, updateState } = useStore();

  // State for the chart's configurable properties.
  const [width, setWidth] = useState(600);
  const [ratio, setRatio] = useState<"original" | "16:9" | "4:3" | "1:1">(
    "16:9"
  );
  const [theme, setTheme] = useState<string>("tableau10");
  
  // Tracks if the initial sample chart is displayed, or a user-generated one.
  const [isSampleView, setIsSampleView] = useState(true);

  // A ref to hold the Vega view instance, used for exporting the chart.
  const vegaRef = useRef<any | null>(null);
  
  // State to hold the final, data-enriched Vega specification that gets rendered.
  const [resolvedSpec, setResolvedSpec] = React.useState<any | null>(null);

  const MAX_WIDTH = 1000;

  // This custom hook manages the core Vega-Lite specification object.
  // It takes the user's settings (width, ratio, theme) and produces a `spec` object.
  const { setBaseSpec, baseSpec, spec, clampedWidth, height } = useVegaSpec({
    width,
    ratio,
    theme,
    maxWidth: MAX_WIDTH,
    maxHeight: 500,
  });


  // On initial component mount, load the datasetId from session storage.
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
  };

  // When datasetId or the base spec changes, fetch the column profiles
  // and update the global AI context in the Zustand store.
  useEffect(() => {
    if (datasetId) {
      getAIContext(datasetId).then((data) => {
        if (data && data.profiles) {
          const aiContext: AIContext = {
            profiles: data.profiles,
            currentSpec: baseSpec,
          };
          updateState({ aiContext: JSON.stringify(aiContext) });
        }
      });
    }
  }, [datasetId, baseSpec]);

  // Listen for changes in the AI's response from the global store.
  // If a new response arrives, parse it, update the base chart spec,
  // and switch from the sample view to the main chart view.
  useEffect(() => {
    if (sharedState.aiResponseContext) {
      const aiResponse = safeJsonParse<AIResponse<string>>(
        sharedState.aiResponseContext
      );
      if (!aiResponse) return;
      const specs = safeJsonParse<typeof baseSpec>(aiResponse.updatedData);
      if (!specs) return;
      
      setBaseSpec(specs);
      setIsSampleView(false);
    }
  }, [sharedState.aiResponseContext]);

  /**
   * Helper function to parse a cell value into a number or string.
   */
  const cell = (v: string) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : String(v).trim();
  };
  
  /**
   * Fetches the data for multiple columns and transforms it into an array of row objects.
   */
  async function valuesFromFeatures(
    datasetId: number,
    features: string[]
  ): Promise<Record<string, any>[]> {
    const columns: ColumnData[] = await Promise.all(
      features.map((f) => getColumnData({ datasetId, columnName: f }))
    );

    const rowMap = columns.reduce<Record<number, Record<string, any>>>(
      (acc, col) => {
        col.dataRecords.forEach(({ recordNumber, value }) => {
          const row = acc[recordNumber] || (acc[recordNumber] = {});
          row[col.columnName] = cell(value);
        });
        return acc;
      },
      {}
    );

    return Object.keys(rowMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((k) => rowMap[k]);
  }

  /**
   * Takes a Vega spec and enriches it with actual data from the backend.
   */
  async function extendSpecWithData(
    datasetId: number,
    initialSpec: typeof spec
  ): Promise<typeof spec> {
    const feat = Object.keys(spec.data?.values?.[0] ?? {});
    if (feat.length === 0) return initialSpec; // Return early if no features

    const value = await valuesFromFeatures(datasetId, feat);
    return {
      ...initialSpec,
      data: {
        values: value,
      },
    };
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

  // A memoized promise that resolves to the final, data-enriched spec.
  // This prevents re-fetching data on every re-render.
  const fullSpecPromise = React.useMemo(
    () =>
      datasetId !== undefined
        ? extendSpecWithData(datasetId, spec)
        : Promise.resolve(spec),
    [datasetId, spec]
  );

  // This effect waits for the `fullSpecPromise` to resolve and then
  // updates the `resolvedSpec` state, which triggers a re-render of the chart.
  React.useEffect(() => {
    let alive = true;
    fullSpecPromise
      .then((s) => {
        if (alive) setResolvedSpec(s);
      })
      .catch(() => {
        if (alive) setResolvedSpec(spec);
      });
    return () => {
      alive = false;
    };
  }, [fullSpecPromise, spec]);


  // function extendSpecWithData(initialSpec: typeof spec): typeof spec | null {return null}
  return (
    <div className="p-4 flex flex-col h-full gap-4 bg-white">
      {/*Top Control Bar */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <ChartControls
          width={width}
          onWidthChange={setWidth}
          ratio={ratio}
          onRatioChange={setRatio}
          maxWidth={MAX_WIDTH}
          clampedWidth={clampedWidth}
          height={height}
        />
      </div>

      {/* Chart Area: Conditionally render the Placeholder or the direct ChartBox */}
      <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-lg shadow-inner bg-gray-50">
        {isSampleView ? (
          <ChartPlaceholder
            spec={resolvedSpec}
            onViewReady={(view) => (vegaRef.current = view)}
          />
        ) : (
          {error ? (
        <div className="text-red-500 font-semibold">{error}</div>
      ) :
             <ChartBox
            spec={resolvedSpec}
            onViewReady={(view) => (vegaRef.current = view)}
          />
        )}
      }
      </div>

      {/* Bottom Toolbar for Themes and Exporting */}
      <div className="flex justify-between items-center p-2 bg-gray-50 border border-gray-200 rounded-lg">
        <ChartThemePicker
          themes={chartThemes}
          activeScheme={theme}
          onPick={(scheme) => setTheme(scheme)}
        />
        <ExportButtons getView={() => vegaRef.current} />
      </div>
    </div>
  );
}