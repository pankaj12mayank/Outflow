"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import api from "@/app/lib/api";

interface Block {
  _id: string;
  block_type: string;
  data: any;
}

interface Page {
  name: string;
  slug: string;
  blocks: Block[];
  seo?: {
    title: string;
    description: string;
    keywords: string[];
    og_image?: string;
    no_index?: boolean;
  };
}

export default function LandingPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPage();
  }, [slug]);

  const fetchPage = async () => {
    try {
      const response = await api.get(`/api/v1/cms/landing/pages/slug/${slug}`);
      setPage(response.data);
    } catch (err: any) {
      setError(err.response?.status === 404 ? "Page not found" : "Failed to load page");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600">Page not found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head seo={page.seo} />
      <main className="min-h-screen bg-white">
        {page.blocks?.map((block) => (
          <BlockRenderer key={block._id} block={block} />
        ))}
      </main>
    </>
  );
}

function Head({ seo }: { seo?: any }) {
  if (!seo) return null;
  
  return (
    <head>
      <title>{seo.title || "Outflo"}</title>
      {seo.description && <meta name="description" content={seo.description} />}
      {seo.keywords?.length > 0 && <meta name="keywords" content={seo.keywords.join(", ")} />}
      {seo.no_index && <meta name="robots" content="noindex, nofollow" />}
      {seo.og_image && <meta property="og:image" content={seo.og_image} />}
    </head>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  const { data, block_type } = block;

  switch (block_type) {
    case "navbar":
      return <NavbarBlock data={data} />;
    case "hero":
      return <HeroBlock data={data} />;
    case "features":
      return <FeaturesBlock data={data} />;
    case "pricing":
      return <PricingBlock data={data} />;
    case "testimonials":
      return <TestimonialsBlock data={data} />;
    case "faq":
      return <FaqBlock data={data} />;
    case "integrations":
      return <IntegrationsBlock data={data} />;
    case "cta":
      return <CtaBlock data={data} />;
    case "footer":
      return <FooterBlock data={data} />;
    case "logo_carousel":
      return <LogoCarouselBlock data={data} />;
    case "stats":
      return <StatsBlock data={data} />;
    case "contact":
      return <ContactBlock data={data} />;
    default:
      return null;
  }
}

function NavbarBlock({ data }: { data: any }) {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          {data.logo ? <img src={data.logo} alt={data.logo_text} className="h-8" /> : <span className="text-xl font-bold text-purple-600">{data.logo_text || "Outflo"}</span>}
        </a>
        <div className="hidden md:flex items-center gap-8">
          {data.links?.map((link: any, i: number) => (
            <a key={i} href={link.href} className="text-gray-600 hover:text-purple-600">{link.text}</a>
          ))}
        </div>
        <a href={data.cta_link} className="px-4 py-2 bg-purple-600 text-white rounded-lg">{data.cta_text}</a>
      </div>
    </nav>
  );
}

function HeroBlock({ data }: { data: any }) {
  return (
    <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-purple-50 to-white">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">{data.headline}</h1>
        <p className="text-xl text-gray-600 mb-8">{data.subheadline}</p>
        <div className="flex justify-center gap-4">
          <a href={data.cta_primary_link} className="px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">{data.cta_primary}</a>
          <a href={data.cta_secondary_link} className="px-8 py-4 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50">{data.cta_secondary}</a>
        </div>
      </div>
    </section>
  );
}

