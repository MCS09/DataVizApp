import numpy as np
import pandas as pd
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        data = req.get_json()
        values = data.get("values", [])
        method = data.get("method", "mean")

        if not isinstance(values, list):
            return func.HttpResponse("Invalid input: 'values' must be a list.", status_code=400)

        func_np = getattr(np, method, None)
        if not callable(func_np):
            return func.HttpResponse(f"Unsupported NumPy method: {method}", status_code=400)

        result = func_np(values)
        return func.HttpResponse(str(result), mimetype="text/plain")

    except Exception as e:
        return func.HttpResponse(f"Error: {str(e)}", status_code=500)