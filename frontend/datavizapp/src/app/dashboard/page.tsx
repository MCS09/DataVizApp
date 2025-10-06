import { redirect } from 'next/navigation';

import { auth } from '@/app/auth';
import { ROUTES } from '@/constants/routes';
import type { UserDatasetsDto } from '@/lib/dataset';

import DashboardManager from './components/DashboardManager';

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
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-12 text-center text-4xl font-bold">Your Dashboard</h1>

          <DashboardManager initialVisualizations={visualizations} />
        </div>
      </main>
    </>
  );
}
