"use client";

import { AppLayout } from "@/app/components/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}