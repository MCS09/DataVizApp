"use client";

type TransformationHistoryProps = {
  items: TransformationHistoryItem[];
  onUndo: (id: string) => void;
};

export type TransformationHistoryItem = {
  id: string;
  label: string;
  timestamp: number;
};

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

