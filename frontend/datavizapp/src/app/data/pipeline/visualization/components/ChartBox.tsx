import React from "react";
import VegaLiteClient from "./VegaLiteClient";

type Props = {
  spec: any;
  onViewReady?: (view: any) => void;
};

export default function ChartBox({ spec, onViewReady }: Props) {
  return (
    <div className="w-full h-[400px] flex justify-center items-center bg-gray-900 rounded-lg">
      <VegaLiteClient spec={spec} getView={onViewReady} />
    </div>
  );
}
