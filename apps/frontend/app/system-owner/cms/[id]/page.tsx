"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy multi-page CMS — redirect to single landing editor. */
export default function LegacyCmsEditorRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/system-owner/cms");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-gray-400">
      Redirecting to landing editor…
    </div>
  );
}
