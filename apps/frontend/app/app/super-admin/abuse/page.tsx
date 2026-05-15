"use client";

import { useState } from "react";
import { useAbuseReports, useResolveAbuseReport } from "@/app/hooks/use-admin";
import { AlertTriangle, CheckCircle, Filter, Eye } from "lucide-react";

export default function AbuseReportsPage() {
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");

  const { data: reports, isLoading } = useAbuseReports({ status, severity });
  const resolveMutation = useResolveAbuseReport();

  const reportList = Array.isArray(reports) ? reports : (reports?.data ?? []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Abuse Reports</h1>
          <p className="text-gray-400">Monitor and respond to platform abuse</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-sm text-rose-400">{reportList.length} reports</span>
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white">
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : reportList.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white/[0.03] border border-white/5">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
            <p className="text-white font-medium">No abuse reports</p>
            <p className="text-sm text-gray-500 mt-1">All clear - no violations detected</p>
          </div>
        ) : reportList.map((report: { id: number; organization_id: number; organization_name: string; report_type: string; severity: string; description: string; status: string; evidence: Record<string, unknown>; created_at: string }) => (
          <div key={report.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${
                  report.severity === "critical" ? "bg-rose-500" :
                  report.severity === "high" ? "bg-amber-500" :
                  report.severity === "medium" ? "bg-yellow-500" : "bg-gray-500"
                }`} />
                <div>
                  <p className="text-white font-semibold">{report.report_type.replace("_", " ")}</p>
                  <p className="text-sm text-gray-500">{report.organization_name} (ID: {report.organization_id})</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full ${
                  report.severity === "critical" ? "bg-rose-500/20 text-rose-400" :
                  report.severity === "high" ? "bg-amber-500/20 text-amber-400" :
                  report.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-gray-500/20 text-gray-400"
                }`}>{report.severity}</span>
                <span className={`text-xs px-3 py-1 rounded-full ${
                  report.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-emerald-500/20 text-emerald-400"
                }`}>{report.status}</span>
              </div>
            </div>

            <p className="text-gray-300 mb-4">{report.description}</p>

            {Object.keys(report.evidence || {}).length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-white/[0.02]">
                <p className="text-xs text-gray-500 mb-2">Evidence:</p>
                <pre className="text-xs text-gray-400 overflow-x-auto">{JSON.stringify(report.evidence, null, 2)}</pre>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{new Date(report.created_at).toLocaleString()}</span>
              {report.status === "pending" && (
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm hover:bg-rose-500/20">
                    <Eye className="w-4 h-4" /> Investigate
                  </button>
                  <button
                    onClick={() => {
                      const action = prompt("Enter action taken:");
                      if (action) resolveMutation.mutate({ reportId: report.id, actionTaken: action });
                    }}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/20">
                    <CheckCircle className="w-4 h-4" /> Resolve
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}