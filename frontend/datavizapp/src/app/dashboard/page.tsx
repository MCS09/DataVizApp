import NavBar from './components/NavBar';

import DashboardCard from './components/DashboardCard';

// When wiring Auth.js later:
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/app/api/auth/[...nextauth]/route';
// import { redirect } from 'next/navigation';

export type Visualization = {
  id: string;
  title: string;
  fileName: string;
  updatedAt: string; // ISO for sorting later
  timeAgo: string;   // preformatted for now
};

export default async function DashboardPage() {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect('/login');

  // Replace with your API call later (no-store to avoid caching):
  // const visualizations: Visualization[] = await fetch(
  //   `${process.env.NEXT_PUBLIC_API_URL}/visualizations`,
  //   { cache: 'no-store', headers: { Authorization: `Bearer ${session?.accessToken}` } }
  // ).then(r => r.json());

  const visualizations: Visualization[] = [
    { id: '1', title: 'Sales Data Analysis', fileName: 'sales_data_2024.csv', updatedAt: '2025-08-10T10:00:00Z', timeAgo: '2 hours ago' },
    { id: '2', title: 'Customer Demographics', fileName: 'customer_data.csv', updatedAt: '2025-08-09T08:00:00Z', timeAgo: '1 day ago' },
    { id: '3', title: 'Marketing Campaign Results', fileName: 'campaign_metrics.csv', updatedAt: '2025-08-07T12:00:00Z', timeAgo: '3 days ago' },
    { id: '4', title: 'Website Traffic Analysis', fileName: 'traffic_data.csv', updatedAt: '2025-08-05T09:00:00Z', timeAgo: '5 days ago' },
  ];

  return (
    <>
      <NavBar />
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-12">Your Dashboard</h1>

          {/* Cards grid */}
          <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {visualizations.map(v => (
              <DashboardCard
                key={v.id}
                id={v.id}
                title={v.title}
                fileName={v.fileName}
                timeAgo={v.timeAgo}
              />
            ))}

            {/* New visualization button */}
            <a
            href="/data"
            className="flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 hover:border-purple-500 hover:bg-purple-50 transition p-6 text-center"
            >
            <div>
                <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full bg-purple-100 text-purple-600">
                +
                </div>
                <p className="font-medium text-slate-700">Create New Visualization</p>
            </div>
            </a>
          </section>

          {/* <ComingSoonFeatures /> */}
        </div>
      </main>
    </>
  );
}
