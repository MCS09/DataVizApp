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
    <div className="flex gap-2 items-center">
      <span className="text-sm text-gray-600 mr-2">Theme:</span>
      <div className="flex gap-2 p-1 bg-gray-200 rounded-lg">
        {Object.entries(themes).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => onPick(cfg.scheme)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all
              ${
                activeScheme === cfg.scheme
                  ? "bg-white text-gray-800 shadow-sm"
                  : "bg-transparent text-gray-600 hover:bg-white/60"
              }`}
          >
            <div className="flex gap-1">
              {cfg.colors.map((c, i) => (
                <span
                  key={i}
                  className="w-3 h-3 rounded-full border border-white/50"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <span>{cfg.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
