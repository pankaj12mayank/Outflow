"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { toast } from "@/app/components/toast";
import { SoPageLayout } from "@/app/system-owner/components/SoPageLayout";
import { 
  Clock, RefreshCw, Play, AlertCircle, CheckCircle, XCircle,
  Send, ArrowRight
} from "lucide-react";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("system_owner_token")}` };
}

export default function EmailQueuePage() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<any[]>([]);
  const [failed, setFailed] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, failedRes] = await Promise.all([
        api.get("/api/v1/email-engine/queue/pending", { headers: authHeaders() }),
        api.get("/api/v1/email-engine/queue/failed", { headers: authHeaders() }),
      ]);
      setPending(pendingRes.data?.emails || []);
      setFailed(failedRes.data?.emails || []);
    } catch (error) {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const processQueue = async () => {
    setProcessing(true);
    try {
      const res = await api.post("/api/v1/email-engine/queue/process", {}, {
        headers: authHeaders()
      });
      toast.success(`Processed ${res.data?.processed || 0} emails`);
      loadData();
    } catch (error) {
      toast.error("Failed to process queue");
    } finally {
      setProcessing(false);
    }
  };

  const retryFailed = async () => {
    setProcessing(true);
    try {
      const res = await api.post("/api/v1/email-engine/queue/retry-failed", {}, {
        headers: authHeaders()
      });
      toast.success(`Retried ${res.data?.retried || 0} emails`);
      loadData();
    } catch (error) {
      toast.error("Failed to retry emails");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <SoPageLayout
      title="Email Queue"
      description="Manage pending and failed emails"
      actions={
        <div className="flex items-center gap-2">
          <button 
            onClick={retryFailed}
            disabled={processing || failed.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
            Retry Failed
          </button>
          <button 
            onClick={processQueue}
            disabled={processing || pending.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
            Process Queue
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  Pending ({pending.length})
                </h2>
              </div>
              {pending.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No pending emails</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {pending.slice(0, 10).map((item) => (
                    <div key={item._id} className="p-3 rounded-xl bg-white/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{item.to_email}</div>
                          <div className="text-xs text-gray-400">{item.subject}</div>
                        </div>
                        <span className="px-2 py-1 rounded text-xs bg-orange-500/10 text-orange-400">
                          {item.priority === 1 ? 'High' : item.priority === 10 ? 'Low' : 'Normal'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  Failed ({failed.length})
                </h2>
              </div>
              {failed.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No failed emails</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {failed.slice(0, 10).map((item) => (
                    <div key={item._id} className="p-3 rounded-xl bg-white/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{item.to_email}</div>
                          <div className="text-xs text-red-400">{item.error_message}</div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {item.retry_count}/{item.max_retries} retries
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SoPageLayout>
  );
}