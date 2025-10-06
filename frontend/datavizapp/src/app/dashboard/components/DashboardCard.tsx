'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants/routes';

type Props = {
  id: string;
  title: string;
  fileName: string;
  timeAgo?: string;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export default function DashboardCard({
  id, title, fileName, timeAgo, onView, onEdit
}: Props) {
  const router = useRouter();

  const handleView = useCallback(() => {
    if (onView) {
      onView(id);
      return;
    }

    if (typeof window !== 'undefined') {
      const datasetId = Number(id);
      if (!Number.isNaN(datasetId)) {
        sessionStorage.setItem('sessionFileData', JSON.stringify({ datasetId }));
      }
    }

    router.push(ROUTES.datasetProfilingPage);
  }, [id, onView, router]);

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(id);
      return;
    }

    router.push(`/visualizations/${id}/edit`);
  }, [id, onEdit, router]);

  return (
    <div className="card rounded-xl p-6 hover:glow transition-all duration-300">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {timeAgo && <span className="text-sm text-gray-400">{timeAgo}</span>}
      </div>

      <p className="text-gray-400 mb-4">{fileName}</p>

      <div className="flex space-x-2">
        <button
          className="rounded px-3 py-1 text-sm text-white transition-colors bg-blue-600 hover:bg-blue-700"
          onClick={handleView}
        >
          View
        </button>
        <button
          className="rounded px-3 py-1 text-sm text-white transition-colors bg-gray-600 hover:bg-gray-700"
          onClick={handleEdit}
        >
          Edit
        </button>
      </div>
    </div>
  );
}
