/**
 * pythonTransforms.ts
 *
 * Instead of embedding Python code in a string (which caused indentation issues),
 * we fetch the Python file from `/public/python/cleaning_transforms.py`.
 */

/**
 * Loads the cleaning transform Python code as plain text.
 * @returns The Python source code from cleaningfunction.py
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