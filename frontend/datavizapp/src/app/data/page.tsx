export default function DashboardPage() {
  return (
    <div className="w-full max-w-2xl bg-base-100 rounded-lg shadow p-8 my-8">
      <h1 className="text-3xl font-bold mb-4">Big Content Test</h1>
      <p className="mb-6">Scroll down to see the footer at the bottom of the page.</p>
      <div style={{ height: "2000px", background: "#eee", marginBottom: "2rem" }}>
        <p className="text-center pt-8">This is a very tall content area (2000px height).</p>
      </div>
      <p>End of content.</p>
    </div>
  );
}