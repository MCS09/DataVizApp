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

type GetColumnDataByNameRequestDto = {
  datasetId: number;
  columnName: string;
};

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
  const [datasetId, setDatasetId] = useState<number | undefined>();
  const { sharedState, updateState } = useStore();

  const [width, setWidth] = useState(600);
  const [ratio, setRatio] = useState<"original" | "16:9" | "4:3" | "1:1">(
    "16:9"
  );
  const [theme, setTheme] = useState<string>("tableau10");

  const MAX_WIDTH = 1000;
  const vegaRef = useRef<any | null>(null);

  const { setBaseSpec, baseSpec, spec, clampedWidth, height } = useVegaSpec({
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
  };

  // Load initial AI context from backend
  // Set context to AI
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
  }

  const fullSpecPromise = React.useMemo(
    () =>
      datasetId !== undefined
        ? extendSpecWithData(datasetId, spec)
        : Promise.resolve(spec),
    [datasetId, spec]
  );

  const [resolvedSpec, setResolvedSpec] = React.useState(spec);

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

      {/* Chart Area (this will grow and shrink to fit available space) */}
      <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-lg shadow-inner bg-gray-50">
        <ChartBox
          spec={resolvedSpec}
          onViewReady={(view) => (vegaRef.current = view)}
        />
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