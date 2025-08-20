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