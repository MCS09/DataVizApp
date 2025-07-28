// import { getWeatherForecast } from "@/app/api/data/data-selection"
export default async function DatasetSelectionPage() {
  // const weatherData = await getWeatherForecast();
  const weatherData = [
    { date: "2023-10-01", temperature: 20, condition: "Sunny" }
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