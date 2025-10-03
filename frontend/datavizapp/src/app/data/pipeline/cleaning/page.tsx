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
  const {setCleaningCode, cleanedColumnData, setCleanedColumnData, setExecuteCleaning} = useCleanColumnDataTester();
  const [columnProfileList, setColumnProfileList] = useState<ColumnProfile[] | null>(null);
  const [selectedRow, setSelectedRow] = useState<{recordNumber: number, value: string} | null>(null);
  const [recordDetail, setRecordDetail] = useState<RecordDto | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<any>(null);
  const [applyFiltered, setApplyFiltered] = useState(false);
  const [paramsState, setParamsState] = useState<Record<string, any>>({});
  const [selectedCleaning, setSelectedCleaning] = useState<string>("");

  const cleaningCodesMap: CleaningCode = {
    "Replace Data": {
      cleaningCode: `
replacement_value = locals().get("replacement_value", "REPLACED")
for record in column_data.get("dataRecords", []):
    if not filtered_record_numbers or record.get("recordNumber") in filtered_record_numbers:
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
func = eval(lambda_expr, {"__builtins__": {k: getattr(builtins, k) for k in ["str", "int", "float", "len"]}})
for record in column_data.get("dataRecords", []):
    if record.get("recordNumber") in filtered_record_numbers:
        try:
            record["value"] = str(func(record["value"]))
        except Exception:
            pass
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
  }[] = useMemo(() => {
    if (!columnData) return [];
    setLoadingKey(null);
    if (cleanedColumnData?.jsonResult){
      console.log(cleanedColumnData?.jsonResult);
      return cleanedColumnData.columnData.dataRecords;
    }
    return columnData.dataRecords.map((record, index) => ({
      ...record,
      newValue: cleanedColumnData?.columnData.dataRecords[index]?.value ?? null
    }));
  }, [columnData, cleanedColumnData]);

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
      setColumnData(e);
      setCleanedColumnData(e ? {columnData: e} : undefined);
    });

  }, [datasetId, columnNumber])

  useEffect(() => {
  if (datasetId !== undefined && selectedRow?.recordNumber !== undefined && selectedRow?.recordNumber !== null) {
      getRecordById(datasetId, selectedRow.recordNumber).then(setRecordDetail);
    } else {
      setRecordDetail(null);
    }
  }, [datasetId, selectedRow]);

  const renderCleaningUI = () => {
    const cfg = cleaningCodesMap[selectedCleaning];
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={applyFiltered}
            onChange={(e) => setApplyFiltered(e.target.checked)}
          />
          <span className="text-sm">{applyFiltered ? "Apply to Filtered Rows" : "Apply to All Rows"}</span>
        </div>
        <select
          value={selectedCleaning}
          onChange={(e) => setSelectedCleaning(e.target.value)}
          className="select select-sm w-fit"
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
                  filtered_record_numbers: applyFiltered ? filteredRecordNumbers : [],
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
            disabled={loadingKey !== null}
          >
            Confirm
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="tabs tabs-box">
      <input type="radio" name="my_tabs_6" className="tab" aria-label="Signle Column Operations" />
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
            <input type="radio" name="my_tabs_2" className="tab" aria-label="View Record" />
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
            <input type="radio" name="my_tabs_2" className="tab" aria-label="Edit Column" />
            <div className="tab-content bg-base-100 border-base-300 p-6 overflow-y-auto">
              {          
                // Clean action
                <div className="flex flex-col gap-2">
                  {renderCleaningUI()}
                  <Button
                    label={"Reset"}
                    action={() => {
                      setCleanedColumnData(columnData ? {columnData: columnData}: undefined);
                    }}
                  />
                </div>
              }
            </div>
          </div>
        </div>
      </div>
      <input type="radio" name="my_tabs_6" className="tab" aria-label="Multi-Column Operations" />
      <div className="tab-content bg-base-100 border-base-300 p-6">

      </div>
    </div>

  );
}