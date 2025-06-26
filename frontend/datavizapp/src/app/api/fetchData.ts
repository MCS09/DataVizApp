import { WeatherData } from "./data/data-selection";

export default async function fetchData(url: string, options = {}): Promise<WeatherData[]> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}