"use client";

import React, { useState, useMemo, useRef } from "react";
import VegaLiteClient from "./VegaLiteClient";
import { vegaSpecConverter } from "./vegaParser";
import { sampleAIColumnsProfileContext } from "./sample_data";

const toPlain = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

const chartThemes = {
  monotone: {
    label: "Monotone",
    scheme: "blues",
    colors: ["#bfdbfe", "#60a5fa", "#2563eb"],
  },
  categorical: {
    label: "Categorical",
    scheme: "tableau10",
    colors: ["#4e79a7", "#f28e2b", "#e15759"],
  },
  pastel: {
    label: "Pastel",
    scheme: "pastel2",
    colors: ["#fbb4ae", "#b3cde3", "#ccebc5"],
  },
};

export default function Page() {
  const [width, setWidth] = useState(600);
  const [ratio, setRatio] = useState("16:9");
  const [theme, setTheme] = useState("tableau10");

  const MAX_WIDTH = 1000;
  const MAX_HEIGHT = 500;

  const height = useMemo(() => {
    if (ratio === "original") return undefined;
    const [w, h] = ratio.split(":").map(Number);
    const calcHeight = Math.round((width * h) / w);
    return Math.min(calcHeight, MAX_HEIGHT);
  }, [width, ratio]);

  const clampedWidth = Math.min(width, MAX_WIDTH);

  const spec = useMemo(() => {
    const baseSpec = vegaSpecConverter(sampleAIColumnsProfileContext);
    const colorField =
      baseSpec.encoding?.x?.field ||
      baseSpec.encoding?.y?.field ||
      "firstName";

    return {
      ...toPlain(baseSpec),
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: clampedWidth,
      ...(height ? { height } : {}),
      encoding: {
        ...baseSpec.encoding,
        color: {
          field: colorField,
          type: "nominal",
          scale: { scheme: theme },
        },
      },
    };
  }, [clampedWidth, height, theme]);

  // Ref for Vega view
  const vegaRef = useRef<any>(null);

  const handleExport = async (format: "png" | "svg") => {
    if (vegaRef.current) {
      const view = vegaRef.current;
      const url = await view.toImageURL(format);
      const link = document.createElement("a");
      link.href = url;
      link.download = `chart.${format}`;
      link.click();
    } else {
      alert("Chart not ready yet.");
    }
  };

  return (
    <div className="w-full h-screen flex justify-center items-center bg-black">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        {/* Controls */}
        <div className="flex gap-6 items-center flex-wrap">
          <label className="text-white">
            Width (px):{" "}
            <input
              type="number"
              min={100}
              max={MAX_WIDTH}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="px-2 py-1 text-black rounded"
            />
          </label>

          <label className="text-white">
            Ratio:{" "}
            <select
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              className="px-2 py-1 text-black rounded"
            >
              <option value="original">Original</option>
              <option value="16:9">16:9</option>
              <option value="4:3">4:3</option>
              <option value="1:1">1:1</option>
            </select>
          </label>

          <span className="text-gray-300">
            → Chart size: {clampedWidth} × {height ?? "auto"}
          </span>
        </div>

        {/* Chart box */}
        <div className="w-full h-[400px] flex justify-center items-center bg-gray-900 rounded-lg">
          <VegaLiteClient spec={spec} getView={(view) => (vegaRef.current = view)} />
        </div>

        {/* Theme picker */}
        <div className="flex gap-6 justify-center">
          {Object.entries(chartThemes).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setTheme(cfg.scheme)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${
                theme === cfg.scheme ? "border-white" : "border-gray-600"
              } bg-gray-800 hover:bg-gray-700 transition`}
            >
              <div className="flex gap-1">
                {cfg.colors.map((c, i) => (
                  <span
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <span className="text-sm text-white">{cfg.label}</span>
            </button>
          ))}
        </div>

        {/* Export buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleExport("png")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Export PNG
          </button>
          <button
            onClick={() => handleExport("svg")}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
          >
            Export SVG
          </button>
        </div>
      </div>
    </div>
  );
}
