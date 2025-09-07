"use client";

import React, { useEffect, useRef, useState } from "react";
import ChartControls from "./components/ChartControls";
import ChartThemePicker from "./components/ChartThemePicker";
import ChartBox from "./components/ChartBox";
import ExportButtons from "./components/ExportButtons";
import { useVegaSpec } from "./hooks/useVegaSpec";
import { chartThemes } from "./lib/chartThemes";
import { AIColumnsProfileContext } from "./data";
import { fetchData, safeJsonParse } from "@/lib/api";
import useStore from "@/lib/store";
import { AIResponse } from "../layout";

const getAIContext = async (datasetId: number) =>
  await fetchData<{ "profiles" : AIColumnsProfileContext[]}>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getSchema/${datasetId}`
  );

export default function Page() {
  const [datasetId, setDatasetId] = useState<number | undefined>();
  const { sharedState, updateState } = useStore();

  // UI state
  const [width, setWidth] = useState(600);
  const [ratio, setRatio] = useState<"original" | "16:9" | "4:3" | "1:1">("16:9");
  const [theme, setTheme] = useState<string>("tableau10");

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



  return (
    <div className="w-full h-screen flex justify-center items-center bg-black">
      <div className="w-full max-w-5xl flex flex-col gap-6">
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
        <ChartBox spec={spec} onViewReady={(view) => (vegaRef.current = view)} />

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
