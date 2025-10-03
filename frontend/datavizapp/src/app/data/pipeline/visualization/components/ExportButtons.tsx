"use client";

import React from "react";

type Props = {
  getView: () => any | null;
};

export default function ExportButtons({ getView }: Props) {
  const handleExport = async (format: "png" | "svg") => {
    const view = getView();
    if (!view) {
      alert("Chart not ready yet.");
      return;
    }
    const url = await view.toImageURL(format);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chart.${format}`;
    link.click();
  };

  return (
    <div className="flex gap-4 justify-center">
      <button
        onClick={() => handleExport("png")}
        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200"
      >
        Export PNG
      </button>
      <button
        onClick={() => handleExport("svg")}
        className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200"
      >
        Export SVG
      </button>
    </div>
  );
}
