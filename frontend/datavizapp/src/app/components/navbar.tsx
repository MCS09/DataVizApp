import { APPNAME } from "@/constants/names";
import LogoutDialogButton from "../auth/logout/components/logoutDialogButton";
import { auth } from "../auth";

export default async function NavBar() {
  const session = await auth();

  return (
    <div className="navbar bg-base-100 shadow-sm">
      <a className="btn btn-ghost text-xl">{APPNAME}</a>
      <div className="flex-1"></div>
      {session && <LogoutDialogButton />}
    </div>
  );
}