export const CLEANING_TRANSFORM_CODE = `
import json
import pandas as pd

payload = json.loads(embedded_input)
records = payload.get("dataRecords", [])
operation = payload.get("operation")
options = payload.get("options", {})

df = pd.DataFrame(records)
if df.empty:
    df = pd.DataFrame(columns=["recordNumber", "value"])

if "value" not in df.columns:
    df["value"] = ""

df["recordNumber"] = pd.to_numeric(df["recordNumber"], errors="coerce").fillna(0).astype(int)
df = df.sort_values("recordNumber")

if operation == "fill_missing":
    fill_value = str(options.get("fillValue", ""))
    df["value"] = df["value"].replace({None: fill_value})
    df["value"] = df["value"].apply(lambda v: fill_value if str(v).strip() in ["", "nan", "NaN", "None"] else v)
elif operation == "trim_whitespace":
    df["value"] = df["value"].astype(str).str.strip()
elif operation == "drop_duplicates":
    df = df.drop_duplicates(subset=["value"], keep="first").sort_values("recordNumber")
elif operation == "to_lower":
    df["value"] = df["value"].astype(str).str.lower()
elif operation == "to_upper":
    df["value"] = df["value"].astype(str).str.upper()
elif operation == "replace_value":
    search = str(options.get("search", ""))
    replace = str(options.get("replace", ""))
    df["value"] = df["value"].astype(str).str.replace(search, replace, regex=False)

result = {
    "dataRecords": df.to_dict(orient="records")
}

output_json = json.dumps(result)
`;

export type CleaningOperation =
  | "fill_missing"
  | "trim_whitespace"
  | "drop_duplicates"
  | "to_lower"
  | "to_upper"
  | "replace_value";

export type CleaningOptions = {
  fillValue?: string;
  search?: string;
  replace?: string;
};

