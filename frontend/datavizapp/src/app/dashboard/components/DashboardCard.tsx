'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants/routes';

type Props = {
  id: string;
  title: string;
  fileName: string;
  timeAgo?: string;
  tags: string[];
  section: string;
  sectionOptions: string[];
  onRename: (id: string, name: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onSectionChange: (id: string, section: string) => void;
  onMove?: (id: string, direction: 'up' | 'down') => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export default function DashboardCard({
  id,
  title,
  fileName,
  timeAgo,
  tags,
  section,
  sectionOptions,
  onRename,
  onAddTag,
  onRemoveTag,
  onSectionChange,
  onMove,
  canMoveUp = true,
  canMoveDown = true,
  onView,
  onEdit,
}: Props) {
  const router = useRouter();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

  const normalizedSectionOptions = useMemo(() => {
    if (sectionOptions.includes(section)) return sectionOptions;
    return [...sectionOptions, section];
  }, [section, sectionOptions]);

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

  const saveTitle = useCallback(() => {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      setDraftTitle(title);
      setIsEditingTitle(false);
      return;
    }

    if (trimmed !== title) {
      onRename(id, trimmed);
    }
    setIsEditingTitle(false);
  }, [draftTitle, id, onRename, title]);

  const cancelTitleEdit = useCallback(() => {
    setDraftTitle(title);
    setIsEditingTitle(false);
  }, [title]);

  const handleTagSubmit = useCallback(() => {
    const value = tagInput.trim();
    if (!value) return;
    onAddTag(id, value);
    setTagInput('');
  }, [id, onAddTag, tagInput]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm transition hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    saveTitle();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelTitleEdit();
                  }
                }}
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-3 py-1 text-base font-semibold focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={saveTitle}
                  className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelTitleEdit}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-medium text-purple-600 transition hover:text-purple-700"
              >
                Rename
              </button>
            </div>
          )}
          <p className="mt-2 text-sm text-slate-500">{fileName}</p>
        </div>
        {timeAgo && <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{timeAgo}</span>}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tags.length === 0 && <span className="text-sm text-slate-400">No tags yet</span>}
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemoveTag(id, tag)}
              className="text-purple-500 transition hover:text-purple-700"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleTagSubmit();
              }
            }}
            placeholder="Add a tag"
            className="w-full rounded-lg border border-slate-300 px-3 py-1 text-sm focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100"
          />
          <button
            type="button"
            onClick={handleTagSubmit}
            className="rounded-lg bg-purple-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            Add Tag
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Section
          </label>
          <select
            value={section}
            onChange={(event) => onSectionChange(id, event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100"
          >
            {normalizedSectionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 pt-4">
        {onMove && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onMove(id, 'up')}
              disabled={!canMoveUp}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Move Up
            </button>
            <button
              type="button"
              onClick={() => onMove(id, 'down')}
              disabled={!canMoveDown}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Move Down
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            onClick={handleView}
          >
            View
          </button>
          <button
            className="flex-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={handleEdit}
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
