"use client";

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("system_owner_token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  headers["Content-Type"] = "application/json";
  return headers;
}

export function getAccessHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  headers["Content-Type"] = "application/json";
  return headers;
}
