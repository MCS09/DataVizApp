// lib/hooks/useDatasetColumnsAnywhere.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import useStore from "@/lib/store";
import { fetchData, safeJsonParse } from "@/lib/api";
import { Column, useColumns } from "@/lib/hooks/useColumns"; // your existing types and setter
import { ColumnProfile } from "../dataset";

// Matches your AIResponse envelope used in chat
type AIResponse<T> = {
  updatedData: T;        // JSON string or object with machine state
  textResponse: string;  // human facing summary
};

// Backend fetcher for profiles
const getColumnProfiles = async (datasetId: number) =>
  await fetchData<ColumnProfile[]>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnsByDatasetId/${datasetId}`,
    { method: "GET", headers: { "Content-Type": "application/json" } }
  );

// Little helper to read datasetId that your upload step saved
const getDatasetIdFromSession = (): number | null => {
  const raw = sessionStorage.getItem("sessionFileData");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed.datasetId === "number" ? parsed.datasetId : null;
  } catch {
    return null;
  }
};

// Convert backend profiles to your UI Column shape
const toColumns = (profiles: ColumnProfile[]): Column[] =>
  profiles.map((p) => ({
    columnHeader: p.columnName,
    columnProfile: p,
  }));

/**
 * useDatasetColumnsAnywhere
 *
 * What it does
 * 1. Reads columns from the global store aiContext if available
 * 2. If missing, tries to parse the latest assistant reply aiResponseContext
 * 3. If still missing, fetches from backend using datasetId found in sessionStorage
 * 4. Keeps a single source of truth in the global store for other pages to reuse
 *
 * When to use
 * Call this from any page or component that needs the current column metadata
 */
export function useDatasetColumns() {
  const { sharedState, updateState } = useStore();       // aiContext and aiResponseContext live here
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const { columns, setColumns } = useColumns([]);        // local state mirror for rendering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Read datasetId once
  useEffect(() => {
    setDatasetId(getDatasetIdFromSession());
  }, []);

  // Try to parse columns from aiContext in the store
  const columnsFromStore = useMemo(() => {
    if (!sharedState.aiContext) return null;
    return safeJsonParse<Column[]>(sharedState.aiContext) || null;
  }, [sharedState.aiContext]);

  // Try to parse columns from the last assistant message
  const columnsFromAIResponse = useMemo(() => {
    if (!sharedState.aiResponseContext) return null;
    const resp = safeJsonParse<AIResponse<string>>(sharedState.aiResponseContext);
    if (!resp?.updatedData) return null;
    // updatedData is a JSON string of Column[]
    return safeJsonParse<Column[]>(resp.updatedData) || null;
  }, [sharedState.aiResponseContext]);

  // Resolve the best available source and fetch if needed
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // 1. Prefer the current store snapshot
      if (columnsFromStore?.length) {
        if (!cancelled) {
          setColumns(columnsFromStore);
          setLoading(false);
        }
        return;
      }

      // 2. Otherwise try the latest AI suggestion
      if (columnsFromAIResponse?.length) {
        if (!cancelled) {
          setColumns(columnsFromAIResponse);
          updateState({ aiContext: JSON.stringify(columnsFromAIResponse) }); // promote to store for others
          setLoading(false);
        }
        return;
      }

      // 3. Finally go to backend by dataset id
      if (!datasetId) {
        if (!cancelled) {
          setError(new Error("Missing datasetId in sessionStorage"));
          setLoading(false);
        }
        return;
      }

      try {
        const profiles = await getColumnProfiles(datasetId);
        const cols = toColumns(profiles);
        if (!cancelled) {
          setColumns(cols);
          updateState({ aiContext: JSON.stringify(cols) }); // cache in store for other pages
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [
    datasetId,
    columnsFromStore,
    columnsFromAIResponse,
    setColumns,
    updateState,
  ]);

  // Optional manual refresh that always goes to backend
  const refresh = async () => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const profiles = await getColumnProfiles(datasetId);
      const cols = toColumns(profiles);
      setColumns(cols);
      updateState({ aiContext: JSON.stringify(cols) });
      setLoading(false);
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  };

  return { columns, loading, error, datasetId, refresh };
}
