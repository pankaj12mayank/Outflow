"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-8xl font-bold text-white/10 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 text-sm mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/app/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
