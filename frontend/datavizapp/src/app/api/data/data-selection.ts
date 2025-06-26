import { BACKEND_URL } from "@/constants/urls"
import fetchData from "../fetchData";

export async function getWeatherForecast(): Promise<WeatherData[]> {
  return await fetchData(BACKEND_URL + '/weatherforecast');
}

export type WeatherData = {
    "date": string,
    "temperatureC": number,
    "summary": "string",
    "temperatureF": number
}