function FeaturesBlock({ data }: { data: any }) {
  const cols = data.columns || 4;
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">{data.title}</h2>
        <p className="text-gray-600 text-center mb-12">{data.subtitle}</p>
        <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-8`}>
          {data.features?.map((f: any, i: number) => (
            <div key={i} className="p-6 bg-white border rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingBlock({ data }: { data: any }) {
  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">{data.title}</h2>
        <p className="text-gray-600 text-center mb-12">{data.subtitle}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {data.plans?.map((plan: any, i: number) => (
            <div key={i} className={`bg-white p-8 rounded-2xl ${plan.popular ? "ring-2 ring-purple-500 shadow-xl" : ""}`}>
              {plan.popular && <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">Popular</span>}
              <h3 className="text-xl font-bold text-gray-900 mt-4">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-gray-500">/{plan.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features?.map((f: string, j: number) => (
                  <li key={j} className="text-gray-600 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/signup" className="mt-8 block w-full py-3 text-center bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">Get Started</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsBlock({ data }: { data: any }) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{data.title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {data.testimonials?.map((t: any, i: number) => (
            <div key={i} className="p-6 bg-gray-50 rounded-xl">
              <p className="text-gray-600 mb-4">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-semibold text-purple-600">{t.name.charAt(0)}</div>
                <div>
                  <div className="font-medium text-gray-900">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqBlock({ data }: { data: any }) {
  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{data.title}</h2>
        <div className="space-y-4">
          {data.faqs?.map((faq: any, i: number) => (
            <div key={i} className="bg-white p-6 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IntegrationsBlock({ data }: { data: any }) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{data.title}</h2>
        <div className="flex flex-wrap justify-center gap-8">
          {data.integrations?.map((int: any, i: number) => (
            <div key={i} className="w-32 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 font-medium">{int.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBlock({ data }: { data: any }) {
  const bgColor = data.background_color || "#7c3aed";
  return (
    <section className="py-20 px-6" style={{ backgroundColor: bgColor }}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">{data.headline}</h2>
        <p className="text-white/80 mb-8">{data.subheadline}</p>
        <a href={data.cta_link} className="inline-block px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100">{data.cta_text}</a>
      </div>
    </section>
  );
}

function FooterBlock({ data }: { data: any }) {
  return (
    <footer className="bg-gray-900 text-white py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            {data.logo ? <img src={data.logo} alt={data.logo_text} className="h-8 mb-4" /> : <h3 className="text-xl font-bold">{data.logo_text}</h3>}
            <p className="text-gray-400 mt-2">{data.description}</p>
          </div>
          {data.columns?.map((col: any, i: number) => (
            <div key={i}>
              <h4 className="font-semibold mb-4">{col.title}</h4>
              {col.links?.map((link: any, j: number) => (
                <a key={j} href={link.href} className="block text-gray-400 hover:text-white">{link.text}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          {data.copyright}
        </div>
      </div>
    </footer>
  );
}

function LogoCarouselBlock({ data }: { data: any }) {
  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl text-center text-gray-500 mb-8">{data.title}</h2>
        <div className="flex justify-center gap-12 flex-wrap">
          {data.logos?.map((logo: any, i: number) => (
            <div key={i} className="h-12 flex items-center">
              <span className="text-2xl font-bold text-gray-400">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsBlock({ data }: { data: any }) {
  return (
    <section className="py-16 px-6 bg-purple-600">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {data.stats?.map((stat: any, i: number) => (
          <div key={i} className="text-center">
            <div className="text-4xl font-bold text-white">{stat.value}</div>
            <div className="text-purple-200">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactBlock({ data }: { data: any }) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{data.title}</h2>
        <p className="text-gray-600 mb-8">{data.subtitle}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="text-gray-900 font-medium">{data.email}</div>
            <div className="text-gray-500">Email</div>
          </div>
          <div>
            <div className="text-gray-900 font-medium">{data.phone}</div>
            <div className="text-gray-500">Phone</div>
          </div>
          <div>
            <div className="text-gray-900 font-medium">{data.address}</div>
            <div className="text-gray-500">Address</div>
          </div>
        </div>
        {data.form_enabled && (
          <form className="max-w-md mx-auto space-y-4">
            <input type="text" placeholder="Name" className="w-full px-4 py-3 border rounded-lg" />
            <input type="email" placeholder="Email" className="w-full px-4 py-3 border rounded-lg" />
            <textarea placeholder="Message" rows={4} className="w-full px-4 py-3 border rounded-lg" />
            <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold">Send Message</button>
          </form>
        )}
      </div>
    </section>
  );
}