'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardCard from './DashboardCard';

const DEFAULT_SECTION = 'Ungrouped';

type Visualization = {
  id: string;
  title: string;
  fileName: string;
  timeAgo?: string;
};

type ManagedVisualization = Visualization & {
  tags: string[];
  section: string;
  order: number;
};

type Props = {
  initialVisualizations: Visualization[];
};

export default function DashboardManager({ initialVisualizations }: Props) {
  const [sections, setSections] = useState<string[]>(() => [DEFAULT_SECTION]);
  const [visualizations, setVisualizations] = useState<ManagedVisualization[]>(() =>
    initialVisualizations.map((viz, index) => ({
      ...viz,
      tags: [],
      section: DEFAULT_SECTION,
      order: index,
    })),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [newSectionName, setNewSectionName] = useState('');

  const normalizeVisualizations = useCallback(
    (items: ManagedVisualization[]): ManagedVisualization[] => {
      const validSections = new Set(sections);

      const clones = items.map((item) => ({
        ...item,
        section: validSections.has(item.section) ? item.section : DEFAULT_SECTION,
      }));

      const grouped = new Map<string, ManagedVisualization[]>();
      clones.forEach((item) => {
        const group = grouped.get(item.section);
        if (group) {
          group.push(item);
        } else {
          grouped.set(item.section, [item]);
        }
      });

      grouped.forEach((list) => {
        list
          .sort((a, b) => a.order - b.order)
          .forEach((item, index) => {
            item.order = index;
          });
      });

      return clones;
    },
    [sections],
  );

  useEffect(() => {
    setVisualizations((prev) => {
      const existing = new Map(prev.map((item) => [item.id, item]));

      const merged = initialVisualizations.map((viz, index) => {
        const current = existing.get(viz.id);
        if (current) {
          return {
            ...current,
            title: viz.title,
            fileName: viz.fileName,
          };
        }

        return {
          ...viz,
          tags: [],
          section: DEFAULT_SECTION,
          order: index,
        } satisfies ManagedVisualization;
      });

      return normalizeVisualizations(merged);
    });
  }, [initialVisualizations, normalizeVisualizations]);

  const handleRename = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setVisualizations((prev) =>
      normalizeVisualizations(
        prev.map((item) => (item.id === id ? { ...item, title: trimmed } : item)),
      ),
    );
  }, [normalizeVisualizations]);

  const handleAddTag = useCallback((id: string, tag: string) => {
    const value = tag.trim();
    if (!value) return;

    setVisualizations((prev) =>
      normalizeVisualizations(
        prev.map((item) =>
          item.id === id && !item.tags.includes(value)
            ? { ...item, tags: [...item.tags, value] }
            : item,
        ),
      ),
    );
  }, [normalizeVisualizations]);

  const handleRemoveTag = useCallback((id: string, tag: string) => {
    setVisualizations((prev) =>
      normalizeVisualizations(
        prev.map((item) =>
          item.id === id
            ? { ...item, tags: item.tags.filter((existing) => existing !== tag) }
            : item,
        ),
      ),
    );
  }, [normalizeVisualizations]);

  const handleSectionChange = useCallback(
    (id: string, nextSection: string) => {
      const targetSection = sections.includes(nextSection) ? nextSection : DEFAULT_SECTION;

      setVisualizations((prev) => {
        const clones = prev.map((item) => ({ ...item }));
        const target = clones.find((item) => item.id === id);
        if (!target) return prev;

        target.section = targetSection;
        target.order = Number.MAX_SAFE_INTEGER;

        return normalizeVisualizations(clones);
      });
    },
    [normalizeVisualizations, sections],
  );

  const handleMove = useCallback(
    (id: string, direction: 'up' | 'down') => {
      setVisualizations((prev) => {
        const clones = prev.map((item) => ({ ...item }));
        const target = clones.find((item) => item.id === id);
        if (!target) return prev;

        const sectionItems = clones
          .filter((item) => item.section === target.section)
          .sort((a, b) => a.order - b.order);

        const index = sectionItems.findIndex((item) => item.id === id);
        if (index === -1) return prev;

        const siblingIndex = direction === 'up' ? index - 1 : index + 1;
        if (siblingIndex < 0 || siblingIndex >= sectionItems.length) return prev;

        const sibling = sectionItems[siblingIndex];
        const previousOrder = target.order;
        target.order = sibling.order;
        sibling.order = previousOrder;

        return normalizeVisualizations(clones);
      });
    },
    [normalizeVisualizations],
  );

  const handleAddSection = useCallback(() => {
    const value = newSectionName.trim();
    if (!value) return;
    if (sections.includes(value)) {
      setNewSectionName('');
      return;
    }

    setSections((prev) => [...prev, value]);
    setNewSectionName('');
  }, [newSectionName, sections]);

  const tagOptions = useMemo(() => {
    const unique = new Set<string>();
    visualizations.forEach((item) => {
      item.tags.forEach((tag) => unique.add(tag));
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [visualizations]);

  const toggleTagFilter = useCallback((tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((existing) => existing !== tag) : [...prev, tag],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setActiveTags([]);
  }, []);

  const filteredVisualizations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return visualizations.filter((item) => {
      const matchesSearch =
        term.length === 0 ||
        [item.title, item.fileName, ...item.tags]
          .join(' ')
          .toLowerCase()
          .includes(term);

      if (!matchesSearch) return false;
      if (activeTags.length === 0) return true;

      return activeTags.every((tag) => item.tags.includes(tag));
    });
  }, [activeTags, searchTerm, visualizations]);

  const sectionsWithItems = useMemo(() => {
    const map = new Map<string, ManagedVisualization[]>();
    sections.forEach((section) => {
      map.set(section, []);
    });

    filteredVisualizations.forEach((item) => {
      const sectionName = map.has(item.section) ? item.section : DEFAULT_SECTION;
      const list = map.get(sectionName);
      if (list) {
        list.push(item);
      } else {
        map.set(sectionName, [item]);
      }
    });

    return Array.from(map.entries())
      .map(([name, items]) => ({
        name,
        items: [...items].sort((a, b) => a.order - b.order),
      }))
      .filter(({ items }) => items.length > 0);
  }, [filteredVisualizations, sections]);

  const hasVisualizations = visualizations.length > 0;
  const noMatches = hasVisualizations && sectionsWithItems.length === 0;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2 md:max-w-lg md:flex-1">
            <label htmlFor="dashboard-search" className="text-sm font-medium text-slate-700">
              Search visualizations
            </label>
            <input
              id="dashboard-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, file or tag"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100"
            />
          </div>

          <div className="flex items-end gap-3 md:w-auto">
            <div className="flex flex-col gap-2">
              <label htmlFor="dashboard-section" className="text-sm font-medium text-slate-700">
                Create new section
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="dashboard-section"
                  type="text"
                  value={newSectionName}
                  onChange={(event) => setNewSectionName(event.target.value)}
                  placeholder="E.g. Sales, Marketing"
                  className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100"
                />
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                >
                  Add
                </button>
              </div>
            </div>
            {(searchTerm.length > 0 || activeTags.length > 0) && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-fit rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {tagOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Filter by tags:</span>
            {tagOptions.map((tag) => {
              const isActive = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTagFilter(tag)}
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-purple-300 hover:text-purple-600'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {!hasVisualizations && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
          No datasets found yet. Upload a dataset from the Data Selection page to see it here.
        </div>
      )}

      {noMatches && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
          No visualizations match the current filters. Try adjusting your search or tag filters.
        </div>
      )}

      <div className="space-y-12">
        {sectionsWithItems.map(({ name, items }) => (
          <section key={name} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-900">{name}</h2>
              <span className="text-sm text-slate-500">{items.length} visualizations</span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item, index) => (
                <DashboardCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  fileName={item.fileName}
                  timeAgo={item.timeAgo}
                  tags={item.tags}
                  section={item.section}
                  sectionOptions={sections}
                  onRename={handleRename}
                  onAddTag={handleAddTag}
                  onRemoveTag={handleRemoveTag}
                  onSectionChange={handleSectionChange}
                  onMove={handleMove}
                  canMoveUp={index > 0}
                  canMoveDown={index < items.length - 1}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flex justify-center">
        <a
          href="/data"
          className="flex w-full max-w-xl items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-purple-500 hover:bg-purple-50"
        >
          <div>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              +
            </div>
            <p className="font-medium text-slate-700">Create New Visualization</p>
          </div>
        </a>
      </div>
    </div>
  );
}
