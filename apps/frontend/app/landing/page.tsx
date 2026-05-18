"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/app/lib/api";
import {
  Zap, Users, Target, BarChart3, Shield, Mail, ArrowRight,
  Check, ChevronDown, Sparkles, Brain, TrendingUp, Clock,
  Calendar, Bot, Menu, X, Play, Star, Quote, ChevronUp,
} from "lucide-react";
import { ScrollProgress, ScrollReveal, Counter } from "@/app/components/premium";

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

const ICONS: Record<string, any> = {
  Bot, Target, TrendingUp, Mail, BarChart3, Shield, Sparkles, Brain, Users, Zap, Clock, Calendar
};

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
      const response = await api.get("/api/v1/cms/landing/content");
      if (response.data?.content) {
        setContent(response.data.content);
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Outflo</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection("features")} className="text-sm text-gray-400 hover:text-white transition-colors">Features</button>
              <button onClick={() => scrollToSection("pricing")} className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</button>
              <button onClick={() => scrollToSection("faq")} className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</button>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</Link>
              <Link href="/register" className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors">
                Start Free
              </Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/5 bg-[#0a0a0f]"
            >
              <div className="px-6 py-4 space-y-4">
                <button onClick={() => { scrollToSection("features"); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-400 hover:text-white">Features</button>
                <button onClick={() => { scrollToSection("pricing"); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-400 hover:text-white">Pricing</button>
                <button onClick={() => { scrollToSection("faq"); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-400 hover:text-white">FAQ</button>
                <Link href="/login" className="block text-gray-400 hover:text-white">Sign in</Link>
                <Link href="/register" className="block px-4 py-2 bg-purple-500 rounded-lg text-center font-medium">Start Free</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/20 rounded-full blur-[120px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-sm text-purple-400 mb-6">
              {content.hero.badge}
            </span>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              {content.hero.title}
            </h1>
            
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              {content.hero.subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-purple-500 hover:bg-purple-600 rounded-xl font-semibold text-center transition-all hover:scale-105 flex items-center justify-center gap-2">
                {content.hero.cta}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                {content.hero.ctaSecondary}
              </button>
            </div>
            
            <p className="mt-6 text-sm text-gray-500">{content.hero.trustText}</p>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="max-w-5xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {content.stats.map((stat, i) => (
            <ScrollReveal
              key={stat.label}
              animation="slide-up"
              delay={i * 100}
              className="text-center"
            >
              <div className="text-4xl font-bold text-purple-400 mb-2">
                <Counter end={parseInt(stat.value.replace(/[^0-9]/g, "")) || 0} suffix={stat.value.replace(/[0-9]/g, "")} />
              </div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal animation="slide-up" className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to scale outreach</h2>
            <p className="text-gray-400 text-lg">Powerful features wrapped in a simple, intuitive interface</p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.features.filter(f => f.active).map((feature, i) => {
              const IconComponent = ICONS[feature.icon] || Bot;
              return (
                <ScrollReveal
                  key={feature.title}
                  animation="slide-up"
                  delay={i * 50}
                  className="group p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-purple-500/30 transition-all cursor-pointer card-hover-lift"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                    <IconComponent className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal animation="slide-up" className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400 text-lg">Choose the plan that fits your team</p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {content.pricing.filter(p => p.active).map((plan, i) => (
              <ScrollReveal
                key={plan.name}
                animation="slide-up"
                delay={i * 100}
                className={cn(
                  "p-8 rounded-2xl border transition-all cursor-pointer",
                  plan.popular 
                    ? "bg-purple-500/10 border-purple-500/30 relative" 
                    : "bg-white/5 border-white/10"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-500 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-gray-300">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/register" 
                  className={cn(
                    "block w-full py-3 rounded-xl font-medium text-center transition-all",
                    plan.popular 
                      ? "bg-purple-500 hover:bg-purple-600" 
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
      <section id="faq" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal animation="slide-up" className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400 text-lg">Everything you need to know about Outflo</p>
          </ScrollReveal>

          <div className="space-y-4">
            {content.faqs.filter(f => f.active).map((faq, i) => (
              <ScrollReveal
                key={i}
                animation="slide-up"
                delay={i * 50}
                className="border border-white/10 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium">{faq.question}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }}>
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-gray-400">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal animation="scale" className="p-12 rounded-3xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20">
            <h2 className="text-4xl font-bold mb-4">Ready to supercharge your outreach?</h2>
            <p className="text-xl text-gray-400 mb-8">Join thousands of teams already using Outflo to scale their outbound.</p>
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-purple-500 hover:bg-purple-600 rounded-xl font-semibold transition-all hover:scale-105">
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">{content.footer.company}</span>
            </div>
            <div className="text-gray-400 text-sm">
              {content.footer.copyright}
            </div>
            <div className="text-gray-400 text-sm">
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