import azure.functions as func
import logging
import pandas as pd
import numpy as np
import json

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)
    
@app.route(route="execute_lib_function")
def execute_lib_function(req: func.HttpRequest) -> func.HttpResponse:
    """
    Dynamically execute a function from numpy or pandas.
    Expecting JSON body with: lib (numpy/pandas), func_name, args (list), kwargs (dict)
    """
    logging.info('execute_lib_function processed a request.')

    try:
        req_body = req.get_json()
        lib = req_body.get('lib')
        func_name = req_body.get('func_name')
        args = req_body.get('args', [])
        kwargs = req_body.get('kwargs', {})
    except Exception as e:
        logging.error(f"Error parsing request: {e}")
        return func.HttpResponse(
            "Invalid request format. Expecting JSON with 'lib', 'func_name', 'args', and optional 'kwargs'.",
            status_code=400
        )

    if not lib or not func_name:
        return func.HttpResponse(
            "Missing required parameters: 'lib' and/or 'func_name'.",
            status_code=400
        )

    # Determine which library to use
    lib_module = {"numpy": np, "pandas": pd}.get(lib.lower())
    if lib_module is None:
        return func.HttpResponse(
            f"Library '{lib}' is not supported. Use 'numpy' or 'pandas'.",
            status_code=400
        )

    # Lookup and call function
    try:
        target_func = getattr(lib_module, func_name, None)
        if target_func is None or not callable(target_func):
            return func.HttpResponse(
                f"Function '{func_name}' not found in {lib}.",
                status_code=404
            )

        result = target_func(*args, **kwargs)

        # Serialize result to JSON
        if hasattr(result, 'to_json'):
            serialized = result.to_json()
            mimetype = "application/json"
        elif hasattr(result, 'tolist'):
            serialized = json.dumps({"result": result.tolist()})
            mimetype = "application/json"
        else:
            serialized = json.dumps({"result": str(result)})
            mimetype = "application/json"

        return func.HttpResponse(serialized, mimetype=mimetype, status_code=200)

    except Exception as e:
        logging.error(f"Error executing function '{func_name}' from {lib}: {e}")
        return func.HttpResponse(
            f"Error executing function '{func_name}' from {lib}: {str(e)}",
            status_code=500
        )