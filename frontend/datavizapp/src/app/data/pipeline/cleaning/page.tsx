"use client";

import { AgGridReact } from "ag-grid-react";
import { useEffect, useState, useMemo, JSX } from "react";
import { ColDef } from "ag-grid-community";
import { useCleanColumnDataTester, usePyFunctions } from "@/lib/hooks/cleaningHooks";
import { ColumnData } from "@/lib/hooks/cleaningHooks";
import { fetchData, safeJsonParse } from "@/lib/api";
import { ColumnProfile } from "../profiling/components/CarouselItem";
import { getColumnProfile } from "../profiling/page";
import { RecordDto } from "@/lib/models";
import Button from "@/app/components/input/Button";
import { useVegaEmbed } from "react-vega";
import React, { useRef } from "react";
import { VisualizationSpec } from "vega-embed";
import useStore from "@/lib/store";
import { AIResponse } from "../layout";

const ColumnDistributionChart = ({ columnData }: { columnData: ColumnData | undefined }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [binStep, setBinStep] = useState<number | undefined>(undefined);

  if (!columnData) return null;

  const numericValues = columnData.dataRecords
    .map(r => parseFloat(r.value))
    .filter(v => !isNaN(v));

  let spec: VisualizationSpec;

  if (numericValues.length > 0) {
    // Numeric data - render histogram if all integers, boxplot if any float
    const allIntegers = numericValues.every(v => Number.isInteger(v));
    if (allIntegers) {
      // Histogram (bar chart)
      spec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description: "Histogram of integer values",
        data: { values: numericValues.map(v => ({ value: v })) },
        mark: { type: "bar", tooltip: true },
        encoding: {
          x: {
            field: "value",
            type: "quantitative",
            bin: true,
            title: "Value"
          },
          y: {
            aggregate: "count",
            type: "quantitative",
            title: "Count"
          },
          tooltip: [
            { field: "value", type: "quantitative", bin: true, title: "Value" },
            { aggregate: "count", type: "quantitative", title: "Count" }
          ]
        }
      };
    } else {
      // Box plot for floats
      spec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description: "Box plot of numeric values",
        data: { values: numericValues.map(v => ({ value: v })) },
        mark: { type: "boxplot" },
        encoding: {
          x: { field: "value", type: "quantitative", title: "Value" },
          tooltip: [
            { field: "value", type: "quantitative", title: "Value" }
          ]
        }
      };
    }
  } else {
    // Categorical data
    const counts: Record<string, number> = {};
    columnData.dataRecords.forEach(r => {
      counts[r.value] = (counts[r.value] || 0) + 1;
    });
    const values = Object.entries(counts).map(([category, count]) => ({ category, count }));

    spec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      description: "Category frequency chart",
      data: { values },
      mark: { type: "bar", tooltip: true },
      encoding: {
        x: { field: "category", type: "ordinal", title: "Category" },
        y: { field: "count", type: "quantitative", title: "Count" },
        tooltip: [
          { field: "category", type: "ordinal", title: "Category" },
          { field: "count", type: "quantitative", title: "Count" }
        ]
      }
    };
  }

  useVegaEmbed({ ref, spec: spec as any, options: { actions: false } });

  return (
    <div className="mt-4">
      {numericValues.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm">Bin Size:</label>
          <input
            type="number"
            className="input input-bordered input-sm w-20"
            value={binStep ?? ""}
            onChange={(e) => setBinStep(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="auto"
          />
        </div>
      )}
      <div ref={ref} className="h-64" />
    </div>
  );
};



