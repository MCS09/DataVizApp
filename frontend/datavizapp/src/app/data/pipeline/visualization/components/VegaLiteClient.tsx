"use client";

import { useEffect, useRef } from "react";
import embed, { VisualizationSpec } from "vega-embed";
import type { View } from "vega";

type Props = {
  spec: VisualizationSpec;
  getView?: (view: View) => void;
};

export default function VegaLiteClient({ spec, getView }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    embed(containerRef.current, spec, { actions: false })
      .then((result) => {
        // result.view is the Vega View instance
        if (getView) getView(result.view);
      })
      .catch((err) => {
        console.error("Vega embed error:", err);
      });
  }, [spec, getView]);

  return <div ref={containerRef} className="w-full h-full" />;
}