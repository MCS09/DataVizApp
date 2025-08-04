declare module 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.mjs' {
  export function loadPyodide(options: {
    indexURL: string;
  }): Promise<{
    runPythonAsync: (code: string) => Promise<any>;
    runPython: (code: string) => any;
  }>;
}