'use client';

import { useEffect, useState } from 'react';

export default function PyodideRunner() {
  const [output, setOutput] = useState<string | null>(null);

  useEffect(() => {
  const loadPyodideAndRun = async () => {
    const pyodideCDN = await eval("import('https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.mjs')");
    const pyodide = await pyodideCDN.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/',
    });

    await pyodide.loadPackage(['pandas', 'numpy']);

    const result = await pyodide.runPythonAsync(`
        import pandas as pd
        import numpy as np
        import time

        # Generate large synthetic dataset
        df = pd.DataFrame({
            "category": np.random.choice(["A", "B", "C", "D"], size=100000),
            "value": np.random.rand(100000) * 100
        })

        start = time.time()
        result = df.groupby("category")["value"].mean()
        elapsed = time.time() - start

        result_str = result.to_string()
        f"Aggregated means:\\n{result_str}\\nExecution time: {elapsed:.4f} seconds"
    `);
    
    console.log("Pyodide result:", result); // ✅ log to verify
    setOutput(result?.toString());
  };

  loadPyodideAndRun();
}, []);

  return <div>Python result: {output}</div>;
}