import { WeatherData } from "@/app/api/data/data-selection"
import GoogleDrivePicker from "./components/googleDrivePicker"

export default function DatasetSelectionPage() {
  const weatherData: WeatherData[] = [
    { date: "2023-10-01", temperatureC: 20, summary: "Sunny", temperatureF: 68 },
  ]
  console.log("Weather Data:", weatherData);
  return (
    <div>
      <h1 className="text-2xl font-bold">Import data from Google Drive</h1>
      <GoogleDrivePicker />
    </div>
  )
}