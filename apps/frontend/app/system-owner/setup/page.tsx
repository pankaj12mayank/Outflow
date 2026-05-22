import { redirect } from "next/navigation";

/** Setup removed — use System Health instead (audit #6). */
export default function SystemOwnerSetupRedirect() {
  redirect("/system-owner/health");
}
