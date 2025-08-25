import { ColumnProfile } from "@/app/data/pipeline/profiling/components/Carousel";

const selectionFields: { [key: string]: string[] } = {
  "Data Type": ["none", "int", "decimal", "text"],
};

export default function Fieldset({
  column,
  updateColumn,
}: {
  column: ColumnProfile;
  updateColumn: (updatedColumn: ColumnProfile) => void;
}) {
  return (
    <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
      <legend className="fieldset-legend">Column Details</legend>
      {[
        { fieldName: "Column Name", key: "columnName", value: column.columnName },
        { fieldName: "Column Description", key: "columnDescription", value: column.columnDescription },
        { fieldName: "Data Type", key: "dataType", value: column.dataType },
        { fieldName: "Column Number", key: "columnNumber", value: column.columnNumber.toString() },
      ].map(({ fieldName, key, value }) => (
        <div key={key} className="mb-2">
          <label className="label">{fieldName}</label>
          {selectionFields[fieldName] ? (
            <select
              className="select select-bordered w-full"
              value={value || ""}
              onChange={(e) =>
                updateColumn({ ...column, [key]: e.target.value })
              }
            >
              {selectionFields[fieldName].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="input"
              value={value || ""}
              onChange={(e) =>
                updateColumn({ ...column, [key]: e.target.value })
              }
            />
          )}
        </div>
      ))}
    </fieldset>
  );
}