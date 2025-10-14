import { redirect } from 'next/navigation';

import { auth } from '@/app/auth';
import { ROUTES } from '@/constants/routes';
import type { UserDatasetsDto } from '@/lib/dataset';

import DashboardCard from './components/DashboardCard';

type Visualization = {
  id: string;
  title: string;
  fileName: string;
  timeAgo?: string;
};

async function fetchLatestVisualizations(userEmail: string): Promise<Visualization[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    return [];
  }

  try {
    const response = await fetch(
      `${backendUrl}/api/Dataset/userDatasets/${encodeURIComponent(userEmail)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      },
    );

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      return [];
    }

    const data: UserDatasetsDto = await response.json();
    const latestFive = [...data.datasets]
      .sort((a, b) => b.datasetId - a.datasetId)
      .slice(0, 5);

    return latestFive.map((dataset, index) => ({
      id: dataset.datasetId.toString(),
      title: dataset.datasetName || 'Untitled Dataset',
      fileName: `ID: ${dataset.datasetId}`,
      timeAgo: index === 0 ? 'Latest' : undefined,
    }));
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect(ROUTES.loginPage);
  }

  const visualizations = await fetchLatestVisualizations(email);

  return (
    <>
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-12">Your Dashboard</h1>

          {visualizations.length === 0 && (
            <div className="mb-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
              No datasets found yet. Upload a dataset from the Data Selection page to see it here.
            </div>
          )}

          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
            {visualizations.map((v) => (
              <DashboardCard
                key={v.id}
                id={v.id}
                title={v.title}
                fileName={v.fileName}
                timeAgo={v.timeAgo}
              />
            ))}

            <a
              href="/data"
              className="flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-purple-500 hover:bg-purple-50"
            >
              <div>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  +
                </div>
                <p className="font-medium text-slate-700">Create New Visualization</p>
              </div>
            </a>
          </section>
        </div>
      </main>
    </>
  );
}
