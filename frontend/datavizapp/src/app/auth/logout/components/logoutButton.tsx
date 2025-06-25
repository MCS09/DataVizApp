"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton(redirect: {redirectTo: string}) {
  return (
    <button
      className="btn btn-secondary"
      onClick={() => signOut(redirect)}
    >
      Logout
    </button>
  );
}