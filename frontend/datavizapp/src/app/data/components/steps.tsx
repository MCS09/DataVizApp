'use client'
import { ROUTES } from "@/constants/routes";

type Step = {
  label: string;
  route: string;
};

const steps: Step[] = [
  { label: "Select", route: ROUTES.datasetSelectionPage },
  { label: "Clean", route: ROUTES.datasetCleaningPage },
  { label: "Visualization", route: ROUTES.datasetVisualizationPage },
  { label: "tbc2", route: "/data/tbc2" },
];

export default function Steps({pathname } : {pathname: string}) {
  const currentStep = steps.findIndex((step) => step.route === pathname);

  return (
    <ul className="steps steps-vertical lg:steps-horizontal">
      {steps.map((step, idx) => (
        <li
          key={step.label}
          className={`step${idx <= currentStep ? " step-primary" : ""}`}
        >
          {step.label}
        </li>
      ))}
    </ul>
  );
}