"use client";
import { APPNAME } from "@/constants/names";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import LogoutDialogButton from "../auth/logout/components/logoutDialogButton";
import Button from "./input/Button";

export default function NavBar() {
  const pathname = usePathname();
  const isAuthenticated = useSession().status === "authenticated";
  const showConsole = pathname === "/";
  const router = useRouter();

  return (
    <div className="navbar bg-base-100 shadow-sm border-b border-base-300">
      <a className="btn btn-ghost text-xl">{APPNAME}</a>
      <div className="flex-1"></div>
      <div className="flex gap-2">
        {isAuthenticated && <LogoutDialogButton />}
        {/* {showConsole && <Button label="Open Console" action={() => {router.push("/data")}} />} */}
      </div>
    </div>
  );
}
