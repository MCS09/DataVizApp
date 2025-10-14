import React from "react";
import ChartBox from "./ChartBox";
/* eslint-disable  @typescript-eslint/no-explicit-any */

type Props = {
  spec: any;
  onViewReady?: (view: any) => void;
};

// This component provides a welcoming message and instructions around the sample chart.
export default function ChartPlaceholder({ spec, onViewReady }: Props) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gray-50/50">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6 text-yellow-500"
          >
            <path
              fillRule="evenodd"
              d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69a.75.75 0 01.981.981A10.501 10.501 0 0118 18a10.5 10.5 0 01-10.5-10.5q0-1.268.273-2.482A.75.75 0 019.528 1.718z"
              clipRule="evenodd"
            />
            <path d="M11.422 1.159a.75.75 0 01.858 0l1.428 1.428a.75.75 0 010 .858l-1.428 1.428a.75.75 0 01-.858 0L9.994 3.445a.75.75 0 010-.858l1.428-1.428zM16.5 6.422a.75.75 0 01.858 0l1.428 1.428a.75.75 0 010 .858l-1.428 1.428a.75.75 0 01-.858 0l-1.428-1.428a.75.75 0 010-.858l1.428-1.428zM6.422 16.5a.75.75 0 01.858 0l1.428 1.428a.75.75 0 010 .858l-1.428 1.428a.75.75 0 01-.858 0l-1.428-1.428a.75.75 0 010-.858l1.428-1.428z" />
          </svg>
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">
            Welcome to the Visualization Canvas!
          </h3>
        </div>
        {/* ENHANCEMENT: Refined the description text for clarity and emphasis. */}
        <p className="text-sm text-gray-600 max-w-lg mx-auto">
          Fine-tune this sample chart using the controls, or bring your data to
          life by asking the{" "}
          <span className="font-semibold text-purple-600">
            AI Assistant
          </span>{" "}
          to build a new one.
        </p>
      </div>

      {/* The actual chart is embedded here, taking up the remaining space */}
      <div className="w-full flex-1 min-h-0">
        <ChartBox spec={spec} onViewReady={onViewReady} />
      </div>
    </div>
  );
}