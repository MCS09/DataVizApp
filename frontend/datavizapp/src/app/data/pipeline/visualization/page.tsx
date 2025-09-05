"use client";

import React, { useRef, useState } from "react";
import ChartControls from "./components/ChartControls";
import ChartThemePicker from "./components/ChartThemePicker";
import ChartBox from "./components/ChartBox";
import ExportButtons from "./components/ExportButtons";
import { useVegaSpec } from "./hooks/useVegaSpec";
import { chartThemes } from "./lib/chartThemes";

export default function Page() {
  // UI state
  const [width, setWidth] = useState(600);
  const [ratio, setRatio] = useState<"original" | "16:9" | "4:3" | "1:1">("16:9");
  const [theme, setTheme] = useState<string>("tableau10");

  // Render limits
  const MAX_WIDTH = 1000;

  // Vega view ref (passed up from ChartBox once the chart mounts)
  const vegaRef = useRef<any | null>(null);

  // Build spec (width, ratio, theme → vega-lite spec)
  const { spec, clampedWidth, height } = useVegaSpec({
    width,
    ratio,
    theme,
    maxWidth: MAX_WIDTH,
    maxHeight: 500,
  });

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
