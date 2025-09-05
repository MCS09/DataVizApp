"use client";

import React from "react";

type Props = {
  width: number;
  onWidthChange: (n: number) => void;
  ratio: "original" | "16:9" | "4:3" | "1:1";
  onRatioChange: (r: "original" | "16:9" | "4:3" | "1:1") => void;
  maxWidth: number;
  clampedWidth: number;
  height?: number;
};

export default function ChartControls({
  width,
  onWidthChange,
  ratio,
  onRatioChange,
  maxWidth,
  clampedWidth,
  height,
}: Props) {
  return (
    <div className="flex gap-6 items-center flex-wrap">
      <label className="text-white">
        Width (px):{" "}
        <input
          type="number"
          min={100}
          max={maxWidth}
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          className="px-2 py-1 text-black rounded"
        />
      </label>

      <label className="text-white">
        Ratio:{" "}
        <select
          value={ratio}
          onChange={(e) =>
            onRatioChange(e.target.value as Props["ratio"])
          }
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
  );
}
