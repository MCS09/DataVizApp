/**
 * Purpose: Provide a list component that displays and manages cleaning history entries.
 * Params: None.
 * Returns: React components for history display.
 * Steps: 1. Accept history data. 2. Render entries with timestamps. 3. Allow undo actions.
 */
﻿"use client";

/**
 * Purpose: Define props for the TransformationHistory component.
 * Params: None.
 * Returns: Shape containing items and undo callback.
 * Steps: 1. Carry the list of history items. 2. Provide the undo handler. 3. Enable reuse throughout the module.
 */
type TransformationHistoryProps = {
  items: TransformationHistoryItem[];
  onUndo: (id: string) => void;
};

/**
 * Purpose: Describe a single cleaning history entry.
 * Params: None.
 * Returns: Type used in the history component.
 * Steps: 1. Identify entries by id. 2. Store labels for display. 3. Record timestamps for ordering.
 */
export type TransformationHistoryItem = {
  id: string;
  label: string;
  timestamp: number;
};

/**
 * Purpose: Render the list of transformations with undo buttons.
 * Params: Destructured TransformationHistoryProps containing items and onUndo.
 * Returns: JSX.Element representing the history list.
 * Steps: 1. Render a section title. 2. Iterate through items in reverse chronological order. 3. Wire undo buttons to the handler.
 */
export default function TransformationHistory({
  items,
  onUndo,
}: TransformationHistoryProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-base-300 p-4 text-sm text-base-content/60">
        Cleaning steps will appear here once applied.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-base-300 p-4">
      <h3 className="text-sm font-semibold">Applied steps</h3>

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-md bg-base-200 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-base-content/60">
                {new Date(item.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-xs"
              onClick={() => onUndo(item.id)}
            >
              Undo
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

