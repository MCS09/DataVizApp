import RedirectButton from "../navigation/components/redirectButton";

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col" data-theme="lofi">
      <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold">Welcome to the Data Console</h1>
          <p className="mt-4">Please select a dataset to begin</p>
          <RedirectButton to={"/data/data-selection"} label="Select/Upload a dataset"/>
    </div>
    </div>
  )
}