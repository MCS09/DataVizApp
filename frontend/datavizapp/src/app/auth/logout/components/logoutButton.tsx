"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton(redirect: {redirectTo: string}) {
  return (
    <button
      className="btn"
      onClick={() => signOut(redirect)}
    >
      Logout
    </button>
  );
}