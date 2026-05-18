"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Shield, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";

interface ValidationState {
  email: { valid: boolean; message: string };
  password: { valid: boolean; message: string };
}

export default function SystemOwnerLoginPage() {
  const router = useRouter();
  const { login: systemOwnerLogin } = useSystemOwnerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState<ValidationState>({
    email: { valid: true, message: "" },
    password: { valid: true, message: "" }
  });

  const [deviceInfo, setDeviceInfo] = useState({
    device_id: "",
    device_type: "desktop",
    browser: "unknown",
    os: "unknown"
  });

  useEffect(() => {
    const browserInfo = {
      device_id: localStorage.getItem("device_id") || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
      browser: getBrowser(),
      os: getOS()
    };
    
    if (!localStorage.getItem("device_id")) {
      localStorage.setItem("device_id", browserInfo.device_id);
    }
    
    setDeviceInfo(browserInfo);
  }, []);

  const getBrowser = () => {
    const ua = navigator.userAgent;
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "unknown";
  };

  const getOS = () => {
    const ua = navigator.userAgent;
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iOS")) return "iOS";
    return "unknown";
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 1;
  };

  const validateForm = (): boolean => {
    const newValidation: ValidationState = {
      email: { valid: true, message: "" },
      password: { valid: true, message: "" }
    };

    if (!email) {
      newValidation.email = { valid: false, message: "Email is required" };
    } else if (!validateEmail(email)) {
      newValidation.email = { valid: false, message: "Please enter a valid email" };
    }

    if (!password) {
      newValidation.password = { valid: false, message: "Password is required" };
    } else if (!validatePassword(password)) {
      newValidation.password = { valid: false, message: "Invalid password" };
    }

    setValidation(newValidation);
    return newValidation.email.valid && newValidation.password.valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await systemOwnerLogin(email, password, deviceInfo);
      router.push("/system-owner/dashboard");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(", ")
            : "Invalid credentials"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const InputField = ({ 
    label, 
    type, 
    value, 
    onChange, 
    icon: Icon,
    validation: val,
    placeholder 
  }: any) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon className="w-5 h-5" />
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-12 pr-12 py-4 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 ${
            !val.valid 
              ? "border-red-500 focus:ring-red-500/50" 
              : "border-white/10 focus:ring-purple-500/50 focus:border-purple-500/50"
          }`}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
        {val.valid && value && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        )}
      </div>
      <AnimatePresence>
        {!val.valid && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-red-400 flex items-center gap-1"
          >
            <AlertCircle className="w-4 h-4" />
            {val.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0a0a0f] to-[#0a0a0f]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5wYXRoIj48ZyBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDMiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiLz48L2c+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30"
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">System Owner</h1>
            <p className="text-gray-400 text-sm">Secure access to administration</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <InputField
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              icon={Shield}
              validation={validation.email}
              placeholder="admin@outflo.com"
            />

            <InputField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              icon={Lock}
              validation={validation.password}
              placeholder="Enter your password"
            />

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <a href="/login" className="text-sm text-gray-400 hover:text-purple-400 transition-colors">
              Return to organization login
            </a>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Encrypted</span>
          </div>
          <div className="w-px h-3 bg-gray-600" />
          <span>Secure Session</span>
          <div className="w-px h-3 bg-gray-600" />
          <span>JWT Auth</span>
        </div>
      </motion.div>
    </div>
  );
}