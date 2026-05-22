import { redirect } from "next/navigation";

/** L18: mock jobs page removed — hub loads jobs from API. */
export default function ScrapingJobsRedirectPage() {
  redirect("/app/scraping?tab=jobs");
}
