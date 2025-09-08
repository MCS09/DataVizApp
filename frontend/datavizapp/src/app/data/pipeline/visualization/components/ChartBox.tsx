import React from "react";
import VegaLiteClient from "./VegaLiteClient";

type Props = {
  spec: any;
  onViewReady?: (view: any) => void;
};

export default function ChartBox({ spec, onViewReady }: Props) {
  console.log("specs",spec)
  return (
    <div className="w-full h-[400px] flex justify-center items-center rounded-lg">
      <VegaLiteClient spec={spec} getView={onViewReady} />
    </div>
  );
}
