"use client";

import { useMemo } from "react";
import { vegaSpecConverter } from "../lib/vegaParser";
import { sampleAIColumnsProfileContext } from "../sample_data";
import { toPlain } from "../lib/toPlain";

type Args = {
  width: number;
  ratio: "original" | "16:9" | "4:3" | "1:1";
  theme: string;
  maxWidth: number;
  maxHeight: number;
};

export function useVegaSpec({ width, ratio, theme, maxWidth, maxHeight }: Args) {
  const height = useMemo(() => {
    if (ratio === "original") return undefined;
    const [w, h] = ratio.split(":").map(Number);
    const calcHeight = Math.round((width * h) / w);
    return Math.min(calcHeight, maxHeight);
  }, [width, ratio, maxHeight]);

  const clampedWidth = Math.min(width, maxWidth);

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

  return { spec, clampedWidth, height };
}
