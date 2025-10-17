"use client";
/* eslint-disable  @typescript-eslint/no-explicit-any */

import React, { useEffect, useRef, useState } from "react";
import ChartControls from "./components/ChartControls";
import ChartThemePicker from "./components/ChartThemePicker";
import ChartBox from "./components/ChartBox";
import ExportButtons from "./components/ExportButtons";
import Loader from "./components/Loader";
import { useVegaSpec } from "./hooks/useVegaSpec";
import { chartThemes } from "./lib/chartThemes";
import { AIColumnsProfileContext, ColumnData } from "./data";
import { fetchData, safeJsonParse } from "@/lib/api";
import useStore from "@/lib/store";
import { AIResponse } from "../layout";

/**
 * Fetches the schema and column profiles for a given dataset.
 */
const getAIContext = async (datasetId: number) =>
  await fetchData<{ profiles: AIColumnsProfileContext[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getSchema/${datasetId}`
  );

type GetColumnDataByNameRequestDto = {
  datasetId: number;
  columnName: string;
};

/**
 * Fetches the actual data records for a specific column in a dataset.
 */
const getColumnData = async (
  getColumnDataRequestDto: GetColumnDataByNameRequestDto
) =>
  await fetchData<ColumnData>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnDataByName`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getColumnDataRequestDto),
    }
  );

