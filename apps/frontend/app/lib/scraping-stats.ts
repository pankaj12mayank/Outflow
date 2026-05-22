export type ToolStatCounts = { total: number; success: number; failed: number };

const TOOL_JOB_TYPES: Record<string, string[]> = {
  "google-maps": ["google_maps_search", "google_maps_crawl", "google_maps"],
  website: ["website_crawl", "website"],
  linkedin: ["linkedin_enrich", "linkedin"],
  "csv-import": ["csv_import", "csv"],
};

export function emptyToolStats(): Record<string, ToolStatCounts> {
  return {
    "google-maps": { total: 0, success: 0, failed: 0 },
    website: { total: 0, success: 0, failed: 0 },
    linkedin: { total: 0, success: 0, failed: 0 },
    "csv-import": { total: 0, success: 0, failed: 0 },
  };
}

function toolIdForJobType(jobType: string): string | null {
  if (jobType.startsWith("google_maps")) return "google-maps";
  if (jobType.includes("website")) return "website";
  if (jobType.includes("linkedin")) return "linkedin";
  if (jobType.includes("csv")) return "csv-import";
  return null;
}

export function aggregateToolStatsFromJobs(jobs: Record<string, unknown>[]): Record<string, ToolStatCounts> {
  const stats = emptyToolStats();

  for (const job of jobs) {
    const jobType = String(job.job_type || job.type || "").toLowerCase();
    const toolId = toolIdForJobType(jobType);
    if (!toolId) continue;

    const status = String(job.status || "pending").toLowerCase();
    stats[toolId].total += 1;
    if (status === "completed") stats[toolId].success += 1;
    else if (status === "failed") stats[toolId].failed += 1;
  }

  return stats;
}

export function normalizeWebsiteUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}
