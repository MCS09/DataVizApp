"use client";
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { AgGridReact } from "ag-grid-react";
import { useEffect, useState, useMemo, JSX } from "react";
import { ColDef } from "ag-grid-community";
import { useCleanColumnDataTester } from "@/lib/hooks/cleaningHooks";
import { ColumnData } from "@/lib/hooks/cleaningHooks";
import { fetchData, safeJsonParse } from "@/lib/api";
import { RecordDto } from "@/lib/models";
import { useVegaEmbed } from "react-vega";
import React, { useRef } from "react";
import { VisualizationSpec } from "vega-embed";
import useStore from "@/lib/store";
import { AIResponse } from "../layout";
import { ColumnProfile, getColumnProfile } from "@/lib/dataset";

const ColumnDistributionChart = ({ columnData }: { columnData: ColumnData | undefined }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [binStep, setBinStep] = useState<number | undefined>(undefined);

  const spec: VisualizationSpec | undefined = (() => {
    if (!columnData) return undefined;

    const numericValues = columnData.dataRecords
      .map(r => parseFloat(r.value))
      .filter(v => !isNaN(v));

    if (numericValues.length > 0) {
      const allIntegers = numericValues.every(v => Number.isInteger(v));
      if (allIntegers) {
        return {
          $schema: "https://vega.github.io/schema/vega-lite/v5.json",
          description: "Histogram of integer values",
          data: { values: numericValues.map(v => ({ value: v })) },
          mark: { type: "bar", tooltip: true },
          encoding: {
            x: { field: "value", type: "quantitative", bin: true, title: "Value" },
            y: { aggregate: "count", type: "quantitative", title: "Count" },
            tooltip: [
              { field: "value", type: "quantitative", bin: true, title: "Value" },
              { aggregate: "count", type: "quantitative", title: "Count" }
            ]
          }
        };
      } else {
        return {
          $schema: "https://vega.github.io/schema/vega-lite/v5.json",
          description: "Box plot of numeric values",
          data: { values: numericValues.map(v => ({ value: v })) },
          mark: { type: "boxplot" },
          encoding: {
            x: { field: "value", type: "quantitative", title: "Value" },
            tooltip: [{ field: "value", type: "quantitative", title: "Value" }]
          }
        };
      }
    } else {
      const counts: Record<string, number> = {};
      columnData.dataRecords.forEach(r => {
        counts[r.value] = (counts[r.value] || 0) + 1;
      });
      const values = Object.entries(counts).map(([category, count]) => ({ category, count }));

      return {
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
  })();

  useVegaEmbed({ ref, spec, options: { actions: false } });

  if (!columnData) return null;

  return (
    <div className="mt-6">
      {spec && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <label className="text-sm font-medium text-slate-700">Bin Size:</label>
          <input
            type="number"
            className="w-24 rounded-lg border-2 border-slate-200 px-3 py-1 text-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            value={binStep ?? ""}
            onChange={(e) => setBinStep(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="auto"
          />
        </div>
      )}
      <div ref={ref} className="h-64 rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm" />
    </div>
  );
};

async function getRecordById(datasetId: number, recordId: number){
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

export default function CleaningPage() {
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

  useEffect(() => {
    let minified: { recordNumber: number; oldValue: string; newValue: string }[] = [];
    if (masterState.gridApi && masterState.columnData && context?.columnData) {
      const displayedRows: any[] = [];
      masterState.gridApi.forEachNodeAfterFilterAndSort((node: any) => {
        if (displayedRows.length < 5) {
          displayedRows.push(node.data);
        }
      });
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

  useEffect(() => {
    if (!masterState.columnData) {
      setMasterState(prev => ({ ...prev, columnSummaryState: null }));
      return;
    }
    const numericValues = masterState.columnData.dataRecords
      .map(r => parseFloat(r.value))
      .filter(v => !isNaN(v));
    if (numericValues.length > 0) {
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
      const counts: Record<string, number> = {};
      masterState.columnData.dataRecords.forEach(r => {
        counts[r.value] = (counts[r.value] || 0) + 1;
      });
      const maxCount = Math.max(0, ...Object.values(counts));
      const mostFrequent = Object.entries(counts)
        .filter(([, c]) => c === maxCount)
        .map(([v]) => v);
      setMasterState(prev => ({
        ...prev,
        columnSummaryState: {
          type: "categorical",
          totalRecords: masterState.columnData?.dataRecords.length ?? 0,
          uniqueValues: Object.keys(counts).length,
          mostFrequent,
          mostFrequentCount: maxCount,
          counts
        }
      }));
    }
  }, [masterState.columnData, masterState.columnNumber]);

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
    return masterState.columnData.dataRecords.map((record) => ({
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
  }, [masterState.datasetId, masterState.selectedRow]);

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
      console.error("Failed to save column data", err);
    }
  };

  const transformationTemplates: Record<string, { code: string, input?: JSX.Element | null }> = {
    "Lambda Apply": {
      code: `
lambda_expr = locals().get("lambda_expr", "")
func = eval(lambda_expr)
for record in column_data.get("dataRecords", []):
    if record.get("recordNumber") in filtered_record_numbers:
        record["value"] = str(func(record["value"]))
`,
    },
  };

  const renderTransformUI = () => {
    const trivialFunctions = [
      {
        key: "z-score",
        label: "Z-Score Normalization",
        lambda: "lambda x: str((float(x) - μ) / σ)",
        icon: "📊"
      },
      {
        key: "round",
        label: "Round Values",
        lambda: "lambda x: str(round(float(x)))",
        icon: "🔢"
      },
      {
        key: "trim",
        label: "Trim Whitespace",
        lambda: "lambda x: x.strip() if isinstance(x, str) else x",
        icon: "✂️"
      },
      {
        key: "lowercase",
        label: "Lowercase",
        lambda: "lambda x: x.lower() if isinstance(x, str) else x",
        icon: "🔤"
      },
      {
        key: "replace",
        label: "Replace Value",
        lambda: "lambda x: 'New Value'",
        icon: "🔄"
      }
    ];

    return (
      <div className="space-y-4">
        {context?.jsonResult && (
          <div className="mt-4 rounded-lg bg-slate-900 p-4 text-xs text-green-400">
            <pre className="overflow-x-auto">{context.jsonResult}</pre>
          </div>
        )}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Lambda Expression</label>
          <input
            type="text"
            placeholder="e.g., lambda x: x.strip().lower()"
            className="w-full rounded-lg border-2 border-slate-200 px-4 py-2 text-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            value={masterState.paramsState.lambda_expr ?? ""}
            onChange={e =>
              setMasterState(prev => ({
                ...prev,
                paramsState: { ...prev.paramsState, lambda_expr: e.target.value }
              }))
            }
          />
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-2 border-slate-300 text-purple-600 transition-all focus:ring-2 focus:ring-purple-200"
              checked={masterState.applyFiltered}
              onChange={(e) =>
                setMasterState(prev => ({
                  ...prev,
                  applyFiltered: e.target.checked
                }))
              }
            />
            <div>
              <div className="text-sm font-medium text-slate-800">
                {masterState.applyFiltered ? "Apply to Filtered Records" : "Apply to All Records"}
              </div>
              <div className="text-xs text-slate-600">
                {masterState.applyFiltered ? "Only selected rows will be transformed" : "All rows will be transformed"}
              </div>
            </div>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
            onClick={async () => {
              const filteredRecordNumbers: number[] = [];
              if (masterState.applyFiltered && masterState.gridApi) {
                  masterState.gridApi.forEachNodeAfterFilter((node: { data?: { recordNumber?: number } }) => {
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
          >
            Apply Transform
          </button>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg border-2 border-green-200 bg-green-50 px-4 py-2 font-semibold text-green-700 transition-all hover:bg-green-100"
            onClick={saveColumnData}
          >
            💾 Save to Database
          </button>
          <button
            className="flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition-all hover:bg-slate-50"
            onClick={() => {
              setContext(masterState.columnData ? { columnData: masterState.columnData } : context);
            }}
          >
            ↺ Reset Changes
          </button>
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-slate-700">Quick Functions</label>
          <div className="grid gap-2">
            {trivialFunctions.map(fn => (
              <button
                key={fn.key}
                className="group flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-white p-3 text-left transition-all hover:border-purple-300 hover:bg-purple-50 hover:shadow-md"
                onClick={() => {
                  setMasterState(prev => ({
                    ...prev,
                    paramsState: { ...prev.paramsState, lambda_expr: fn.lambda }
                  }));
                }}
              >
                <span className="text-2xl transition-transform group-hover:scale-110">{fn.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{fn.label}</div>
                  <code className="text-xs text-slate-500">{fn.lambda}</code>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
  }, [masterState.dragging]);

  const tabs = [
    { key: "Single Column Operations", label: "Single Column", icon: "📊" },
    { key: "Multi-Column Operations", label: "Multi-Column", icon: "📈" }
  ];

  const subTabs = [
    { key: "Select Column", label: "Select Column", icon: "🎯" },
    { key: "View Record", label: "View Record", icon: "👁️" },
    { key: "Transform Column", label: "Transform", icon: "⚡" },
    { key: "Column Summary", label: "Summary", icon: "📋" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Main Tabs */}
        <div className="mb-6 flex gap-2 rounded-xl bg-white p-2 shadow-lg">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all ${
                masterState.currentMasterTab === tab.key
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => setMasterState(prev => ({ ...prev, currentMasterTab: tab.key }))}
            >
              <span className="text-xl">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          {masterState.currentMasterTab === "Single Column Operations" && (
            <div className="resizable-container flex h-[700px]">
              {/* Left Panel - Data Grid */}
              <div style={{ width: masterState.leftWidth + '%' }} className="flex flex-col p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">Data Preview</h3>
                  {masterState.columnNumber !== null && (
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                      Column {masterState.columnNumber}
                    </span>
                  )}
                </div>
                <div className="ag-theme-alpine flex-1 overflow-hidden rounded-xl border-2 border-slate-100">
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

              {/* Resizer */}
              <div
                className="group relative w-2 cursor-col-resize bg-slate-200 transition-colors hover:bg-purple-400"
                onMouseDown={() => setMasterState(prev => ({ ...prev, dragging: true }))}
              >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </div>
              </div>

              {/* Right Panel - Controls */}
              <div style={{ width: masterState.rightWidth + '%' }} className="flex flex-col overflow-hidden">
                {/* Sub Tabs */}
                <div className="border-b border-slate-200 bg-slate-50 p-2">
                  <div className="grid grid-cols-2 gap-1">
                    {subTabs.map(tab => (
                      <button
                        key={tab.key}
                        className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                          masterState.currentSubTab === tab.key
                            ? "bg-white text-purple-600 shadow-sm"
                            : "text-slate-600 hover:bg-white/50"
                        }`}
                        onClick={() => setMasterState(prev => ({ ...prev, currentSubTab: tab.key }))}
                      >
                        <span>{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {masterState.currentSubTab === "Select Column" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-800">Select Column to Clean</h3>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Search columns..."
                          className="flex-1 rounded-lg border-2 border-slate-200 px-4 py-2 text-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                          value={masterState.searchQuery}
                          onChange={(e) =>
                            setMasterState(prev => ({ ...prev, searchQuery: e.target.value }))
                          }
                        />
                        <button
                          className="rounded-lg border-2 border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition-all hover:bg-slate-50"
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

                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Available Columns</p>
                        <div className="max-h-96 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-slate-300">
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
                                <button
                                  key={columnProfile.columnNumber}
                                  className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
                                    masterState.columnNumber === columnProfile.columnNumber
                                      ? "border-purple-300 bg-purple-50 shadow-md"
                                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                                  }`}
                                  onClick={() =>
                                    setMasterState(prev => ({ ...prev, columnNumber: columnProfile.columnNumber }))
                                  }
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 text-sm font-bold text-purple-700">
                                      {columnProfile.columnNumber}
                                    </span>
                                    <span className="font-medium text-slate-800">{columnProfile.columnName}</span>
                                  </div>
                                </button>
                              ));
                            })()
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {masterState.currentSubTab === "View Record" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-800">Selected Record</h3>
                      
                      {!masterState.selectedRow && (
                        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                          <svg className="mb-4 h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                          </svg>
                          <p className="text-slate-600 font-medium">No record selected</p>
                          <p className="mt-1 text-sm text-slate-500">Click on a row in the table to view details</p>
                        </div>
                      )}

                      {masterState.selectedRow && masterState.recordDetail && (
                        <div className="space-y-4">
                          <div className="rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-4">
                            <p className="text-sm font-medium text-slate-600">Record Number</p>
                            <p className="text-2xl font-bold text-purple-900">{masterState.selectedRow.recordNumber}</p>
                          </div>

                          <div className="space-y-2">
                            {masterState.recordDetail.columnValueDtos?.map((col, i) => {
                              const colName =
                                masterState.columnProfileList?.find(cp => cp.columnNumber === col.columnNumber)?.columnName ??
                                `Column ${col.columnNumber}`;
                              return (
                                <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{colName}</p>
                                  <p className="mt-1 text-slate-800">{col.value}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {masterState.currentSubTab === "Transform Column" && renderTransformUI()}

                  {masterState.currentSubTab === "Column Summary" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-800">Column Summary</h3>
                      
                      {!masterState.columnSummaryState && (
                        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                          <svg className="mb-4 h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <p className="text-slate-600 font-medium">No column data loaded</p>
                          <p className="mt-1 text-sm text-slate-500">Select a column to view its statistics</p>
                        </div>
                      )}

                      {masterState.columnSummaryState && masterState.columnSummaryState.type === "numeric" && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Count</p>
                              <p className="mt-1 text-2xl font-bold text-blue-900">{masterState.columnSummaryState.count}</p>
                            </div>
                            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Mean</p>
                              <p className="mt-1 text-2xl font-bold text-purple-900">{masterState.columnSummaryState.mean.toFixed(3)}</p>
                            </div>
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Median</p>
                              <p className="mt-1 text-2xl font-bold text-green-900">{masterState.columnSummaryState.median.toFixed(3)}</p>
                            </div>
                            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Std Dev</p>
                              <p className="mt-1 text-2xl font-bold text-orange-900">{masterState.columnSummaryState.std.toFixed(3)}</p>
                            </div>
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Min</p>
                              <p className="mt-1 text-2xl font-bold text-red-900">{masterState.columnSummaryState.min.toFixed(3)}</p>
                            </div>
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Max</p>
                              <p className="mt-1 text-2xl font-bold text-indigo-900">{masterState.columnSummaryState.max.toFixed(3)}</p>
                            </div>
                          </div>
                          <ColumnDistributionChart columnData={masterState.columnData} />
                        </>
                      )}

                      {masterState.columnSummaryState && masterState.columnSummaryState.type === "categorical" && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Total Records</p>
                              <p className="mt-1 text-2xl font-bold text-blue-900">{masterState.columnSummaryState.totalRecords}</p>
                            </div>
                            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Unique Values</p>
                              <p className="mt-1 text-2xl font-bold text-purple-900">{masterState.columnSummaryState.uniqueValues}</p>
                            </div>
                          </div>

                          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Most Frequent</p>
                            <p className="mt-2 text-lg font-bold text-green-900">
                              {masterState.columnSummaryState.mostFrequent.join(", ")}
                            </p>
                            <p className="mt-1 text-sm text-green-700">
                              Appears {masterState.columnSummaryState.mostFrequentCount} times
                            </p>
                          </div>

                          <ColumnDistributionChart columnData={masterState.columnData} />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {masterState.currentMasterTab === "Multi-Column Operations" && (
            <div className="flex min-h-[500px] flex-col items-center justify-center p-12 text-center">
              <div className="mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 p-8">
                <svg className="mx-auto h-20 w-20 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-slate-800">Multi-Column Operations Coming Soon</h3>
              <p className="mb-6 max-w-2xl text-slate-600">
                This feature will enable advanced data operations across multiple columns, including:
              </p>
              <div className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border-2 border-slate-200 bg-white p-4 text-left">
                  <div className="mb-2 text-2xl">🔍</div>
                  <h4 className="mb-1 font-semibold text-slate-800">Row Filtering</h4>
                  <p className="text-sm text-slate-600">Filter entire rows based on multi-column logic</p>
                </div>
                <div className="rounded-lg border-2 border-slate-200 bg-white p-4 text-left">
                  <div className="mb-2 text-2xl">📊</div>
                  <h4 className="mb-1 font-semibold text-slate-800">Aggregations</h4>
                  <p className="text-sm text-slate-600">Perform frequency analysis across samples</p>
                </div>
                <div className="rounded-lg border-2 border-slate-200 bg-white p-4 text-left">
                  <div className="mb-2 text-2xl">📋</div>
                  <h4 className="mb-1 font-semibold text-slate-800">Reference Lists</h4>
                  <p className="text-sm text-slate-600">Apply exclusion lists and matching operations</p>
                </div>
                <div className="rounded-lg border-2 border-slate-200 bg-white p-4 text-left">
                  <div className="mb-2 text-2xl">🔄</div>
                  <h4 className="mb-1 font-semibold text-slate-800">Row Context</h4>
                  <p className="text-sm text-slate-600">Detect patterns and thresholds across rows</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}