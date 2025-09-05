"use client";

import { useEffect, useRef } from "react";
import embed from "vega-embed";

type Props = {
  spec: any;                    // must be plain JSON
  options?: Record<string, any>; // keep this plain too
};

export default function VegaLiteClient({ spec, options }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let view: any;

    embed(ref.current, spec, { actions: false, renderer: "canvas", ...options })
      .then(res => { view = res.view; })
      .catch(err => console.error("vega-embed error:", err));

    return () => { if (view) view.finalize(); };
  }, [spec, options]);

  return <div ref={ref} style={{ width: "100%", minHeight: 320 }} />;
}
