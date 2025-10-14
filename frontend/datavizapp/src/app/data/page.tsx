"use client";

import { useRouter } from "next/navigation";

// A simple component for the step icons to keep the code clean
const StepIcon = ({ path }: { path: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-10 h-10 mb-4 text-purple-600"
  >
    <path fillRule="evenodd" d={path} clipRule="evenodd" />
  </svg>
);

// Icon paths for each step
const ICONS = {
  select:
    "M10.5 3.75a6 6 0 00-5.98 6.496A5.25 5.25 0 006.75 20.25H18a4.5 4.5 0 002.206-8.423 3.75 3.75 0 00-4.133-4.303A6.001 6.001 0 0010.5 3.75zM12 15.75a.75.75 0 01.75-.75v-4.5a.75.75 0 011.5 0v4.5a.75.75 0 01-.75.75h-1.5z",
  profile:
    "M10.5 6a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V6.75A.75.75 0 0110.5 6zm3.75 3a.75.75 0 01.75.75v7.5a.75.75 0 01-1.5 0v-7.5a.75.75 0 01.75-.75zM6 9a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 016 9zm9 3a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75z",
  clean:
    "M10.023 1.542a.75.75 0 01.748 0l8.25 4.125a.75.75 0 010 1.33l-3.32 1.66a.75.75 0 01-.748 0l-3.32-1.66a.75.75 0 00-.748 0L7.48 8.657a.75.75 0 01-.748 0L3.41 7.002a.75.75 0 010-1.33l4.125-2.063a.75.75 0 01.748 0L10.023 1.542zM12 12.032l-3.32-1.66a.75.75 0 00-.748 0L4.61 12.032a.75.75 0 000 1.33l3.32 1.66a.75.75 0 00.748 0l3.32-1.66a.75.75 0 00.748 0l3.32 1.66a.75.75 0 00.748 0l3.32-1.66a.75.75 0 000-1.33l-4.125-2.063a.75.75 0 00-.748 0L12 12.032zM12 16.157l-3.32-1.66a.75.75 0 00-.748 0L4.61 16.157a.75.75 0 000 1.33l4.125 2.063a.75.75 0 00.748 0l4.125-2.063a.75.75 0 000-1.33L15.32 14.5a.75.75 0 00-.748 0L12 16.157z",
  visualize:
    "M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z M12.75 2.25a.75.75 0 01.75-.75A8.25 8.25 0 0121.75 12a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75V2.25z",
};

export default function DataLandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-20 px-8 text-center" data-theme="lofi">
      {/* Engaging Headline and Subtitle */}
      <h1 className="text-4xl font-bold tracking-tight leading-normal bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
        Bring Your Data to Life
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-gray-600">
        Follow our simple, guided pipeline to upload, clean, and visualize your
        datasets with the help of our AI Assistant.
      </p>

      {/* Visual Step Guide */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl">
        {/* Step 1 */}
        <div className="flex flex-col items-center">
          <StepIcon path={ICONS.select} />
          <h3 className="font-semibold text-gray-800">1. Select Data</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload a CSV or connect to Google Drive.
          </p>
        </div>
        {/* Step 2 */}
        <div className="flex flex-col items-center">
          <StepIcon path={ICONS.profile} />
          <h3 className="font-semibold text-gray-800">2. Profile</h3>
          <p className="mt-1 text-sm text-gray-500">
            Understand your data&apos;s structure and quality.
          </p>
        </div>
        {/* Step 3 */}
        <div className="flex flex-col items-center">
          <StepIcon path={ICONS.clean} />
          <h3 className="font-semibold text-gray-800">3. Clean</h3>
          <p className="mt-1 text-sm text-gray-500">
            Fix errors and prepare your dataset for analysis.
          </p>
        </div>
        {/* Step 4 */}
        <div className="flex flex-col items-center">
          <StepIcon path={ICONS.visualize} />
          <h3 className="font-semibold text-gray-800">4. Visualize</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create stunning charts with our AI Assistant.
          </p>
        </div>
      </div>

      {/* Clear Call-to-Action */}
      <button
        onClick={() => router.push("/data/data-selection")}
        className="mt-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-xl shadow-lg font-semibold hover:scale-105 transition-transform duration-200"
      >
        Get Started
      </button>
    </div>
  );
}