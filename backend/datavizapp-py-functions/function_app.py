import azure.functions as func
import logging
import numpy as np
import pandas as pd

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@app.route(route="execute_numpy_function")
def execute_numpy_function(func_name: str, args=None, kwargs=None):
    """
    Dynamically execute a function from numpy.
    """
    func = getattr(np, func_name, None)
    if func is None:
        raise AttributeError(f"Function '{func_name}' not found in  numpy.")

    args = args or []
    kwargs = kwargs or {}
    
    return func(*args, **kwargs)

@app.route(route="execute_pandas_function")
def execute_pandas_function(func_name: str, args=None, kwargs=None):
    """
    Dynamically execute a function from pandas.
    """
    func = getattr(pd, func_name, None)
    if func is None:
        raise AttributeError(f"Function '{func_name}' not found in pandas.")

    args = args or []
    kwargs = kwargs or {}
    
    return func(*args, **kwargs)