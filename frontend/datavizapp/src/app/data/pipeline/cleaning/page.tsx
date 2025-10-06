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

const ColumnDistributionChart = ({ columnData }: { columnData: ColumnData | undefined }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [binStep, setBinStep] = useState<number | undefined>(undefined);

  if (!columnData) return null;

  const numericValues = columnData.dataRecords
    .map(r => parseFloat(r.value))
    .filter(v => !isNaN(v));

  let spec: VisualizationSpec;

  if (numericValues.length > 0) {
    // Numeric data - use box plot
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

type CleaningCode = {
  [key: string]: {
    cleaningCode: string;
    renderInput?: () => JSX.Element;
    onSubmit?: (params: Record<string, any>) => void;
  };
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

export default function CleaningPage() {
  const [datasetId, setDatasetId] = useState<number | undefined>();
  const [columnData, setColumnData] = useState<ColumnData | undefined>();
  const [columnNumber, setColumnNumber] = useState<number | null>(null);
  const {setCleaningCode, context, setContext, setExecuteCleaning} = useCleanColumnDataTester();
  const [columnProfileList, setColumnProfileList] = useState<ColumnProfile[] | null>(null);
  const [selectedRow, setSelectedRow] = useState<{recordNumber: number, value: string} | null>(null);
  const [recordDetail, setRecordDetail] = useState<RecordDto | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<any>(null);
  const [applyFiltered, setApplyFiltered] = useState(false);
  const [paramsState, setParamsState] = useState<Record<string, any>>({});
  const [selectedCleaning, setSelectedCleaning] = useState<string>("");
  const [currentMasterTab, setCurrentMasterTab] = useState<string>("Single Column Operations");
  const [currentSubTab, setCurrentSubTab] = useState<string>("View Record");
  const uiFunctionsLocationMap = {
    "Single Column Operations": "single_column_operations",
    "Multi-Column Operations": "multi_column_operations"
  }

  const { sharedState, updateState } = useStore();

  const fetchColumnData = async (datasetId: number, columnNumber: number) => fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnData`, {
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
      setColumnData(e);
      setContext(e ? {columnData: e} : undefined);
    });

  const cleaningCodesMap: CleaningCode = {
    "Replace Data": {
      cleaningCode: `
replacement_value = locals().get("replacement_value", "REPLACED")
for record in column_data.get("dataRecords", []):
    if record.get("recordNumber") in filtered_record_numbers:
        record["value"] = replacement_value
`,
      renderInput: () => (
        <input
          type="text"
          placeholder="Replacement text"
          className="input input-bordered input-sm"
          value={paramsState.replacement_value ?? ""}
          onChange={(e) =>
            setParamsState((prev) => ({ ...prev, replacement_value: e.target.value }))
          }
        />
      ),
      onSubmit: (params: Record<string, any>) => {
        setCleaningCode(cleaningCodesMap["Replace Data"].cleaningCode);
        setExecuteCleaning({
          toExecute: true,
          params: {
            ...params,
            ...paramsState,
          },
        });
      }
    },
    "Apply Function (Lambda)": {
      cleaningCode: 
`
lambda_expr = locals().get("lambda_expr", "")
func = eval(lambda_expr)
for record in column_data.get("dataRecords", []):
    if record.get("recordNumber") in filtered_record_numbers:
      record["value"] = str(func(record["value"]))
`,
      renderInput: () => (
        <input
          type="text"
          placeholder="Lambda expression (e.g., lambda x: x.strip().lower())"
          className="input input-bordered input-sm"
          value={paramsState.lambda_expr ?? ""}
          onChange={(e) =>
            setParamsState((prev) => ({ ...prev, lambda_expr: e.target.value }))
          }
        />
      ),
      onSubmit: (params: Record<string, any>) => {
        setCleaningCode(cleaningCodesMap["Apply Function (Lambda)"].cleaningCode);
        setExecuteCleaning({
          toExecute: true,
          params: {
            ...params,
            ...paramsState,
          },
        });
      }
    }
  }

  const columnDefs = useMemo<ColDef[]>(() => [
    { headerName: "Value", field: "value", filter: 'agTextColumnFilter'},
    { headerName: "New Value", field: "newValue", filter: 'agTextColumnFilter'},
    { headerName: "Record Number", field: "recordNumber", filter: 'agNumberColumnFilter'},
  ], []);

  const rowData: {
      recordNumber: number;
      value: string;
      newValue: string;
  }[] = useMemo(() => {
    if (! columnData) return [];
    setLoadingKey(null);
    if (context){
      return columnData.dataRecords.map((record, index) => ({
        recordNumber: record.recordNumber,
        value: record.value,
        newValue: context.columnData.dataRecords[index].value
      }));
    }
    return columnData.dataRecords.map((record, index) => ({
      recordNumber: record.recordNumber,
      value: record.value,
      newValue: record.value
    }));
  }, [columnData, context]);

  useEffect(() => {
    const stored = sessionStorage.getItem("sessionFileData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setDatasetId(parsed.datasetId);
    }
  }, []);
  
  useEffect(() => {
    if (!datasetId) return;
    getColumnProfile(datasetId).then(setColumnProfileList);
  }, [datasetId]);


  useEffect(() => {
    if (!datasetId || columnNumber === null) {
      return;
    }
    fetchColumnData(datasetId, columnNumber);

  }, [datasetId, columnNumber])

  useEffect(() => {
  if (datasetId !== undefined && selectedRow?.recordNumber !== undefined && selectedRow?.recordNumber !== null) {
      getRecordById(datasetId, selectedRow.recordNumber).then(setRecordDetail);
    } else {
      setRecordDetail(null);
    }
  }, [datasetId, selectedRow]);

  // Save column data to backend
  const saveColumnData = async () => {
    if (!context || !datasetId) return;
    setLoadingKey("saving");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/setColumnData`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(context.columnData),
      });

      fetchColumnData(datasetId, context.columnData.columnNumber);
      // Optionally, show a success notification here
    } catch (err) {
      // Optionally, handle/save error
      // eslint-disable-next-line no-console
      console.error("Failed to save column data", err);
    } finally {
      setLoadingKey(null);
    }
  };

  const renderCleaningUI = () => {
    const cfg = cleaningCodesMap[selectedCleaning];
    // Disable all cleaning operation buttons if loadingKey is set to "saving" or a cleaning operation
    const cleaningDisabled = loadingKey !== null;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={applyFiltered}
            onChange={(e) => setApplyFiltered(e.target.checked)}
            disabled={cleaningDisabled}
          />
          <span className="text-sm">{applyFiltered ? "Apply to Filtered Rows" : "Apply to All Rows"}</span>
        </div>
        <select
          value={selectedCleaning}
          onChange={(e) => setSelectedCleaning(e.target.value)}
          className="select select-sm w-fit"
          disabled={cleaningDisabled}
        >
          <option value="" disabled>
            Select cleaning operation
          </option>
          {Object.keys(cleaningCodesMap).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        {cfg?.renderInput && cfg.renderInput()}
        {selectedCleaning && (
          <button
            className="btn btn-sm mt-2"
            onClick={async () => {
              setLoadingKey(selectedCleaning);

                let filteredRecordNumbers: number[] = [];
                if (applyFiltered && gridApi) {
                  gridApi.forEachNodeAfterFilter((node: any) => {
                    if (node.data?.recordNumber !== undefined) {
                      filteredRecordNumbers.push(node.data.recordNumber);
                    }
                  });
                }

                const params: Record<string, any> = {
                  ...paramsState,
                  filtered_record_numbers: filteredRecordNumbers.length > 0 && applyFiltered
                    ? filteredRecordNumbers
                    : columnData?.dataRecords.map((r) => r.recordNumber) ?? [],
                };
                const cfg = cleaningCodesMap[selectedCleaning];
                if (!cfg) return;

                if (cfg.onSubmit) {
                  cfg.onSubmit(params);
                } else {
                  setCleaningCode(cfg.cleaningCode);
                  setExecuteCleaning({ toExecute: true, params });
                }
            }}
            disabled={cleaningDisabled}
          >
            Apply
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="tabs tabs-box">
      <input
        type="radio"
        name="my_tabs_6"
        className="tab"
        aria-label="Single Column Operations"
        checked={currentMasterTab === "Single Column Operations"}
        onChange={() => setCurrentMasterTab("Single Column Operations")}
      />
      <div className="tab-content bg-base-100 border-base-300 p-6">
        <div className="flex gap-4 mt-4 h-[400px]">
          <div className="w-1/2 h-full flex flex-col">
            <select
              defaultValue=""
              className="select mb-2 w-fit"
              onChange={(e) => setColumnNumber(Number(e.target.value))}
            >
              <option value="" disabled>
                Pick a column to clean
              </option>
              {columnProfileList?.map((columnProfile: ColumnProfile) => (
                <option
                  key={columnProfile.columnNumber}
                  value={columnProfile.columnNumber}
                >
                  {columnProfile.columnName}
                </option>
              ))}
            </select>
            <div className="ag-theme-alpine flex-1">
              <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                singleClickEdit={true}
                rowSelection="single"
                onRowClicked={(event) => setSelectedRow(event.data)}
                onGridReady={(params) => setGridApi(params.api)}
              />
            </div>
          </div>
          <div className="tabs tabs-box">
            <input
              type="radio"
              name="my_tabs_2"
              className="tab"
              aria-label="View Record"
              checked={currentSubTab === "View Record"}
              onChange={() => setCurrentSubTab("View Record")}
            />
            <div className="tab-content bg-base-100 border-base-300 p-6 overflow-y-auto">
              <h3 className="font-semibold mb-2">Selected Record</h3>
              <div className="text-sm">
                {!selectedRow && (
                  <p className="italic text-gray-500">Choose a record to view</p>
                )}
                {selectedRow && recordDetail && (
                  <>
                    <p className="mb-2 text-gray-600">
                      <strong>Record Number:</strong> {selectedRow.recordNumber}
                    </p>
                    <ul>
                      {recordDetail.columnValueDtos?.map((col, i) => {
                        const colName =
                          columnProfileList?.find(cp => cp.columnNumber === col.columnNumber)?.columnName ??
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
              aria-label="Edit Column"
              checked={currentSubTab === "Edit Column"}
              onChange={() => setCurrentSubTab("Edit Column")}
            />
            <div className="tab-content bg-base-100 border-base-300 p-6 overflow-y-auto">
              {
                // Clean action
                <div className="flex flex-col gap-2">
                  {renderCleaningUI()}
                  <Button
                    label={"Reset"}
                    action={() => {
                      setContext(columnData ? {columnData: columnData}: undefined);
                    }}
                    disabled={loadingKey !== null}
                  />
                  <Button
                    label="Save to DB"
                    action={saveColumnData}
                    disabled={columnData === undefined || loadingKey !== null}
                  />
                </div>
              }
            </div>
            <input
              type="radio"
              name="my_tabs_2"
              className="tab"
              aria-label="Column Summary"
              checked={currentSubTab === "Column Summary"}
              onChange={() => setCurrentSubTab("Column Summary")}
            />
            <div className="tab-content bg-base-100 border-base-300 p-6 overflow-y-auto">
              <h3 className="font-semibold mb-2">Column Summary</h3>
              {!columnData && (
                <p className="italic text-gray-500">No column data loaded. Select a column to view its statistics.</p>
              )}
              {columnData && (() => {
                const numericValues = columnData.dataRecords
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

                  return (
                    <>
                      <ul className="text-sm text-gray-700 mb-4">
                        <li><strong>Count:</strong> {numericValues.length}</li>
                        <li><strong>Mean:</strong> {mean.toFixed(3)}</li>
                        <li><strong>Median:</strong> {median.toFixed(3)}</li>
                        <li><strong>Min:</strong> {min.toFixed(3)}</li>
                        <li><strong>Max:</strong> {max.toFixed(3)}</li>
                        <li><strong>Std Dev:</strong> {std.toFixed(3)}</li>
                      </ul>
                      <ColumnDistributionChart columnData={columnData} />
                    </>
                  );
                } else {
                  // Categorical data
                  const counts: Record<string, number> = {};
                  columnData.dataRecords.forEach(r => {
                    counts[r.value] = (counts[r.value] || 0) + 1;
                  });
                  const maxCount = Math.max(...Object.values(counts));
                  const mostFrequent = Object.entries(counts)
                    .filter(([_, c]) => c === maxCount)
                    .map(([v]) => v);

                  return (
                    <>
                      <ul className="text-sm text-gray-700 mb-4">
                        <li><strong>Total Records:</strong> {columnData.dataRecords.length}</li>
                        <li><strong>Unique Values:</strong> {Object.keys(counts).length}</li>
                        <li><strong>Most Frequent:</strong> {mostFrequent.join(", ")} ({maxCount} times)</li>
                      </ul>
                      <ColumnDistributionChart columnData={columnData} />
                    </>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </div>
      <input
        type="radio"
        name="my_tabs_6"
        className="tab"
        aria-label="Multi-Column Operations"
        checked={currentMasterTab === "Multi-Column Operations"}
        onChange={() => setCurrentMasterTab("Multi-Column Operations")}
      />
      <div className="tab-content bg-base-100 border-base-300 p-6">

      </div>
    </div>

  );
}