export async function getRecordById(datasetId: number, recordId: number){
  return await fetchData<RecordDto>(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getRecord/${datasetId}/${recordId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
}

// We'll declare this variable at the module level and assign it inside the component



export default function CleaningPage() {
  // --- Single master state for all state variables ---

  const [masterState, setMasterState] = useState({
    leftWidth: 70,
    rightWidth: 30,
    dragging: false,
    datasetId: undefined as number | undefined,
    columnData: undefined as ColumnData | undefined,
    columnNumber: null as number | null,
    columnProfileList: null as ColumnProfile[] | null,
    selectedRow: null as { recordNumber: number; value: string } | null,
    recordDetail: null as RecordDto | null,
    gridApi: null as any,
    applyFiltered: false,
    paramsState: {} as Record<string, any>,
    selectedFunction: null as string | null,
    currentMasterTab: "Single Column Operations",
    currentSubTab: "Select Column",
    searchQuery: "",
    sortOrder: "none" as "none" | "asc" | "desc",
    columnSummaryState: null as NumericSummary | CategoricalSummary | null,
    minifiedColumnData: [] as { recordNumber: number; oldValue: string; newValue: string }[],
  });
  const {setCleaningCode, context, setContext, setExecuteCleaning} = useCleanColumnDataTester();
  const { sharedState, updateState } = useStore();

  type SendToAIContext = {
    minifiedColumnData: { recordNumber: number; oldValue: string; newValue: string }[];
    columnSummaryState: NumericSummary | CategoricalSummary | null;
    columnProfileList: ColumnProfile[] | null;
    columnNumber: number | null;
    paramsState: Record<string, any>;
    selectedFunction: string | null;
    currentMasterTab: string;
    currentSubTab: string;
  }

  type ReceiveFromAIContext = {
    columnNumber?: number | null;
    paramsState?: Record<string, any>;
    selectedFunction?: string | null;
    currentMasterTab?: string;
    currentSubTab?: string;
  }

  // --- New state for column summary/statistics ---
  type NumericSummary = {
    type: "numeric";
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    std: number;
  };
  type CategoricalSummary = {
    type: "categorical";
    totalRecords: number;
    uniqueValues: number;
    mostFrequent: string[];
    mostFrequentCount: number;
    counts: Record<string, number>;
  };

  // minifiedColumnData is now part of masterState; update it via effect
  useEffect(() => {
    let minified: { recordNumber: number; oldValue: string; newValue: string }[] = [];
    if (masterState.gridApi && masterState.columnData && context?.columnData) {
      // Get first 5 displayed rows from AG Grid
      const displayedRows: any[] = [];
      masterState.gridApi.forEachNodeAfterFilterAndSort((node: any, idx: number) => {
        if (displayedRows.length < 5) {
          displayedRows.push(node.data);
        }
      });
      // Map from recordNumber to original value (before transformation)
      const origValueByRecordNumber: Record<number, string> = {};
      masterState.columnData.dataRecords.forEach(r => {
        origValueByRecordNumber[r.recordNumber] = r.value;
      });
      minified = displayedRows.map(row => ({
        recordNumber: row.recordNumber,
        oldValue: origValueByRecordNumber[row.recordNumber] ?? row.value,
        newValue: row.newValue
      }));
    } else if (masterState.columnData && context?.columnData) {
      const origRecords = masterState.columnData.dataRecords.slice(0, 5);
      const newRecords = context.columnData.dataRecords.slice(0, 5);
      minified = origRecords.map((r, i) => ({
        recordNumber: r.recordNumber,
        oldValue: r.value,
        newValue: newRecords[i]?.value ?? r.value
      }));
    }
    setMasterState(prev => ({ ...prev, minifiedColumnData: minified }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterState.gridApi, masterState.columnData, context]);

  useEffect(() => {
    const aiContext: SendToAIContext = {
      minifiedColumnData: masterState.minifiedColumnData,
      columnSummaryState: masterState.columnSummaryState,
      columnProfileList: masterState.columnProfileList,
      columnNumber: masterState.columnNumber,
      paramsState: masterState.paramsState,
      selectedFunction: masterState.selectedFunction,
      currentMasterTab: masterState.currentMasterTab,
      currentSubTab: masterState.currentSubTab
    };
    updateState({
      aiContext: JSON.stringify(aiContext, null, 2)
    });
  }, [masterState]);

  useEffect(() => {
    if (sharedState.aiResponseContext) {
      const parsed = safeJsonParse<AIResponse<ReceiveFromAIContext>>(sharedState.aiResponseContext);
      if (parsed && parsed.updatedData) {
        setMasterState(prev => ({ ...prev, ...parsed.updatedData }));
      }
    }
  }, [sharedState.aiResponseContext]);





  // Compute column summary whenever columnData changes or new column is selected
  useEffect(() => {
    if (!masterState.columnData) {
      setMasterState(prev => ({ ...prev, columnSummaryState: null }));
      return;
    }
    const numericValues = masterState.columnData.dataRecords
      .map(r => parseFloat(r.value))
      .filter(v => !isNaN(v));
    if (numericValues.length > 0) {
      // Numeric summary
      const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const median = (() => {
        const sorted = [...numericValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;
      })();
      const variance = numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numericValues.length;
      const std = Math.sqrt(variance);
      setMasterState(prev => ({
        ...prev,
        columnSummaryState: {
          type: "numeric",
          count: numericValues.length,
          mean,
          median,
          min,
          max,
          std
        }
      }));
    } else {
      // Categorical summary
      const counts: Record<string, number> = {};
      masterState.columnData.dataRecords.forEach(r => {
        counts[r.value] = (counts[r.value] || 0) + 1;
      });
      const maxCount = Math.max(0, ...Object.values(counts));
      const mostFrequent = Object.entries(counts)
        .filter(([_, c]) => c === maxCount)
        .map(([v]) => v);
      setMasterState(prev => ({
        ...prev,
        columnSummaryState: {
          type: "categorical",
          totalRecords: numericValues.length ?? 0,
          uniqueValues: Object.keys(counts).length,
          mostFrequent,
          mostFrequentCount: maxCount,
          counts
        }
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterState.columnData, masterState.columnNumber]);
  // ---

  const fetchColumnData = async (datasetId: number, columnNumber: number) =>
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        datasetId: datasetId,
        columnNumber: columnNumber
      })
    })
      .then(res => res.text())
      .then(safeJsonParse<ColumnData>)
      .then(e => {
        setMasterState(prev => ({ ...prev, columnData: e }));
        setContext(e ? { columnData: e } : undefined);
      });


  const columnDefs = useMemo<ColDef[]>(() => [
    { headerName: "Current Value", field: "value", filter: 'agTextColumnFilter'},
    { headerName: "New Value", field: "newValue", filter: 'agTextColumnFilter'},
    { headerName: "Record Number", field: "recordNumber", filter: 'agNumberColumnFilter'},
  ], []);

  const rowData: {
    recordNumber: number;
    value: string;
    newValue: string;
  }[] = useMemo(() => {
    if (!masterState.columnData) return [];
    if (context) {
      return masterState.columnData.dataRecords.map((record, index) => ({
        recordNumber: record.recordNumber,
        value: record.value,
        newValue: context.columnData.dataRecords[index].value
      }));
    }
    return masterState.columnData.dataRecords.map((record, index) => ({
      recordNumber: record.recordNumber,
      value: record.value,
      newValue: record.value
    }));
  }, [masterState.columnData, context]);

  useEffect(() => {
    const stored = sessionStorage.getItem("sessionFileData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setMasterState(prev => ({ ...prev, datasetId: parsed.datasetId }));
    }
  }, []);

  useEffect(() => {
    if (!masterState.datasetId) return;
    getColumnProfile(masterState.datasetId).then(list =>
      setMasterState(prev => ({ ...prev, columnProfileList: list }))
    );
  }, [masterState.datasetId]);

  useEffect(() => {
    if (!masterState.datasetId || masterState.columnNumber === null) {
      return;
    }
    fetchColumnData(masterState.datasetId, masterState.columnNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterState.datasetId, masterState.columnNumber]);

  useEffect(() => {
    if (
      masterState.datasetId !== undefined &&
      masterState.selectedRow?.recordNumber !== undefined &&
      masterState.selectedRow?.recordNumber !== null
    ) {
      getRecordById(masterState.datasetId, masterState.selectedRow.recordNumber).then(detail =>
        setMasterState(prev => ({ ...prev, recordDetail: detail }))
      );
    } else {
      setMasterState(prev => ({ ...prev, recordDetail: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterState.datasetId, masterState.selectedRow]);

  // Save column data to backend
  const saveColumnData = async () => {
    if (!context || !masterState.datasetId) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/setColumnData`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(context.columnData),
      });
      fetchColumnData(masterState.datasetId, context.columnData.columnNumber);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to save column data", err);
    } finally {
    }
  };

  // Template code for each transformation function
  const transformationTemplates: Record<string, { code: string, input?: JSX.Element | null }> = {
    "Log Transform": {
      code: `
import math
for record in column_data.get("dataRecords", []):
    if record.get("recordNumber") in filtered_record_numbers:
        try:
            val = float(record["value"])
            record["value"] = str(math.log(val))
        except:
            pass
`,
    },
    "Square Root": {
      code: `
import math
for record in column_data.get("dataRecords", []):
    if record.get("recordNumber") in filtered_record_numbers:
        try:
            val = float(record["value"])
            record["value"] = str(math.sqrt(val))
        except:
            pass
`,
    },
    "Z-Score": {
      code: `
import math
values = [float(r.get("value")) for r in column_data.get("dataRecords", []) if r.get("recordNumber") in filtered_record_numbers and r.get("value") not in [None, ""]]
if values:
    mean = sum(values) / len(values)
    std = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values))
    for record in column_data.get("dataRecords", []):
        if record.get("recordNumber") in filtered_record_numbers:
            try:
                val = float(record["value"])
                record["value"] = str((val - mean) / std if std != 0 else 0)
            except:
                pass
`,
    },
    "Lambda Apply": {
      code: `
lambda_expr = locals().get("lambda_expr", "")
func = eval(lambda_expr)
for record in column_data.get("dataRecords", []):
    if record.get("recordNumber") in filtered_record_numbers:
        record["value"] = str(func(record["value"]))
`,
      input: (
        <input
          type="text"
          placeholder="Lambda expression (e.g., lambda x: x.strip().lower())"
          className="input input-bordered input-sm"
          value={masterState.paramsState.lambda_expr ?? ""}
          onChange={e =>
            setMasterState(prev => ({
              ...prev,
              paramsState: { ...prev.paramsState, lambda_expr: e.target.value }
            }))
          }
        />
      ),
    },
  };

  // Transform Column tab UI (simplified: only Lambda Apply with trivial functions)
  const renderTransformUI = () => {
    const trivialFunctions = [
      {
        key: "z-score Normalization",
        label: "z-score Normalization",
        lambda: "lambda x: str((float(x) - μ) / σ)"
      },
      {
        key: "Round Values",
        label: "Round Values",
        lambda: "lambda x: str(round(float(x)))"
      },
      {
        key: "Trim Whitespace",
        label: "Trim Whitespace",
        lambda: "lambda x: x.strip() if isinstance(x, str) else x"
      },
      {
        key: "Lowercase",
        label: "Lowercase",
        lambda: "lambda x: x.lower() if isinstance(x, str) else x"
      },
      {
        key: "Replace",
        label: "Replace",
        lambda: "lambda x: 'New Value'"
      }
    ];

    return (
      <div className="flex flex-col gap-3">
        <div className="font-semibold mb-2">Lambda Transformation</div>
        <input
          type="text"
          placeholder="Lambda expression (e.g., lambda x: x.strip().lower())"
          className="input input-bordered input-sm w-full"
          value={masterState.paramsState.lambda_expr ?? ""}
          onChange={e =>
            setMasterState(prev => ({
              ...prev,
              paramsState: { ...prev.paramsState, lambda_expr: e.target.value }
            }))
          }
        />
        <div className="font-semibold mt-2 mb-1 text-sm">Select a Default Function</div>
        <ul className="list bg-base-100 rounded-box shadow-md overflow-y-auto max-h-48">
          {trivialFunctions.map(fn => (
            <li
              key={fn.key}
              className="list-row cursor-pointer hover:bg-base-200 px-4 py-2"
              onClick={() => {
                setMasterState(prev => ({
                  ...prev,
                  paramsState: { ...prev.paramsState, lambda_expr: fn.lambda }
                }));
              }}
            >
              {fn.label}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 mb-2 mt-2">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={masterState.applyFiltered}
            onChange={(e) =>
              setMasterState(prev => ({
                ...prev,
                applyFiltered: e.target.checked
              }))
            }
          />
          <span className="text-sm">{masterState.applyFiltered ? "Apply to Filtered Records" : "Apply to All Records"}</span>
        </div>
        <Button
          label="Apply"
          action={async () => {
            let filteredRecordNumbers: number[] = [];
            if (masterState.applyFiltered && masterState.gridApi) {
              masterState.gridApi.forEachNodeAfterFilter((node: any) => {
                if (node.data?.recordNumber !== undefined) {
                  filteredRecordNumbers.push(node.data.recordNumber);
                }
              });
            }
            const params: Record<string, any> = {
              ...masterState.paramsState,
              filtered_record_numbers:
                filteredRecordNumbers.length > 0 && masterState.applyFiltered
                  ? filteredRecordNumbers
                  : masterState.columnData?.dataRecords.map((r) => r.recordNumber) ?? [],
            };
            setCleaningCode(transformationTemplates["Lambda Apply"].code);
            setExecuteCleaning({ toExecute: true, params });
          }}
        />
        <Button
          label="Save to DB"
          action={saveColumnData}
        />
        <Button
          label="Reset Changes"
          action={() => {
            setContext( masterState.columnData ? { columnData: masterState.columnData } : context);
          }}
        />
      </div>
    );
  };

  // Resizable panel logic: dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!masterState.dragging) return;
      const container = document.querySelector('.resizable-container');
      if (!container) return;
      const containerRect = (container as HTMLElement).getBoundingClientRect();
      const containerWidth = containerRect.width || 1;
      const x = e.clientX - containerRect.left;
      const newLeftWidth = (x / containerWidth) * 100;
      if (newLeftWidth > 20 && newLeftWidth < 80) {
        setMasterState(prev => ({
          ...prev,
          leftWidth: newLeftWidth,
          rightWidth: 100 - newLeftWidth,
        }));
      }
    };
    const stopDragging = () => setMasterState(prev => ({ ...prev, dragging: false }));
    if (!masterState.dragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDragging);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDragging);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterState.dragging]);

  return (
    <div className="tabs tabs-box">
      <input
        type="radio"
        name="my_tabs_6"
        className="tab"
        aria-label="Single Column Operations"
        checked={masterState.currentMasterTab === "Single Column Operations"}
        onChange={() => setMasterState(prev => ({ ...prev, currentMasterTab: "Single Column Operations" }))}
      />
      <div className="tab-content bg-base-100 border-base-300 p-6">
        <div className="resizable-container flex mt-4 h-[600px]">
          <div style={{ width: masterState.leftWidth + '%' }} className="h-full flex flex-col pr-2">
            <div className="ag-theme-alpine flex-1">
              <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                singleClickEdit={true}
                rowSelection="single"
                onRowClicked={(event) => setMasterState(prev => ({ ...prev, selectedRow: event.data }))}
                onGridReady={(params) => setMasterState(prev => ({ ...prev, gridApi: params.api }))}
              />
            </div>
          </div>
          <div
            className="w-1 bg-gray-300 cursor-col-resize hover:bg-gray-500"
            onMouseDown={() => setMasterState(prev => ({ ...prev, dragging: true }))}
            style={{ zIndex: 10 }}
          ></div>
          <div style={{ width: masterState.rightWidth + '%' }} className="h-full pl-2 overflow-y-auto max-h-[600px]">
            <div className="tabs tabs-box h-full">
              <input
                type="radio"
                name="my_tabs_2"
                className="tab"
                aria-label="Select Column"
                checked={masterState.currentSubTab === "Select Column"}
                onChange={() => setMasterState(prev => ({ ...prev, currentSubTab: "Select Column" }))}
              />
              <div className="tab-content bg-base-100 border-base-300 p-6 overflow-y-auto">
                <h3 className="font-semibold mb-2">Select Column to Clean</h3>
                {/* Search and sort controls */}
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Search columns..."
                    className="input input-bordered input-sm flex-1"
                    value={masterState.searchQuery}
                    onChange={(e) =>
                      setMasterState(prev => ({ ...prev, searchQuery: e.target.value }))
                    }
                  />
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      setMasterState(prev => ({
                        ...prev,
                        sortOrder:
                          prev.sortOrder === "none"
                            ? "asc"
                            : prev.sortOrder === "asc"
                            ? "desc"
                            : "none",
                      }))
                    }
                  >
                    {masterState.sortOrder === "none"
                      ? "Sort"
                      : masterState.sortOrder === "asc"
                      ? "↑"
                      : "↓"}
                  </button>
                </div>
                <ul className="list bg-base-100 rounded-box shadow-md overflow-y-auto max-h-64">
                  <li className="p-4 pb-2 text-xs opacity-60 tracking-wide">Available Columns</li>
                  {
                    (() => {
                      const filteredAndSortedColumns = masterState.columnProfileList
                        ?.filter(cp =>
                          cp.columnName.toLowerCase().includes(masterState.searchQuery.toLowerCase())
                        );
                      if (masterState.sortOrder !== "none") {
                        filteredAndSortedColumns?.sort((a, b) =>
                          masterState.sortOrder === "asc"
                            ? a.columnName.localeCompare(b.columnName)
                            : b.columnName.localeCompare(a.columnName)
                        );
                      }
                      return filteredAndSortedColumns?.map((columnProfile) => (
                        <li
                          key={columnProfile.columnNumber}
                          className={`list-row cursor-pointer ${
                            masterState.columnNumber === columnProfile.columnNumber ? "bg-base-300" : ""
                          }`}
                          onClick={() =>
                            setMasterState(prev => ({ ...prev, columnNumber: columnProfile.columnNumber }))
                          }
                        >
                          <div>
                            <div className="badge badge-neutral">{columnProfile.columnNumber}</div>
                          </div>
                          <div>
                            <div>{columnProfile.columnName}</div>
                          </div>
                        </li>
                      ));
                    })()
                  }
                </ul>
              </div>
              <input
                type="radio"
                name="my_tabs_2"
                className="tab"
                aria-label="View Record"
                checked={masterState.currentSubTab === "View Record"}
                onChange={() => setMasterState(prev => ({ ...prev, currentSubTab: "View Record" }))}
              />
              <div className="tab-content bg-base-100 border-base-300 p-6 overflow-y-auto">
                <h3 className="font-semibold mb-2">Selected Record</h3>
                <div className="text-sm">
                  {!masterState.selectedRow && (
                    <p className="italic text-gray-500">
                      Choose a record to view
                      <br />
                      Perform filtering in the table to narrow down records
                    </p>
                  )}
                  {masterState.selectedRow && masterState.recordDetail && (
                    <>
                      <p className="mb-2 text-gray-600">
                        <strong>Record Number:</strong> {masterState.selectedRow.recordNumber}
                      </p>
                      <ul>
                        {masterState.recordDetail.columnValueDtos?.map((col, i) => {
                          const colName =
                            masterState.columnProfileList?.find(cp => cp.columnNumber === col.columnNumber)?.columnName ??
                            `Column ${col.columnNumber}`;
                          return (
                            <li key={i}>
                              <strong>{colName}:</strong> {col.value}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              </div>
              <input
                type="radio"
                name="my_tabs_2"
                className="tab"
                aria-label="Transform Column"
                checked={masterState.currentSubTab === "Transform Column"}
                onChange={() => setMasterState(prev => ({ ...prev, currentSubTab: "Transform Column" }))}
              />
              <div className="tab-content bg-base-100 border-base-300 p-6 overflow-y-auto">
                {
                  renderTransformUI()
                }
                {
                  context?.jsonResult ?? ""
                }
              </div>
              <input
                type="radio"
                name="my_tabs_2"
                className="tab"
                aria-label="Column Summary"
                checked={masterState.currentSubTab === "Column Summary"}
                onChange={() => setMasterState(prev => ({ ...prev, currentSubTab: "Column Summary" }))}
              />
              <div className="tab-content bg-base-100 border-base-300 p-6 overflow-y-auto">
                <h3 className="font-semibold mb-2">Column Summary</h3>
                {!masterState.columnSummaryState && (
                  <p className="italic text-gray-500">No column data loaded. Select a column to view its statistics.</p>
                )}
                {masterState.columnSummaryState && masterState.columnSummaryState.type === "numeric" && (
                  <>
                    <ul className="text-sm text-gray-700 mb-4">
                      <li><strong>Count:</strong> {masterState.columnSummaryState.count}</li>
                      <li><strong>Mean:</strong> {masterState.columnSummaryState.mean.toFixed(3)}</li>
                      <li><strong>Median:</strong> {masterState.columnSummaryState.median.toFixed(3)}</li>
                      <li><strong>Min:</strong> {masterState.columnSummaryState.min.toFixed(3)}</li>
                      <li><strong>Max:</strong> {masterState.columnSummaryState.max.toFixed(3)}</li>
                      <li><strong>Std Dev:</strong> {masterState.columnSummaryState.std.toFixed(3)}</li>
                    </ul>
                    <ColumnDistributionChart columnData={masterState.columnData} />
                  </>
                )}
                {masterState.columnSummaryState && masterState.columnSummaryState.type === "categorical" && (
                  <>
                    <ul className="text-sm text-gray-700 mb-4">
                      <li><strong>Total Records:</strong> {masterState.columnSummaryState.totalRecords}</li>
                      <li><strong>Unique Values:</strong> {masterState.columnSummaryState.uniqueValues}</li>
                      <li>
                        <strong>Most Frequent:</strong> {masterState.columnSummaryState.mostFrequent.join(", ")}
                        {` (${masterState.columnSummaryState.mostFrequentCount} times)`}
                      </li>
                    </ul>
                    <ColumnDistributionChart columnData={masterState.columnData} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <input
        type="radio"
        name="my_tabs_6"
        className="tab"
        aria-label="Multi-Column Operations"
        checked={masterState.currentMasterTab === "Multi-Column Operations"}
        onChange={() => setMasterState(prev => ({ ...prev, currentMasterTab: "Multi-Column Operations" }))}
      />
      <div className="tab-content bg-base-100 border-base-300 p-6">

      </div>
    </div>
  );
}