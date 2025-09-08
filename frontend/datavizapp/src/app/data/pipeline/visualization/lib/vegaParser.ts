import type { AIColumnsProfileContext } from "../data";

const rowsFromColumns = (data: AIColumnsProfileContext) => {
  const rows: Record<string, string | number>[] = [];
  for (const col of data) {
    for (const rec of col.dataRecords) {
      if (!rows[rec.recordNumber]) rows[rec.recordNumber] = {};
      const n = Number(rec.value);
      rows[rec.recordNumber][col.columnName] = isNaN(n) ? rec.value : n;
    }
  }
  return rows;
};



export const vegaSpecConverter = (data: AIColumnsProfileContext) => {
  const values = rowsFromColumns(data);
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "Chart from AIColumnsProfileContext",
    title: "Sample Chart",
    data: { values }, // <-- array of plain objects
    autosize: { type: "fit", contains: "padding" }, // key for responsiveness
    width: "container", // adapt to parent div
    height: "container", // Vega uses parent's height
    mark: "bar",
    encoding: {
      x: { field: "firstName", type: "ordinal", title: "First Name" },
      y: { field: "age", type: "quantitative", title: "Age" },
      tooltip: [
        { field: "firstName" },
        { field: "surname" },
        { field: "age", type: "quantitative" },
      ],
    },
  };
};
