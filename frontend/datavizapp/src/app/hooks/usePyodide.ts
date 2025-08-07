import useSWR from "swr";

const fetchPyodide = async () => {
  const pyodideCDN = await eval("import('https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.mjs')");
  const pyodide = await pyodideCDN.loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/",
  });
  await pyodide.loadPackage(["pandas", "numpy"]);
  console.log("loading pyodide");
  return pyodide;
};

export function usePyodide() {
  const { data: pyodide, error, isLoading } = useSWR("pyodide", fetchPyodide, {
    revalidateOnFocus: false,
    dedupingInterval: Infinity,
  });

return { pyodide, error, isLoading, isReady: !!pyodide && !isLoading };
}