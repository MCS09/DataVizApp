'use client';

import { useRouter } from 'next/navigation';

type Props = {
  id: string;
  title: string;
  fileName: string;
  timeAgo: string;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export default function DashboardCard({
  id, title, fileName, timeAgo, onView, onEdit
}: Props) {
  const router = useRouter();

  return (
    <div className="card rounded-xl p-6 hover:glow transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-sm text-gray-400">{timeAgo}</span>
      </div>

      <p className="text-gray-400 mb-4">{fileName}</p>

      <div className="flex space-x-2">
        <button
          className="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          onClick={() => (onView ? onView(id) : router.push(`/visualizations/${id}`))}
        >
          View
        </button>
        <button
          className="px-3 py-1 rounded text-sm bg-gray-600 hover:bg-gray-700 text-white transition-colors"
          onClick={() => (onEdit ? onEdit(id) : router.push(`/visualizations/${id}/edit`))}
        >
          Edit
        </button>
      </div>
    </div>
  );
}
