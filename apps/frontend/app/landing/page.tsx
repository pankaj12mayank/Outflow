"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/app/lib/api";
import {
  Zap, Users, Target, BarChart3, Shield, Mail, ArrowRight,
  Check, ChevronDown, Sparkles, Brain, TrendingUp, Clock,
  Calendar, Bot, Menu, X, Play, Star, Quote, ChevronUp,
} from "lucide-react";
import { ScrollProgress, ScrollReveal, Counter } from "@/app/components/premium/sections";

const DEFAULT_CONTENT = {
  hero: {
    badge: "🚀 AI-Powered Outreach Platform",
    title: "Scale Your Outreach with AI That Actually Works",
    subtitle: "Stop wasting time on manual outreach. Outflo's AI discovers, personalizes, and automates your entire outbound process so you can focus on closing deals.",
    cta: "Start Free Trial",
    ctaSecondary: "Watch Demo",
    trustText: "No credit card required • 14-day free trial • Cancel anytime",
  },
  features: [
    { icon: "Bot", title: "AI-Powered Personalization", description: "Hyper-personalized emails at scale using advanced LLMs.", active: true },
    { icon: "Target", title: "Smart Lead Discovery", description: "AI agents discover and qualify leads from multiple sources.", active: true },
    { icon: "TrendingUp", title: "Behavioral Prediction", description: "Predict which prospects are most likely to convert.", active: true },
    { icon: "Mail", title: "Intelligent Sequencing", description: "Multi-channel sequences that adapt based on behavior.", active: true },
    { icon: "BarChart3", title: "Real-Time Analytics", description: "Comprehensive dashboards with actionable insights.", active: true },
    { icon: "Shield", title: "Enterprise Security", description: "SOC 2 compliant with role-based access and SSO.", active: true },
  ],
  stats: [
    { value: "10M+", label: "Emails Sent" },
    { value: "500K+", label: "Leads Enriched" },
    { value: "98%", label: "Deliverability" },
    { value: "3x", label: "Reply Rates" },
  ],
  pricing: [
    { name: "Starter", price: "49", features: ["5,000 emails/month", "1,000 lead enrichments", "5 campaigns", "Basic analytics"], active: true },
    { name: "Professional", price: "149", features: ["25,000 emails/month", "10,000 enrichments", "Unlimited campaigns", "AI personalization", "Priority support"], popular: true, active: true },
    { name: "Enterprise", price: "499", features: ["Unlimited emails", "Unlimited enrichments", "Custom AI models", "Dedicated CSM", "SSO & API"], active: true },
  ],
  faqs: [
    { question: "How does the AI personalization work?", answer: "Our AI analyzes thousands of data points about each prospect to craft hyper-personalized messages.", active: true },
    { question: "Can I connect my existing tools?", answer: "Yes! Outflo integrates with 50+ tools including Salesforce, HubSpot, Slack, and more.", active: true },
    { question: "What's included in lead enrichment?", answer: "Every lead gets enriched with verified emails, phone numbers, company data, and social profiles.", active: true },
    { question: "How do you ensure email deliverability?", answer: "We use proprietary warmup algorithms, domain monitoring, and intelligent sending limits.", active: true },
    { question: "Can I migrate from another platform?", answer: "Absolutely! Our team handles full migration including campaigns, sequences, and historical data.", active: true },
  ],
  footer: {
    company: "Outflo Inc.",
    email: "hello@outflo.com",
    copyright: `© ${new Date().getFullYear()} Outflo. All rights reserved.`,
  },
};

interface LandingContent {
  hero: { badge: string; title: string; subtitle: string; cta: string; ctaSecondary: string; trustText: string };
  features: { icon: string; title: string; description: string; active: boolean }[];
  stats: { value: string; label: string }[];
  pricing: { name: string; price: string; features: string[]; popular?: boolean; active: boolean }[];
  faqs: { question: string; answer: string; active: boolean }[];
  footer: { company: string; email: string; copyright: string };
}

const ICONS = {
  Bot,
  Target,
  TrendingUp,
  Mail,
  BarChart3,
  Shield,
  Sparkles,
  Brain,
  Users,
  Zap,
  Clock,
  Calendar,
} as const;

