"use client";

import { SystemOwnerAuthProvider } from "@/app/hooks/useSystemOwnerAuth";

export default function SystemOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SystemOwnerAuthProvider>
      {children}
    </SystemOwnerAuthProvider>
  );
}