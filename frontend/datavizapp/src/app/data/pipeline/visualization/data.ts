export type AIColumnsProfileContext = {
  columnNumber: number;
  columnName: string;
  dataRecords: { // sample only
    recordNumber: number;
    value: string;
  }[];
}[]



export const sampleAIColumnsProfileContext: AIColumnsProfileContext = [
  {
    columnNumber: 0,
    columnName: "firstName",
    dataRecords: [
      { recordNumber: 0, value: "Alice" },
      { recordNumber: 1, value: "Bob" },
      { recordNumber: 2, value: "Charlie" },
      { recordNumber: 3, value: "Diana" },
    ],
  },
  {
    columnNumber: 1,
    columnName: "surname",
    dataRecords: [
      { recordNumber: 0, value: "Smith" },
      { recordNumber: 1, value: "Johnson" },
      { recordNumber: 2, value: "Brown" },
      { recordNumber: 3, value: "Miller" },
    ],
  },
  {
    columnNumber: 2,
    columnName: "age",
    dataRecords: [
      { recordNumber: 0, value: "25" },
      { recordNumber: 1, value: "32" },
      { recordNumber: 2, value: "29" },
      { recordNumber: 3, value: "41" },
    ],
  },
];

// Fake Vega-Lite schema for sampleAIColumnsProfileContext
export const sampleVegaSpec = {
  $schema: "https://vega.github.io/schema/vega-lite/v5.json",
  description: "Bar chart of ages per person",
  data: {
  },
  mark: "bar",
  encoding: {
    x: { field: "firstName", type: "ordinal", title: "First Name" },
    y: { field: "age", type: "quantitative", title: "Age" },
    tooltip: [
      { field: "firstName", type: "ordinal" },
      { field: "surname", type: "ordinal" },
      { field: "age", type: "quantitative" },
    ],
  },
};



// pass to GPT
// FromDbColumnData

// Cannot pass data value direct to GPT
// cannot set parameter of Vega-Lite JSON data = [{a,b}, {c,d}]

// gpt return  VegaLite
// you change the parameter of data to objects.

//  YOU -> GPT
// ColumnProfile[] (Convert from FromDbColumnData).

// GPT -> YOU
// Semi-Completed Vega Lite JSON (Data parameter cannot be used)

/**
 * Replace fields of the GPT generatted Vega Lite JSON
 * 
{
  "data": {
    "values": [
      {"a": "A", "b": 28},
      {"a": "B", "b": 55},
      {"a": "C", "b": 43}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "a", "type": "ordinal"},
    "y": {"field": "b", "type": "quantitative"}
  }
}
 */