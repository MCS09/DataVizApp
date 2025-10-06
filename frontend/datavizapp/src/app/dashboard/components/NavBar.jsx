'use client';
import { APPNAME } from "@/constants/names";
import { useSession } from "next-auth/react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {ROUTES} from '../../../constants/routes';

export default function Navbar() {
  const pathname = usePathname();
  const isAuthenticated = useSession().status === "authenticated";
  const showConsole = pathname === "/";
  const router = useRouter();
  const linkStyle = (path) => pathname === path ? 'text-purple-600 font-semibold' : 'text-slate-700';

  return (
    <div className='w-full flex justify-center'>
      <nav className="fixed top-0 w-full z-50 bg-white bg-opacity-80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <a className="btn btn-ghost text-xl">{APPNAME}</a>
          <div className="space-x-6">
            <Link href={ROUTES.home} className={linkStyle(ROUTES.home)}>Home</Link>
            <Link href={ROUTES.datasetSelectionPage} className={linkStyle(ROUTES.datasetSelectionPage)}>Data Selection</Link>
            <Link href={ROUTES.dashboard} className={linkStyle(ROUTES.dashboard)}>Dashboard</Link>
            <Link href={ROUTES.loginPage} className={linkStyle(ROUTES.loginPage)}>Logout</Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
