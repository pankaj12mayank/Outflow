"use client";

import { Loader2, Mail, Lock, User, Building2, AlertCircle, CheckCircle, Zap,
         Phone, Globe, Users, Target, Sparkles, ArrowRight, ArrowLeft, Check, Eye, EyeOff } from "lucide-react";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/hooks/useAuth";
import { Button } from "@/app/components/premium/button";
import { Input } from "@/app/components/premium/input";

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface OnboardingData {
  // Step 1: Account
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Step 2: Organization
  organizationName: string;
  organizationWebsite: string;
  industry: string;
  companySize: string;
  // Step 3: Goals
  primaryGoal: string;
  targetAudience: string;
  monthlyLeads: string;
  // Step 4: Preferences
  emailProvider: string;
  timezone: string;
  // Step 5: Complete
}

const STEPS = [
  { id: 1, title: "Account", icon: User, description: "Create your account" },
  { id: 2, title: "Organization", icon: Building2, description: "Setup your company" },
  { id: 3, title: "Goals", icon: Target, description: "Define your objectives" },
  { id: 4, title: "Preferences", icon: Sparkles, description: "Configure settings" },
  { id: 5, title: "Complete", icon: Check, description: "You're all set!" },
];

const INDUSTRIES = [
  "SaaS / Technology",
  "E-commerce / Retail",
  "Healthcare",
  "Finance / Fintech",
  "Real Estate",
  "Education",
  "Marketing Agency",
  "Consulting",
  "Manufacturing",
  "Other"
];

const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees"
];

const GOALS = [
  { value: "lead_generation", label: "Lead Generation", desc: "Find and capture new leads" },
  { value: "outreach", label: "Cold Outreach", desc: "Scale personalized campaigns" },
  { value: "recruiting", label: "Recruiting", desc: "Source top talent" },
  { value: "sales", label: "Sales Outreach", desc: "Drive revenue through outreach" },
];

