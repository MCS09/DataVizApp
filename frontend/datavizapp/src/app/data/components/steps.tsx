"use client";

import { ROUTES } from "@/constants/routes";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

/**
 * Defines the structure for a single step in the pipeline.
 */
export type Step = {
  label: string;
  route: string;
};

/**
 * A custom, interactive stepper component that displays the user's progress
 * through the data pipeline and allows navigation to completed steps.
 */
export default function Steps() {

  // Gets the current URL path to determine the active step.
  const pathname = usePathname();
  // Provides navigation functionality to move between pages.
  const router = useRouter();

  // An array defining the sequence and routes for each step in the stepper.
  const steps: Step[] = [
    { label: "Select", route: ROUTES.datasetSelectionPage },
    { label: "Profile", route: ROUTES.datasetProfilingPage },
    { label: "Clean", route: ROUTES.datasetCleaningPage },
    { label: "Visualization", route: ROUTES.datasetVisualizationPage },
  ];

  // Find the index of the current step by matching the current URL pathname.
  const currentStep = steps.findIndex((step) => step.route === pathname);

  return (
    // Outer wrapper: Takes full width and centers the stepper horizontally.
    <div className="w-full flex justify-center px-4">
      {/* Inner wrapper: Contains the steps and keeps them grouped together. */}
      <div className="flex items-center">
        {/* Iterate over the steps array to render each one. */}
        {steps.map((step, idx) => {
          // A step is considered active or completed if its index is less than or equal to the current step's index.
          const isCompletedOrActive = idx <= currentStep;
          // Check if this is the last step to avoid drawing a line after it.
          const isLastStep = idx === steps.length - 1;

          // JSX for the visual part of a step (the circle and the label).
          const stepContent = (
            <div className="flex flex-col items-center p-2 w-24">
              {/* Step Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm transition-all duration-300 ${
                  // Apply gradient if completed/active, otherwise use gray.
                  isCompletedOrActive
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600"
                    : "bg-gray-300"
                } ${
                  // Add a scale and shadow effect for the currently active step.
                  currentStep === idx ? "scale-110 shadow-lg" : "shadow"
                }`}
              >
                {idx + 1}
              </div>
              {/* Step Label */}
              <div
                className={`mt-2 text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                  // Apply purple, bold text if completed/active, otherwise use gray.
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
              {/* Clickable wrapper for the step content. */}
              <div
                className={
                  // Change cursor to indicate clickability.
                  isCompletedOrActive ? "cursor-pointer" : "cursor-not-allowed"
                }
                onClick={() => {
                  // Navigate to the step's route only if it's clickable.
                  if (isCompletedOrActive) router.push(step.route);
                }}
              >
                {stepContent}
              </div>

              {/* Connecting Line: Rendered between steps, but not after the last one. */}
              {!isLastStep && (
                <div
                  className={`w-16 h-1 transition-colors duration-300 rounded ${
                    // Apply purple color if the step is completed/active.
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