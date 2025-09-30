import json


def _normalize_records(records):
    normalized = []
    for record in records:
        if not isinstance(record, dict):
            continue
        record_number = record.get("recordNumber")
        value = record.get("value")
        normalized.append(
            {
                "recordNumber": record_number,
                "value": "" if value is None else str(value),
            }
        )
    return normalized


def transform(payload_json: str) -> str:
    payload = json.loads(payload_json)
    records = payload.get("dataRecords", [])
    operation = payload.get("operation")
    options = payload.get("options") or {}

    working = _normalize_records(records)

    if operation == "fill_missing":
        fill_value = str(options.get("fillValue", ""))
        for record in working:
            if record["value"].strip() == "":
                record["value"] = fill_value

    elif operation == "replace_value":
        search = options.get("search")
        replace = options.get("replace", "")
        if search is not None:
            search_str = str(search)
            replace_str = str(replace)
            for record in working:
                if record["value"] == search_str:
                    record["value"] = replace_str

    elif operation == "trim_whitespace":
        for record in working:
            record["value"] = record["value"].strip()

    elif operation == "to_lower":
        for record in working:
            record["value"] = record["value"].lower()

    elif operation == "to_upper":
        for record in working:
            record["value"] = record["value"].upper()

    elif operation == "drop_duplicates":
        seen = set()
        deduped = []
        for record in working:
            value = record["value"]
            if value in seen:
                continue
            seen.add(value)
            deduped.append(record)
        working = deduped

    # If the operation is unrecognised, fall back to returning the
    # normalised records without changes.

    return json.dumps({"dataRecords": working})