export default function Page() {
  const [datasetId, setDatasetId] = useState<number | undefined>();
  const { sharedState, updateState } = useStore();

  const [width, setWidth] = useState(600);
  const [ratio, setRatio] = useState<"original" | "16:9" | "4:3" | "1:1">("16:9");
  const [theme, setTheme] = useState<string>("tableau10");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(true);


  const vegaRef = useRef<any | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const MAX_WIDTH = 800;

  const { setBaseSpec, baseSpec, spec, clampedWidth, height } = useVegaSpec({
    width,
    ratio,
    theme,
    maxWidth: MAX_WIDTH,
    maxHeight: 500,
  });

  const [resolvedSpec, setResolvedSpec] = React.useState<any | null>(null);

  // Load datasetId from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem("sessionFileData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setDatasetId(parsed.datasetId);
    }
  }, []);

    useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [resolvedSpec]);

  type AIContext = {
    profiles: AIColumnsProfileContext[];
    currentSpec: typeof baseSpec;
  };

  // Fetch column profiles and update AI context
  useEffect(() => {
    if (datasetId) {
      getAIContext(datasetId).then((data) => {
        if (data && data.profiles) {
          const aiContext: AIContext = {
            profiles: data.profiles,
            currentSpec: baseSpec,
          };
          updateState({ aiContext: JSON.stringify(aiContext) });
        }
      });
    }
  }, [datasetId, baseSpec, updateState]);

  // Listen for AI responses and update chart spec
  useEffect(() => {
    if (sharedState.aiResponseContext) {
      const aiResponse = safeJsonParse<AIResponse<string>>(
        sharedState.aiResponseContext
      );
      if (!aiResponse) return;
      const specs = safeJsonParse<typeof baseSpec>(aiResponse.updatedData);
      if (!specs) return;

      setBaseSpec(specs);
      setError(null);
      setIsStarted(false);

    }
  }, [sharedState.aiResponseContext, setBaseSpec]);

  /**
   * Helper function to parse a cell value into a number or string.
   */
  const cell = (v: string) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : String(v).trim();
  };

  /**
   * Fetches data for multiple columns and transforms it into row objects.
   */
  async function valuesFromFeatures(
    datasetId: number,
    features: string[]
  ): Promise<Record<string, any>[]> {
    const columns: ColumnData[] = await Promise.all(
      features.map((f) => getColumnData({ datasetId, columnName: f }))
    );

    const rowMap = columns.reduce<Record<number, Record<string, any>>>(
      (acc, col) => {
        col.dataRecords.forEach(({ recordNumber, value }) => {
          const row = acc[recordNumber] || (acc[recordNumber] = {});
          row[col.columnName] = cell(value);
        });
        return acc;
      },
      {}
    );

    return Object.keys(rowMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((k) => rowMap[k]);
  }

  /**
   * Enriches the Vega spec with actual data from the backend.
   */
  async function extendSpecWithData(
    datasetId: number,
    initialSpec: typeof spec
  ): Promise<typeof spec> {
    try {
      const feat = Object.keys(initialSpec.data?.values?.[0] ?? {});
      if (feat.length === 0) {
        throw new Error("No features selected for chart.");
      }

      const value = await valuesFromFeatures(datasetId, feat);
      if (!value || value.length === 0) {
        throw new Error("No matching data found in the database.");
      }

      return {
        ...initialSpec,
        data: {
          values: value,
        },
        encoding: {
          ...initialSpec.encoding,
          color: {
            ...(initialSpec.encoding?.color || {}),
            scale: { scheme: theme },
          },
        },
      };
      
    } catch (err: any) {
      console.error("extendSpecWithData error:", err.message);
      setError(err.message || "Failed to fetch data.");
      throw err;
    }
  }

  // Memoized promise for data-enriched spec
  const fullSpecPromise = React.useMemo(
    () =>
      datasetId !== undefined
        ? extendSpecWithData(datasetId, spec)
        : Promise.resolve(spec),
    [datasetId, spec]
  );

  // Resolve the spec promise and update state
  React.useEffect(() => {
    let alive = true;
    setIsLoading(true); // Start loading when spec changes
    fullSpecPromise
      .then((s) => {
        if (alive) {
          setResolvedSpec(s);
          setError(null);
        }
      })
      .catch(() => {
        if (alive) {
          setResolvedSpec(spec);
        }
      })
      .finally(() => {
      if (alive) setIsLoading(false); // Stop loading once done
    });
    return () => {
      alive = false;
    };
  }, [fullSpecPromise, spec]);

  return (
    <div ref = {scrollRef} className="flex flex-col h-full  bg-white overflow-y-auto" >      <div className="flex-1">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
          {/* Top Control Bar */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <ChartControls
              width={width}
              onWidthChange={setWidth}
              ratio={ratio}
              onRatioChange={setRatio}
              maxWidth={MAX_WIDTH}
              clampedWidth={clampedWidth}
              height={height}
            />
          </div>

          {/* Chart Area */}
          <div className="min-h-[400px] border border-gray-200 rounded-lg shadow-inner bg-gray-50 flex items-center justify-center p-6">
            {error ? (
              <div className="flex flex-col items-center justify-center gap-3 p-6">
                <div className="text-red-600 font-semibold text-lg">
                  ⚠ Error loading chart
                </div>
                <div className="text-red-500 text-center max-w-md">
                  {error}
                </div>
              </div>
            ) : isLoading ? (
              <Loader />
            ) : isStarted ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-gray-600">
                    <span className="text-sm font-medium">
                      💬 Chat with AI to get your visualization on the chart rendered.
                    </span>
                  </div>
                ) : (
              <ChartBox
                spec={resolvedSpec}
                onViewReady={(view) => (vegaRef.current = view)}
              />
            )}
          </div>

          {/* Bottom Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <ChartThemePicker
              themes={chartThemes}
              activeScheme={theme}
              onPick={(scheme) => setTheme(scheme)}
            />
            <ExportButtons getView={() => vegaRef.current} />
          </div>
        </div>
      </div>
    </div>
  );
}
// "use client";
// /* eslint-disable  @typescript-eslint/no-explicit-any */

// import React, { useEffect, useRef, useState } from "react";
// import ChartControls from "./components/ChartControls";
// import ChartThemePicker from "./components/ChartThemePicker";
// import ChartBox from "./components/ChartBox";
// import ExportButtons from "./components/ExportButtons";
// import Loader from "./components/Loader";
// import { useVegaSpec } from "./hooks/useVegaSpec";
// import { chartThemes } from "./lib/chartThemes";
// import { AIColumnsProfileContext, ColumnData } from "./data";
// import { fetchData, safeJsonParse } from "@/lib/api";
// import useStore from "@/lib/store";
// import { AIResponse } from "../layout";

// /**
//  * Fetches the schema and column profiles for a given dataset.
//  */
// const getAIContext = async (datasetId: number) =>
//   await fetchData<{ profiles: AIColumnsProfileContext[] }>(
//     `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getSchema/${datasetId}`
//   );

// type GetColumnDataByNameRequestDto = {
//   datasetId: number;
//   columnName: string;
// };

// /**
//  * Fetches the actual data records for a specific column in a dataset.
//  */
// const getColumnData = async (
//   getColumnDataRequestDto: GetColumnDataByNameRequestDto
// ) =>
//   await fetchData<ColumnData>(
//     `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnDataByName`,
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(getColumnDataRequestDto),
//     }
//   );

// export default function Page() {
//   const [datasetId, setDatasetId] = useState<number | undefined>();
//   const { sharedState, updateState } = useStore();

//   const [width, setWidth] = useState(600);
//   const [ratio, setRatio] = useState<"original" | "16:9" | "4:3" | "1:1">("16:9");
//   const [theme, setTheme] = useState<string>("tableau10");
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isStarted, setIsStarted] = useState(true);
  
//   // Cache the fetched data separately
//   const [cachedData, setCachedData] = useState<Record<string, any>[] | null>(null);

//   const vegaRef = useRef<any | null>(null);
//   const scrollRef = useRef<HTMLDivElement | null>(null);

//   const MAX_WIDTH = 800;

//   const { setBaseSpec, baseSpec, spec, clampedWidth, height } = useVegaSpec({
//     width,
//     ratio,
//     theme,
//     maxWidth: MAX_WIDTH,
//     maxHeight: 500,
//   });

//   const [resolvedSpec, setResolvedSpec] = React.useState<any | null>(null);

//   // Load datasetId from session storage
//   useEffect(() => {
//     const stored = sessionStorage.getItem("sessionFileData");
//     if (stored) {
//       const parsed = JSON.parse(stored);
//       setDatasetId(parsed.datasetId);
//     }
//   }, []);

//     useEffect(() => {
//     if (scrollRef.current) {
//       scrollRef.current.scrollTo({
//         top: scrollRef.current.scrollHeight,
//         behavior: "smooth",
//       });
//     }
//   }, [resolvedSpec]);

//   type AIContext = {
//     profiles: AIColumnsProfileContext[];
//     currentSpec: typeof baseSpec;
//   };

//   // Fetch column profiles and update AI context
//   useEffect(() => {
//     if (datasetId) {
//       getAIContext(datasetId).then((data) => {
//         if (data && data.profiles) {
//           const aiContext: AIContext = {
//             profiles: data.profiles,
//             currentSpec: baseSpec,
//           };
//           updateState({ aiContext: JSON.stringify(aiContext) });
//         }
//       });
//     }
//   }, [datasetId, baseSpec, updateState]);

//   // Listen for AI responses and update chart spec
//   useEffect(() => {
//     if (sharedState.aiResponseContext) {
//       const aiResponse = safeJsonParse<AIResponse<string>>(
//         sharedState.aiResponseContext
//       );
//       if (!aiResponse) return;
//       const specs = safeJsonParse<typeof baseSpec>(aiResponse.updatedData);
//       if (!specs) return;

//       setBaseSpec(specs);
//       setError(null);
//       setIsStarted(false);
//       // Clear cached data when spec changes from AI
//       setCachedData(null);
//     }
//   }, [sharedState.aiResponseContext, setBaseSpec]);

//   /**
//    * Helper function to parse a cell value into a number or string.
//    */
//   const cell = (v: string) => {
//     if (v == null || v === "") return null;
//     const n = Number(v);
//     return Number.isFinite(n) ? n : String(v).trim();
//   };

//   /**
//    * Fetches data for multiple columns and transforms it into row objects.
//    */
//   async function valuesFromFeatures(
//     datasetId: number,
//     features: string[]
//   ): Promise<Record<string, any>[]> {
//     const columns: ColumnData[] = await Promise.all(
//       features.map((f) => getColumnData({ datasetId, columnName: f }))
//     );

//     const rowMap = columns.reduce<Record<number, Record<string, any>>>(
//       (acc, col) => {
//         col.dataRecords.forEach(({ recordNumber, value }) => {
//           const row = acc[recordNumber] || (acc[recordNumber] = {});
//           row[col.columnName] = cell(value);
//         });
//         return acc;
//       },
//       {}
//     );

//     return Object.keys(rowMap)
//       .map(Number)
//       .sort((a, b) => a - b)
//       .map((k) => rowMap[k]);
//   }

//   /**
//    * Enriches the Vega spec with actual data from the backend.
//    */
//   async function extendSpecWithData(
//     datasetId: number,
//     initialSpec: typeof spec,
//     currentTheme: string
//   ): Promise<typeof spec> {
//     try {
//       const feat = Object.keys(initialSpec.data?.values?.[0] ?? {});
//       if (feat.length === 0) {
//         throw new Error("No features selected for chart.");
//       }

//       // Use cached data if available
//       let value = cachedData;
//       if (!value) {
//         value = await valuesFromFeatures(datasetId, feat);
//         if (!value || value.length === 0) {
//           throw new Error("No matching data found in the database.");
//         }
//         setCachedData(value);
//       }

//       return {
//         ...initialSpec,
//         data: {
//           values: value,
//         },
//         encoding: {
//           ...initialSpec.encoding,
//           color: {
//             ...(initialSpec.encoding?.color || {}),
//             scale: { scheme: currentTheme },
//           },
//         },
//       };
      
//     } catch (err: any) {
//       console.error("extendSpecWithData error:", err.message);
//       setError(err.message || "Failed to fetch data.");
//       throw err;
//     }
//   }

//   // Create a spec key that excludes theme for data fetching
//   const specDataKey = React.useMemo(() => {
//     return JSON.stringify({
//       mark: spec.mark,
//       encoding: spec.encoding,
//       data: spec.data,
//       // Exclude visual properties that don't affect data
//     });
//   }, [spec]);

//   // Memoized promise for data-enriched spec (doesn't depend on theme directly)
//   const fullSpecPromise = React.useMemo(
//     () =>
//       datasetId !== undefined
//         ? extendSpecWithData(datasetId, spec, theme)
//         : Promise.resolve(spec),
//     [datasetId, specDataKey, theme] // Use specDataKey instead of spec
//   );

//   // Resolve the spec promise and update state
//   React.useEffect(() => {
//     let alive = true;
//     setIsLoading(true);
//     fullSpecPromise
//       .then((s) => {
//         if (alive) {
//           setResolvedSpec(s);
//           setError(null);
//         }
//       })
//       .catch(() => {
//         if (alive) {
//           setResolvedSpec(spec);
//         }
//       })
//       .finally(() => {
//       if (alive) setIsLoading(false);
//     });
//     return () => {
//       alive = false;
//     };
//   }, [fullSpecPromise, spec]);

//   return (
//     <div ref = {scrollRef} className="flex flex-col h-full  bg-white overflow-y-auto" >      <div className="flex-1">
//         <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
//           {/* Top Control Bar */}
//           <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
//             <ChartControls
//               width={width}
//               onWidthChange={setWidth}
//               ratio={ratio}
//               onRatioChange={setRatio}
//               maxWidth={MAX_WIDTH}
//               clampedWidth={clampedWidth}
//               height={height}
//             />
//           </div>

//           {/* Chart Area */}
//           <div className="min-h-[400px] border border-gray-200 rounded-lg shadow-inner bg-gray-50 flex items-center justify-center p-6">
//             {isStarted ? (
//                   <div className="flex flex-col items-center justify-center gap-3 text-gray-600">
//                     <span className="text-sm font-medium">
//                       💬 Chat with AI to get your visualization on the chart rendered.
//                     </span>
//                   </div>
//                 ): error ? (
//               <div className="flex flex-col items-center justify-center gap-3 p-6">
//                 <div className="text-red-600 font-semibold text-lg">
//                   ⚠ Error loading chart
//                 </div>
//                 <div className="text-red-500 text-center max-w-md">
//                   {error}
//                 </div>
//               </div>
//             ) : isLoading ? (
//               <Loader />
//             )  : (
//               <ChartBox
//                 spec={resolvedSpec}
//                 onViewReady={(view) => (vegaRef.current = view)}
//               />
//             )}
//           </div>

//           {/* Bottom Toolbar */}
//           <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
//             <ChartThemePicker
//               themes={chartThemes}
//               activeScheme={theme}
//               onPick={(scheme) => setTheme(scheme)}
//             />
//             <ExportButtons getView={() => vegaRef.current} />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }