"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/app/hooks/useAuth";
import { Button } from "@/app/components/ui/button";
import { Loader2, Mail, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { cn } from "@/app/lib/utils";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail } = useAuth();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      verifyToken(tokenParam);
    } else {
      setStatus("error");
      setMessage("Verification token is missing");
    }
  }, [searchParams]);

  const verifyToken = async (token: string) => {
    try {
      await verifyEmail(token);
      setStatus("success");
      setMessage("Your email has been verified successfully!");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.response?.data?.detail || "Failed to verify email");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-mesh opacity-30" />
      <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -left-48" />
      <div className="absolute w-80 h-80 bg-green-600/20 rounded-full blur-3xl -bottom-40 -right-40" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md p-8 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl"
      >
        <div className="text-center mb-6">
          {status === "loading" && (
            <>
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Verifying...</h2>
              <p className="text-gray-400">Please wait while we verify your email</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Email Verified</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}
        </div>

        <div className="space-y-4">
          {status === "success" && (
            <Button className="w-full" onClick={() => router.push("/app/dashboard")}>
              Go to Dashboard
            </Button>
          )}

          {status === "error" && (
            <>
              <Button className="w-full" onClick={() => router.push("/login")}>
                Back to Login
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/forgot-password")}>
                Request New Link
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}