export default function LandingPage() {
  const [content, setContent] = useState<LandingContent>(DEFAULT_CONTENT);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const [cmsRes, plansRes] = await Promise.all([
        api.get("/api/v1/cms/landing/content"),
        api.get("/api/v1/plans/landing"),
      ]);
      if (cmsRes.data?.content) {
        const merged = { ...cmsRes.data.content };
        const pricing = plansRes.data?.pricing;
        if (pricing?.length) {
          merged.pricing = pricing;
        }
        setContent(merged);
      }
    } catch (error) {
      console.log("Using default landing content");
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <ScrollProgress />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold">Outflo</span>
            </Link>

            <div className="hidden md:flex items-center gap-10">
              <button onClick={() => scrollToSection("features")} className="text-base text-gray-300 hover:text-white transition-colors font-medium">Features</button>
              <button onClick={() => scrollToSection("pricing")} className="text-base text-gray-300 hover:text-white transition-colors font-medium">Pricing</button>
              <button onClick={() => scrollToSection("faq")} className="text-base text-gray-300 hover:text-white transition-colors font-medium">FAQ</button>
              <Link href="/login" className="text-base text-gray-300 hover:text-white transition-colors font-medium">Sign in</Link>
              <Link href="/register" className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25">
                Start Free
              </Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 hover:bg-white/5 rounded-lg transition-colors">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
            <div className="md:hidden border-t border-white/5 bg-[#0a0a0f] animate-fade-in">
              <div className="px-8 py-5 space-y-3">
                <button onClick={() => { scrollToSection("features"); setMobileMenuOpen(false); }} className="block w-full text-left py-3 text-gray-300 hover:text-white transition-colors text-lg">Features</button>
                <button onClick={() => { scrollToSection("pricing"); setMobileMenuOpen(false); }} className="block w-full text-left py-3 text-gray-300 hover:text-white transition-colors text-lg">Pricing</button>
                <button onClick={() => { scrollToSection("faq"); setMobileMenuOpen(false); }} className="block w-full text-left py-3 text-gray-300 hover:text-white transition-colors text-lg">FAQ</button>
                <div className="pt-4 border-t border-white/5">
                  <Link href="/login" className="block py-3 text-gray-300 hover:text-white text-lg">Sign in</Link>
                  <Link href="/register" className="block mt-3 px-5 py-3 bg-purple-500 rounded-xl text-center font-semibold">Start Free</Link>
                </div>
              </div>
            </div>
        ) : null}
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-32 px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-purple-500/20 rounded-full blur-[140px]" />
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="animate-fade-up">
            <span className="inline-block px-6 py-3 bg-purple-500/15 border border-purple-500/30 rounded-full text-sm text-purple-400 font-semibold mb-10">
              AI-Powered Outreach Platform
            </span>
            
            <h1 className="text-4xl sm:text-5xl md:text-4xl md:text-5xl font-bold mb-8 leading-tight bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
              Scale Your Outreach with AI That Actually Works
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Stop wasting time on manual outreach. Outflo's AI discovers, personalizes, and automates your entire outbound process so you can focus on closing deals.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10">
              <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-purple-500 hover:bg-purple-600 rounded-xl font-bold text-base text-center transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30 flex items-center justify-center gap-3">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl font-semibold text-base transition-all hover:border-white/25 flex items-center justify-center gap-3">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>
            
            <p className="text-base text-gray-500">No credit card required • 14-day free trial • Cancel anytime</p>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-6xl mx-auto mt-28 grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-16">
          {content.stats.map((stat, i) => (
            <ScrollReveal
              key={stat.label}
              animation="slide-up"
              delay={i * 100}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-purple-400 mb-3">
                <Counter end={parseInt(stat.value.replace(/[^0-9]/g, "")) || 0} suffix={stat.value.replace(/[0-9]/g, "")} />
              </div>
              <div className="text-gray-400 text-lg">{stat.label}</div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-8 bg-gradient-to-b from-transparent via-purple-500/8 to-transparent">
        <div className="max-w-[1600px] mx-auto">
          <ScrollReveal animation="slide-up" className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">Everything you need to scale outreach</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Powerful features wrapped in a simple, intuitive interface</p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {content.features.filter(f => f.active).map((feature, i) => {
              const IconComponent =
                ICONS[feature.icon as keyof typeof ICONS] ?? Bot;
              return (
                <ScrollReveal
                  key={feature.title}
                  animation="slide-up"
                  delay={i * 50}
                  className="group p-8 bg-white/5 border border-white/10 rounded-3xl hover:border-purple-500/40 transition-all cursor-pointer card-hover-lift hover:bg-white/10 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10"
                >
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/15 flex items-center justify-center mb-6 group-hover:bg-purple-500/25 transition-colors shadow-lg shadow-purple-500/15">
                    <IconComponent className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 text-base leading-relaxed">{feature.description}</p>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-8">
        <div className="max-w-[1600px] mx-auto">
          <ScrollReveal animation="slide-up" className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">Simple, transparent pricing</h2>
            <p className="text-gray-400 text-lg">Choose the plan that fits your team</p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-10">
            {content.pricing.filter(p => p.active).map((plan, i) => (
              <ScrollReveal
                key={plan.name}
                animation="slide-up"
                delay={i * 100}
                className={cn(
                  "p-10 rounded-3xl border transition-all cursor-pointer hover:scale-[1.02]",
                  plan.popular 
                    ? "bg-purple-500/15 border-purple-500/40 relative shadow-2xl shadow-purple-500/15" 
                    : "bg-white/5 border-white/10 hover:border-white/25"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-5 py-2 bg-purple-500 rounded-full text-sm font-bold">
                    Most Popular
                  </div>
                )}
                <div className="mb-10">
                  <h3 className="text-xl font-bold mb-3">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-bold">${plan.price}</span>
                    <span className="text-gray-400 text-base">/month</span>
                  </div>
                </div>
                <ul className="space-y-5 mb-12">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-base text-gray-300">
                      <Check className="w-6 h-6 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/register" 
                  className={cn(
                    "block w-full py-4 rounded-xl font-bold text-center transition-all text-lg",
                    plan.popular 
                      ? "bg-purple-500 hover:bg-purple-600 hover:shadow-xl hover:shadow-purple-500/30" 
                      : "bg-white/10 hover:bg-white/20"
                  )}
                >
                  Get Started
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 px-8">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal animation="slide-up" className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">Frequently Asked Questions</h2>
            <p className="text-gray-400 text-lg">Everything you need to know about Outflo</p>
          </ScrollReveal>

          <div className="space-y-5">
            {content.faqs.filter(f => f.active).map((faq, i) => (
              <ScrollReveal
                key={i}
                animation="slide-up"
                delay={i * 50}
                className="border border-white/10 rounded-2xl overflow-hidden hover:border-white/25 transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-lg">{faq.question}</span>
                  <div className={cn("transition-transform duration-300", openFaq === i && "rotate-180")}>
                    <ChevronDown className="w-6 h-6 text-gray-400" />
                  </div>
                </button>
                {openFaq === i ? (
                    <div className="px-8 pb-7 animate-fade-in">
                      <p className="text-gray-400 text-base leading-relaxed">{faq.answer}</p>
                    </div>
                  ) : null}
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <ScrollReveal animation="scale" className="p-12 lg:p-20 rounded-3xl bg-gradient-to-br from-purple-500/25 to-purple-600/15 border border-purple-500/25">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">Ready to supercharge your outreach?</h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">Join thousands of teams already using Outflo to scale their outbound.</p>
            <Link href="/register" className="inline-flex items-center gap-3 px-8 py-4 bg-purple-500 hover:bg-purple-600 rounded-xl font-bold text-base transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30">
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 border-t border-white/5">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold">{content.footer.company}</span>
            </div>
            <div className="text-gray-400 text-base">
              {content.footer.copyright}
            </div>
            <div className="text-gray-400 text-base">
              <a href={`mailto:${content.footer.email}`} className="hover:text-white transition-colors">
                {content.footer.email}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}