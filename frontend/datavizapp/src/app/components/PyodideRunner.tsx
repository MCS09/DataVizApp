'use client';

import { useEffect, useState } from 'react';
import { usePyodide } from '../hooks/usePyodide';

export default function PyodideRunner() {
  const [output, setOutput] = useState<string | null>(null);
  const { pyodide, isReady } = usePyodide();

  useEffect(() => {
    if (!isReady || !pyodide) return;

    const loadPyodideAndRun = async () => {
      const result = await pyodide.runPythonAsync(`
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

      console.log("Pyodide result:", result);
      setOutput(result?.toString());
    };

    loadPyodideAndRun();
  }, [isReady, pyodide]);

  return <div>Python result: {output}</div>;
}