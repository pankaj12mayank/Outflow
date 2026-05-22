/** Token selection for axios — keeps system-owner session isolated from org CRM JWT. */

const SO_API_PREFIXES = [
  "/system-owner-auth",
  "/system-owner/",
  "/system-owner-dashboard",
  "/system-owner/platform",
  "/organizations",
  "/plans",
  "/smtp/",
  "/cms/",
  "/email-engine",
  "/notifications",
  "/email-templates",
  "/polls/",
  "/payment-gateways",
  "/billing-owner",
];

export function isSystemOwnerApiRequest(requestUrl: string): boolean {
  const url = requestUrl || "";
  if (SO_API_PREFIXES.some((p) => url.includes(p))) {
    return true;
  }
  if (typeof window !== "undefined") {
    const path = window.location.pathname || "";
    if (path.startsWith("/system-owner")) {
      return true;
    }
  }
  return false;
}

export function pickAuthToken(requestUrl: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const accessToken = localStorage.getItem("access_token");
  const systemOwnerToken = localStorage.getItem("system_owner_token");
  if (isSystemOwnerApiRequest(requestUrl)) {
    return systemOwnerToken || accessToken;
  }
  return accessToken || systemOwnerToken;
}

export function clearOrgAuthTokens(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  document.cookie = "access_token=; path=/; max-age=0";
}

export function clearSystemOwnerAuthTokens(): void {
  localStorage.removeItem("system_owner_token");
  localStorage.removeItem("system_owner_refresh_token");
}
