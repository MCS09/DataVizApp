"use client";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const isAuthenticated = useSession().status === "authenticated";

  return (
    <section className="h-screen text-center px-[3vh] mt-[10vh] flex flex-col items-center">
      <div className="mb-[4vh]">
        <span className="ai-badge inline-flex items-center px-[3vh] rounded-full text-sm font-semibold text-purple-700 mb-[3vh] border-2">
          <svg className="w-[2vh] h-[3vh] mr-[1vh]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Next-Gen AI Data Analytics
        </span>
      </div>

      <h1 className="text-[6vh] font-bold mb-[3vh] leading-tight bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 text-transparent bg-clip-text">
        Chat with your data.
        <br />
        Visualize with AI.
      </h1>

      <p className="text-[2.2vh] text-slate-600 max-w-[80vh] mx-auto ">
        Upload, clean, and explore your data with our zero-code AI tool.
      </p>

      <div className="flex justify-center gap-[2vh] my-[3.5vh]">
        {isAuthenticated?
        (<a
          href="/data"
          className="px-[3vh] py-[1.5vh] bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold glow"
        >
          Start Visualize
        </a>) : (<a
          href="/auth/login"
          className="px-[3vh] py-[1.5vh] bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold glow"
        >
          Start by Log In
        </a>)}
      </div>

      <div className="mt-[0.5vh] flex justify-center items-center space-x-[4vh] text-[1.8vh] text-slate-500">
        <div className="flex items-center space-x-[1vh]">
          <div className="w-[1vh] h-[1vh] bg-emerald-500 rounded-full animate-pulse"></div>
          <span>Zero-code AI interface</span>
        </div>
        <div className="flex items-center space-x-[1vh]">
          <div
            className="w-[1vh] h-[1vh] bg-blue-500 rounded-full animate-pulse"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <span>Real-time ML processing</span>
        </div>
        <div className="flex items-center space-x-[1vh]">
          <div
            className="w-[1vh] h-[1vh] bg-purple-500 rounded-full animate-pulse"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <span>GPT-powered insights</span>
        </div>
      </div>
    </section>
  );
}
