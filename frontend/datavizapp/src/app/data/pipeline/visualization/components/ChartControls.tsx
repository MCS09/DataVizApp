"use client";

import React from "react";

type Props = {
  width: number;
  onWidthChange: (n: number) => void;
  ratio: "original" | "16:9" | "4:3" | "1:1";
  onRatioChange: (r: "original" | "16:9" | "4:3" | "1:1") => void;
  maxWidth: number;
  clampedWidth: number;
  height?: number | string;
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
    <div className="flex gap-6 items-center flex-wrap text-sm text-gray-700">
      <label className="flex items-center gap-2">
        <span>Width (px):</span>
        <input
          type="number"
          min={100}
          max={maxWidth}
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          className="w-24 px-2 py-1 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </label>

      <label className="flex items-center gap-2">
        <span>Aspect Ratio:</span>
        <select
          value={ratio}
          onChange={(e) => onRatioChange(e.target.value as Props["ratio"])}
          className="px-2 py-1 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
        >
          <option value="original">Original</option>
          <option value="16:9">16:9</option>
          <option value="4:3">4:3</option>
          <option value="1:1">1:1</option>
        </select>
      </label>

      <span className="font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded-md">
        → Chart Size: {clampedWidth} × {height}
      </span>
    </div>
  );
}
