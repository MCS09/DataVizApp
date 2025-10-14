import React from "react";
import VegaLiteClient from "./VegaLiteClient";
/* eslint-disable  @typescript-eslint/no-explicit-any */

type Props = {
  spec: any;
  onViewReady?: (view: any) => void;
};

export default function ChartBox({ spec, onViewReady }: Props) {
  console.log("specs",spec)
  return (
    <div className="w-full h-full p-4">
      <VegaLiteClient spec={spec} getView={onViewReady} />
    </div>
  );
}