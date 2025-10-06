'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { APPNAME } from '@/constants/names';
import { ROUTES } from '@/constants/routes';

import LogoutDialogButton from '../auth/logout/components/logoutDialogButton';

export default function Navbar() {
  const pathname = usePathname();
  const isAuthenticated = useSession().status === 'authenticated';

  const linkStyle = (path: string) =>
    pathname === path
      ? 'text-purple-600 font-semibold'
      : 'text-slate-700 hover:text-purple-500';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
        <Link href={ROUTES.home} className="text-xl font-semibold text-slate-900">
          {APPNAME}
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href={ROUTES.home} className={linkStyle(ROUTES.home)}>
            Home
          </Link>
          <Link
            href={ROUTES.datasetSelectionPage}
            className={linkStyle(ROUTES.datasetSelectionPage)}
          >
            Data Selection
          </Link>
          <Link href={ROUTES.dashboard} className={linkStyle(ROUTES.dashboard)}>
            Dashboard
          </Link>
          {isAuthenticated && <LogoutDialogButton />}
        </nav>
      </div>
    </header>
  );
}
