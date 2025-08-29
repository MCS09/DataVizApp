"use client";
import { signIn } from "next-auth/react";
import { JSX } from "react";

interface LoginButtonProps {
  provider: "github" | "google";
  redirectTo: string;
  label: string;
  icon: JSX.Element;
}

function LoginButton({ provider, redirectTo, label, icon }: LoginButtonProps) {
  return (
    <button
      className="btn w-full flex items-center justify-center gap-2"
      onClick={() => signIn(provider, { callbackUrl: redirectTo })}
    >
      {icon}
      {label}
    </button>
  );
}

export function GitHubLoginButton({ redirectTo }: { redirectTo: string }) {
  return (
    <LoginButton
      provider="github"
      redirectTo={redirectTo}
      label="Sign in with GitHub"
      icon={
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 
            0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 
            1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 
            0-1.093.39-1.987 1.029-2.687-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 
            1.705.115 2.504.337 1.909-1.296 2.748-1.025 2.748-1.025.546 1.378.202 2.397.1 2.65.64.7 1.028 1.594 
            1.028 2.687 0 3.847-2.337 4.695-4.566 4.944.359.309.678.919.678 1.852 
            0 1.336-.012 2.417-.012 2.747 0 .267.18.577.688.48C19.138 
            20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
      }
    />
  );
}

export function GoogleLoginButton({ redirectTo }: { redirectTo: string }) {
  return (
    <LoginButton
      provider="google"
      redirectTo={redirectTo}
      label="Sign in with Google"
      icon={
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 533.5 544.3"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            d="M533.5 278.4c0-17.4-1.5-34.1-4.3-50.3H272v95.2h147.4c-6.4 
            34.3-25.1 63.3-53.3 82.7v68.7h85.9c50.3-46.3 81.5-114.6 
            81.5-196.3z"
            fill="#4285F4"
          />
          <path
            d="M272 544.3c72.9 0 134-24.2 178.7-65.6l-85.9-68.7c-23.9 
            16-54.3 25.5-92.8 25.5-71 0-131.1-47.9-152.5-112.1H29.6v70.5C74.7 
            486.1 166.7 544.3 272 544.3z"
            fill="#34A853"
          />
          <path
            d="M119.5 323.4c-10.1-29.6-10.1-61.3 0-90.9v-70.5H29.6c-40.6 
            80.3-40.6 176.1 0 256.4l89.9-70.5z"
            fill="#FBBC05"
          />
          <path
            d="M272 107.7c39.6-.6 77.4 13.8 106.4 39.7l79.6-79.6C403.6 
            24.1 340.8-.1 272 0 166.7 0 74.7 58.2 29.6 
            151.9l89.9 70.5C140.9 155.6 201 107.7 272 107.7z"
            fill="#EA4335"
          />
        </svg>
      }
    />
  );
}