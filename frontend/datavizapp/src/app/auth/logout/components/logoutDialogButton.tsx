"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import LogoutButton from "./logoutButton";

export default function LogoutDialogButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-outline" onClick={() => setOpen(true)}>
        Logout
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-base-100 p-6 rounded-lg shadow-lg w-full max-w-xs">
            <h2 className="text-lg font-bold mb-4">Confirm Logout</h2>
            <p className="mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <LogoutButton redirectTo="/auth/login" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}