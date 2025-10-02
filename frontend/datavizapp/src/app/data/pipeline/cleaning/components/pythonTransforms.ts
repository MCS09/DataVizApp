/**
 * Purpose: Supply cleaning-related Python code and metadata helpers.
 * Params: None.
 * Returns: Exported loader function and type aliases.
 * Steps: 1. Fetch the Python transform script. 2. Normalise whitespace for execution. 3. Declare supported operations and options.
 */

/**
 * Purpose: Retrieve the Python cleaning transforms from the public folder.
 * Params: None.
 * Returns: Promise<string> containing the script source.
 * Steps: 1. Fetch the script file. 2. Normalise BOM and line endings. 3. Trim leading whitespace before returning.
 */
export async function loadCleaningTransformCode(): Promise<string> {
  const res = await fetch("/python/cleaningfunction.py");
  if (!res.ok) {
    throw new Error(
      `Failed to load cleaningfunction.py (status: ${res.status})`
    );
  }

  let code = await res.text();

  // Remove BOM if present
  code = code.replace(/^\uFEFF/, "");

  // Convert Windows CRLF to LF
  code = code.replace(/\r\n/g, "\n");

  // Convert any stray \r to \n
  code = code.replace(/\r/g, "\n");

  // Trim leading blank lines/spaces
  code = code.replace(/^[\s\n]+/, "");

  return code;
}

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