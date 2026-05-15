"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/landing");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
          <span className="text-2xl font-bold">O</span>
        </div>
        <h1 className="text-4xl font-bold mb-4">Outflo</h1>
        <p className="text-[var(--color-text-secondary)]">AI Outreach Automation Platform</p>
      </div>
    </div>
  );
}