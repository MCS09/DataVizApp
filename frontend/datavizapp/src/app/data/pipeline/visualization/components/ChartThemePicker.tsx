"use client";

import React from "react";

type ThemeCfg = {
  label: string;
  scheme: string;
  colors: string[];
};

type Props = {
  themes: Record<string, ThemeCfg>;
  activeScheme: string;
  onPick: (scheme: string) => void;
};

export default function ChartThemePicker({ themes, activeScheme, onPick }: Props) {
  return (
    <div className="flex gap-6 justify-center">
      {Object.entries(themes).map(([key, cfg]) => (
        <button
          key={key}
          onClick={() => onPick(cfg.scheme)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${
            activeScheme === cfg.scheme ? "border-white" : "border-gray-600"
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
  );
}
