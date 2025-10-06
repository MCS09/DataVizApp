export type ColumnProfile = {
    columnName: string;
    columnDescription: string;
    dataType: string;
    columnNumber: number;
    relationship: string;
}

const selectionFields: { [key: string]: string[] } = {
  "Data Type": ["str", "int", "decimal", "text", "datetime", "boolean"],
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
    <div className="w-80 h-full flex flex-col gap-3 p-4 bg-base-100 shadow-xl border border-base-300 rounded-lg transition-shadow duration-200 hover:shadow-2xl">
      <h2 className="text-base font-semibold truncate">{columnHeader}</h2>

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
          readOnly: true,
        },
        {
          fieldName: "Describe relationship with other columns",
          key: "relationship",
          value: column.relationship,
        },
      ].map(({ fieldName, key, value, readOnly }) => (
        <div key={key} className="form-control w-full">
          <label className="label pt-1 pb-1">
            <span className="label-text text-xs">{fieldName}</span>
          </label>
          {selectionFields[fieldName] ? (
            <div className="dropdown dropdown-bottom w-full">
              <div tabIndex={0} role="button" className="input input-bordered input-sm w-full flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-neutral">
                <span>{value || "Select Type"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <ul tabIndex={0} className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-full mt-1 z-50">
                {selectionFields[fieldName].map((option) => (
                  <li key={option}>
                    <a onClick={() => updateColumn({ ...column, [key]: option })}>
                      {option}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <input
              type="text"
              className="input input-bordered input-sm w-full focus:outline-none focus:ring-1 focus:ring-neutral"
              value={value || ""}
              readOnly={readOnly}
              onChange={(e) =>
                !readOnly && updateColumn({ ...column, [key]: e.target.value })
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}