import { redirect } from "next/navigation";

/** Middleware also sends `/` → `/landing`; this covers direct hits during static generation. */
export default function HomePage() {
  redirect("/landing");
}
