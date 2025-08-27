export async function fetchData<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    throw new Error(`Failed to fetch data: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T;
  return data;
}

export async function postData<TRequest = unknown>(
  url: string,
  body: TRequest,
  options: RequestInit = {}
): Promise<boolean> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
    ...options,
  });

  if (!res.ok) {
    return false;
  }

  return true;
}

export function safeJsonParse<T>(input: string, fallback?: T): T|undefined {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}