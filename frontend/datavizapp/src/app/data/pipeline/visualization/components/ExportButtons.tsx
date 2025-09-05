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
  );
}
