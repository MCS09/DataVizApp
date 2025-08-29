import { ColumnProfile } from "@/app/data/pipeline/profiling/components/CarouselItem";

const selectionFields: { [key: string]: string[] } = {
  "Data Type": ["none", "int", "decimal", "text"],
};

export default function Fieldset({
  columnHeader,
  column,
  updateColumn,
}: {
  columnHeader: string;
  column: ColumnProfile;
  updateColumn: (updatedColumn: ColumnProfile) => void;
}) {
  return (
    <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
      <legend className="fieldset-legend">{columnHeader}</legend>
      {[
        {
          fieldName: "Column Name",
          key: "columnName",
          value: column.columnName,
        },
        {
          fieldName: "Column Description",
          key: "columnDescription",
          value: column.columnDescription,
        },
        { fieldName: "Data Type", key: "dataType", value: column.dataType },
        {
          fieldName: "Column Number",
          key: "columnNumber",
          value: column.columnNumber.toString(),
        },
        {
          fieldName: "Describe relationship with other columns",
          key: "relationship",
          value: column.relationship,
        },
      ].map(({ fieldName, key, value }) => (
        <div key={key} className="mb-2">
          <label className="label">{fieldName}</label>
          {selectionFields[fieldName] ? (
            (() => {
              const options =
                value && !selectionFields[fieldName].includes(value)
                  ? [...selectionFields[fieldName], value]
                  : selectionFields[fieldName];
              return (
                <select
                  className="select select-bordered w-full"
                  value={value || ""}
                  onChange={(e) =>
                    updateColumn({ ...column, [key]: e.target.value })
                  }
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              );
            })()
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
