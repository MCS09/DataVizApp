"use client";

import { ROUTES } from "@/constants/routes";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

export type Step = {
  label: string;
  route: string;
};

export default function Steps() {
  const pathname = usePathname();
  const router = useRouter();

  const steps: Step[] = [
    { label: "Select", route: ROUTES.datasetSelectionPage },
    { label: "Profile", route: ROUTES.datasetProfilingPage },
    { label: "Clean", route: ROUTES.datasetCleaningPage },
    { label: "Visualization", route: ROUTES.datasetVisualizationPage },
  ];
  const currentStep = steps.findIndex((step) => step.route === pathname);

  return (
    <div className="w-full flex justify-center px-4"> {/* Reduced padding here */}
      <div className="flex items-center">
        {steps.map((step, idx) => {
          const isCompletedOrActive = idx <= currentStep;
          const isLastStep = idx === steps.length - 1;

          const stepContent = (
            <div className="flex flex-col items-center p-2 w-24">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm transition-all duration-300 ${
                  isCompletedOrActive
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600"
                    : "bg-gray-300"
                } ${currentStep === idx ? "scale-110 shadow-lg" : "shadow"}`}
              >
                {idx + 1}
              </div>
              <div
                className={`mt-2 text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  isCompletedOrActive
                    ? "text-purple-700 font-semibold"
                    : "text-gray-500"
                }`}
              >
                {step.label}
              </div>
            </div>
          );

          return (
            <React.Fragment key={step.label}>
              <div
                className={
                  isCompletedOrActive ? "cursor-pointer" : "cursor-not-allowed"
                }
                onClick={() => {
                  if (isCompletedOrActive) router.push(step.route);
                }}
              >
                {stepContent}
              </div>

              {!isLastStep && (
                <div
                  className={`w-16 h-1 transition-colors duration-300 rounded ${
                    isCompletedOrActive ? "bg-purple-400" : "bg-gray-300"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}