const TIMEZONES = [
  "America/New_York (EST)",
  "America/Chicago (CST)",
  "America/Denver (MST)",
  "America/Los_Angeles (PST)",
  "Europe/London (GMT)",
  "Europe/Paris (CET)",
  "Asia/Tokyo (JST)",
  "Asia/Shanghai (CST)",
  "Asia/Kolkata (IST)",
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [data, setData] = useState<OnboardingData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
    organizationWebsite: "",
    industry: "",
    companySize: "",
    primaryGoal: "",
    targetAudience: "",
    monthlyLeads: "",
    emailProvider: "",
    timezone: "",
  });

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (field === "password") {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return data.fullName.length >= 2 && 
               data.email.includes("@") && 
               data.password.length >= 8 &&
               data.password === data.confirmPassword;
      case 2:
        return data.organizationName.length >= 2;
      case 3:
        return data.primaryGoal.length > 0;
      case 4:
        return data.timezone.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      if (currentStep < 5) {
        setCurrentStep((prev) => (prev + 1) as OnboardingStep);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError("");

    try {
      await register(
        data.email,
        data.password,
        data.fullName,
        data.organizationName
      );
      
      // After registration, redirect to dashboard
      router.push("/app/dashboard?onboarding=complete");
    } catch (err: any) {
      console.error("Registration error:", err);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg || d).join(", "));
      } else {
        setError(detail || "Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-green-600"];
  const strengthLabels = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/landing" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Outflo</span>
        </Link>
      </header>

      {/* Progress Steps */}
      <div className="px-8 py-4">
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-300",
                  currentStep >= step.id
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                    : "bg-white/5 text-gray-400 border border-white/10"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </motion.div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-16 h-0.5 mx-2",
                  currentStep > step.id ? "bg-purple-500" : "bg-white/10"
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center mt-4">
          <h2 className="text-lg font-semibold text-white">{STEPS[currentStep - 1].title}</h2>
          <p className="text-sm text-gray-400">{STEPS[currentStep - 1].description}</p>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Account */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={data.fullName}
                      onChange={(e) => updateData("fullName", e.target.value)}
                      placeholder="John Smith"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => updateData("email", e.target.value)}
                      placeholder="john@company.com"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={data.password}
                      onChange={(e) => updateData("password", e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {data.password && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors",
                              passwordStrength >= level ? strengthColors[passwordStrength - 1] : "bg-white/10"
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">{strengthLabels[passwordStrength]} password</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={data.confirmPassword}
                      onChange={(e) => updateData("confirmPassword", e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    {data.confirmPassword && data.password === data.confirmPassword && (
                      <CheckCircle className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Organization */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Organization Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={data.organizationName}
                      onChange={(e) => updateData("organizationName", e.target.value)}
                      placeholder="Acme Inc."
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Website (Optional)</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={data.organizationWebsite}
                      onChange={(e) => updateData("organizationWebsite", e.target.value)}
                      placeholder="https://acme.com"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Industry</label>
                  <select
                    value={data.industry}
                    onChange={(e) => updateData("industry", e.target.value)}
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    style={{backgroundColor: 'rgba(255,255,255,0.05)'}}
                  >
                    <option value="" style={{backgroundColor: '#0a0a0f', color: '#9ca3af'}}>Select your industry</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind} style={{backgroundColor: '#0a0a0f', color: 'white'}}>{ind}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Company Size</label>
                  <select
                    value={data.companySize}
                    onChange={(e) => updateData("companySize", e.target.value)}
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    style={{backgroundColor: 'rgba(255,255,255,0.05)'}}
                  >
                    <option value="" style={{backgroundColor: '#0a0a0f', color: '#9ca3af'}}>Select company size</option>
                    {COMPANY_SIZES.map(size => (
                      <option key={size} value={size} style={{backgroundColor: '#0a0a0f', color: 'white'}}>{size}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Step 3: Goals */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">Primary Goal</label>
                  <div className="grid grid-cols-2 gap-3">
                    {GOALS.map(goal => (
                      <motion.button
                        key={goal.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updateData("primaryGoal", goal.value)}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all",
                          data.primaryGoal === goal.value
                            ? "bg-purple-500/20 border-purple-500 text-white"
                            : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20"
                        )}
                      >
                        <div className="font-medium mb-1">{goal.label}</div>
                        <div className="text-xs text-gray-400">{goal.desc}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Target Audience</label>
                  <input
                    type="text"
                    value={data.targetAudience}
                    onChange={(e) => updateData("targetAudience", e.target.value)}
                    placeholder="e.g., VP of Sales at SaaS companies"
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Expected Monthly Leads</label>
                  <select
                    value={data.monthlyLeads}
                    onChange={(e) => updateData("monthlyLeads", e.target.value)}
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    style={{backgroundColor: 'rgba(255,255,255,0.05)'}}
                  >
                    <option value="" style={{backgroundColor: '#0a0a0f', color: '#9ca3af'}}>Select range</option>
                    <option value="0-100" style={{backgroundColor: '#0a0a0f', color: 'white'}}>0-100</option>
                    <option value="100-500" style={{backgroundColor: '#0a0a0f', color: 'white'}}>100-500</option>
                    <option value="500-1000" style={{backgroundColor: '#0a0a0f', color: 'white'}}>500-1000</option>
                    <option value="1000-5000" style={{backgroundColor: '#0a0a0f', color: 'white'}}>1000-5000</option>
                    <option value="5000+" style={{backgroundColor: '#0a0a0f', color: 'white'}}>5000+</option>
                  </select>
                </div>
              </motion.div>
            )}

            {/* Step 4: Preferences */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Timezone</label>
                  <select
                    value={data.timezone}
                    onChange={(e) => updateData("timezone", e.target.value)}
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="">Select timezone</option>
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Email Provider (Optional)</label>
                  <input
                    type="text"
                    value={data.emailProvider}
                    onChange={(e) => updateData("emailProvider", e.target.value)}
                    placeholder="e.g., Gmail, Outlook, Custom SMTP"
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-white mb-1">Ready to get started?</h4>
                      <p className="text-sm text-gray-400">
                        You're all set! Click complete to finish your registration and access the dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Complete */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30"
                >
                  <Check className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">You're all set!</h2>
                <p className="text-gray-400 mb-8">
                  Welcome to Outflo, {data.fullName}! Let's get you started.
                </p>
                
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 mb-6">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleComplete}
                  isLoading={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? "Creating Account..." : "Complete Setup"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          {currentStep < 5 && (
            <div className="flex items-center justify-between mt-8">
              {currentStep > 1 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            </div>
          )}

          {/* Login Link */}
          <div className="mt-8 text-center">
            <span className="text-gray-400 text-sm">Already have an account? </span>
            <Link href="/login" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}