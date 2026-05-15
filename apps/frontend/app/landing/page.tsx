"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  Users,
  Target,
  BarChart3,
  Shield,
  Mail,
  ArrowRight,
  Check,
  ChevronDown,
  Sparkles,
  Brain,
  TrendingUp,
  Clock,
  Calendar,
  Bot,
  LineChart,
  Layers,
  Cpu,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Personalization",
    description: "Hyper-personalized emails at scale using advanced LLMs trained on your brand voice and prospect data.",
  },
  {
    icon: Target,
    title: "Smart Lead Discovery",
    description: "AI agents discover and qualify leads from multiple sources, enriching profiles with verified contact data.",
  },
  {
    icon: TrendingUp,
    title: "Behavioral Prediction",
    description: "Predict which prospects are most likely to convert based on engagement patterns and firmographic data.",
  },
  {
    icon: Mail,
    title: "Intelligent Sequencing",
    description: "Multi-channel outreach sequences that adapt based on prospect behavior and optimal send times.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Comprehensive dashboards tracking every touchpoint with actionable insights for optimization.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 compliant with role-based access, SSO, and advanced data encryption at rest.",
  },
];

const stats = [
  { value: "10M+", label: "Emails Sent" },
  { value: "500K+", label: "Leads Enriched" },
  { value: "98%", label: "Deliverability" },
  { value: "3x", label: "Reply Rates" },
];

const testimonials = [
  {
    quote: "Outflo transformed our outbound strategy. The AI personalization alone increased our reply rates by 340%.",
    author: "Sarah Chen",
    role: "VP of Sales, TechScale",
    avatar: "SC",
  },
  {
    quote: "The lead discovery is incredible. We built a qualified pipeline of 500+ prospects in under two weeks.",
    author: "Michael Torres",
    role: "Head of Growth, DataFlow",
    avatar: "MT",
  },
  {
    quote: "Finally, a platform that understands B2B outreach. The sequencing engine is pure magic.",
    author: "Emma Williams",
    role: "CRO, CloudNine",
    avatar: "EW",
  },
];

const plans = [
  {
    name: "Starter",
    price: "49",
    description: "Perfect for small teams starting with outbound",
    features: [
      "5,000 emails/month",
      "1,000 lead enrichments",
      "5 campaigns",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: "149",
    description: "For growing teams serious about outreach",
    features: [
      "25,000 emails/month",
      "10,000 lead enrichments",
      "Unlimited campaigns",
      "Advanced analytics",
      "AI personalization",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "499",
    description: "Full power for large outbound teams",
    features: [
      "Unlimited emails",
      "Unlimited enrichments",
      "Custom AI models",
      "Dedicated CSM",
      "SSO & advanced security",
      "API access",
    ],
  },
];

const faqs = [
  {
    question: "How does the AI personalization work?",
    answer: "Our AI analyzes thousands of data points about each prospect to craft hyper-personalized messages. It learns from engagement metrics to continuously improve performance.",
  },
  {
    question: "Can I connect my existing tools?",
    answer: "Yes! Outflo integrates with 50+ tools including Salesforce, HubSpot, Slack, LinkedIn, and more. Custom API access is available on Enterprise plans.",
  },
  {
    question: "What's included in lead enrichment?",
    answer: "Every lead gets enriched with verified emails, phone numbers, company data, social profiles, and intent signals from multiple data providers.",
  },
  {
    question: "How do you ensure email deliverability?",
    answer: "We use proprietary warmup algorithms, domain monitoring, and intelligent sending limits. Our 98% deliverability rate is unmatched in the industry.",
  },
  {
    question: "Can I migrate from another platform?",
    answer: "Absolutely! Our team handles full migration including campaigns, sequences, templates, and historical data. Most migrations complete within 48 hours.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left hover:text-purple-400 transition-colors"
      >
        <span className="font-medium text-lg">{question}</span>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="pb-5 text-gray-400"
        >
          {answer}
        </motion.div>
      )}
    </div>
  );
}

function FloatingOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-30 ${className}`}
      animate={{
        y: [0, -20, 0],
        x: [0, 10, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      } as any}
    />
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] overflow-hidden">
      <div className="fixed inset-0 bg-[var(--color-bg-primary)]">
        <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
        <FloatingOrb className="w-96 h-96 bg-purple-600 top-1/4 -left-48" delay={0} />
        <FloatingOrb className="w-80 h-80 bg-green-600 top-3/4 -right-40" delay={2} />
        <FloatingOrb className="w-64 h-64 bg-purple-400 bottom-1/4 left-1/3" delay={4} />
      </div>

      <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Outflo</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-gray-400 hover:text-white transition-colors">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-400 hover:text-white transition-colors hidden sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all hover:shadow-lg hover:shadow-purple-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">Powered by Advanced AI</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              AI-Powered
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              Outreach at Scale
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-10"
          >
            Hyper-personalized email campaigns driven by AI. Discover leads, craft perfect
            messages, and scale your outbound with 3x reply rates.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link
              href="/register"
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg transition-all hover:shadow-xl hover:shadow-purple-500/30"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/demo"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/10 hover:border-white/20 text-white font-medium text-lg transition-all"
            >
              Watch Demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="aspect-video rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-1">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-6">
                    <Brain className="w-10 h-10 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Your AI Outreach Dashboard</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Real-time analytics, campaign management, and AI-powered insights all in one place.
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-transparent to-green-500/20 rounded-3xl blur-xl -z-10" />
          </motion.div>
        </div>
      </section>

      <section className="relative py-20 px-6 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-green-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-purple-400 font-medium mb-4 block">FEATURES</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Everything you need to
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                dominate outbound
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              From lead discovery to campaign optimization, Outflo handles your entire outbound workflow.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent hover:border-purple-500/30 transition-all hover:bg-white/[0.07]"
              >
                <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:border-purple-500/40 transition-colors">
                  <feature.icon className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-purple-400 font-medium mb-4 block">HOW IT WORKS</span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Three steps to
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-green-400 bg-clip-text text-transparent">
                  outbound mastery
                </span>
              </h2>

              <div className="space-y-8 mt-10">
                {[
                  {
                    step: "01",
                    title: "Discover & Enrich",
                    description:
                      "AI agents search the web to find ideal prospects, then enrich them with verified emails, phone numbers, and company data.",
                  },
                  {
                    step: "02",
                    title: "Personalize at Scale",
                    description:
                      "Our LLM crafts hyper-personalized messages using company news, job postings, and 50+ data points for each prospect.",
                  },
                  {
                    step: "03",
                    title: "Optimize & Convert",
                    description:
                      "Track every touchpoint, learn from responses, and let AI continuously optimize your campaigns for maximum reply rates.",
                  },
                ].map((item, i) => (
                  <div key={item.step} className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-400">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-square rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/20 to-transparent p-8 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <Cpu className="w-8 h-8 text-purple-400 mb-4" />
                    <div className="text-2xl font-bold">50+</div>
                    <div className="text-sm text-gray-400">Data Sources</div>
                  </div>
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <Layers className="w-8 h-8 text-green-400 mb-4" />
                    <div className="text-2xl font-bold">10K+</div>
                    <div className="text-sm text-gray-400">Leads/Month</div>
                  </div>
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <LineChart className="w-8 h-8 text-purple-400 mb-4" />
                    <div className="text-2xl font-bold">340%</div>
                    <div className="text-sm text-gray-400">Reply Rate Boost</div>
                  </div>
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <Clock className="w-8 h-8 text-green-400 mb-4" />
                    <div className="text-2xl font-bold">24/7</div>
                    <div className="text-sm text-gray-400">AI Processing</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-purple-400 font-medium mb-4 block">TESTIMONIALS</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Loved by outbound
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                teams worldwide
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent"
              >
                <div className="text-purple-400 text-4xl mb-4">"</div>
                <p className="text-lg mb-6 leading-relaxed">{testimonial.quote}</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold">{testimonial.author}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-purple-400 font-medium mb-4 block">PRICING</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Simple, transparent
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                pricing
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees, no surprises.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative p-8 rounded-2xl border ${
                  plan.popular
                    ? "border-purple-500/50 bg-gradient-to-b from-purple-500/10 to-transparent"
                    : "border-white/10 bg-gradient-to-b from-white/5 to-transparent"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-purple-600 text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <div className="text-lg font-bold text-purple-400 mb-2">{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-5xl font-bold">${plan.price}</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-gray-400 mb-8">{plan.description}</p>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-3 rounded-xl font-medium transition-all ${
                    plan.popular
                      ? "bg-purple-600 hover:bg-purple-500 text-white"
                      : "border border-white/10 hover:border-white/20 text-white"
                  }`}
                >
                  Get Started
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-purple-400 font-medium mb-4 block">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Frequently asked
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                questions
              </span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="divide-y divide-white/5"
          >
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 md:p-16 rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-transparent"
          >
            <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to transform your outbound?
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-xl mx-auto">
              Join thousands of sales teams using AI to 10x their reply rates.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg transition-all hover:shadow-xl hover:shadow-purple-500/30"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="relative border-t border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Outflo</span>
            </div>

            <div className="flex items-center gap-8 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Security
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>

            <div className="text-gray-400 text-sm">
              &copy; 2026 Outflo. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}