// import { getWeatherForecast } from "@/app/api/data/data-selection"
import { WeatherData } from "@/app/api/data/data-selection"
export default async function DatasetSelectionPage() {
  // const weatherData = await getWeatherForecast();
  const weatherData: WeatherData[] = [
    { date: "2023-10-01", temperatureC: 20, summary: "Sunny", temperatureF: 68 },
  ]
  return (
    <div>
      <h1 className="text-2xl font-bold">Weather Forecast</h1>
      <ul>
        {weatherData.map((item, idx) => (
          <li key={idx}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  )
}