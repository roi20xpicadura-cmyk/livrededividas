import { Suspense } from 'react';
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import TrustStrip from '@/components/landing/TrustStrip';
import SEO from '@/components/SEO';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { PLAN_BENEFITS } from '@/lib/plans';

// Lazy-load below-the-fold sections
const MetricsSection = lazy(() => import('@/components/landing/MetricsSection'));
const FeaturesSection = lazy(() => import('@/components/landing/FeaturesSection'));
const WhatsAppSection = lazy(() => import('@/components/landing/WhatsAppSection'));
const LiveDemoSection = lazy(() => import('@/components/landing/demo/LiveDemoSection'));
const UseCasesSection = lazy(() => import('@/components/landing/UseCasesSection'));
const HowItWorks = lazy(() => import('@/components/landing/HowItWorks'));
const ComparisonSection = lazy(() => import('@/components/landing/ComparisonSection'));
const PricingSection = lazy(() => import('@/components/landing/PricingSection'));
const TestimonialsSection = lazy(() => import('@/components/landing/TestimonialsSection'));
const SecuritySection = lazy(() => import('@/components/landing/SecuritySection'));
const FAQSection = lazy(() => import('@/components/landing/FAQSection'));
const CTASection = lazy(() => import('@/components/landing/CTASection'));
const Footer = lazy(() => import('@/components/landing/Footer'));

function SectionFallback() {
  return <div className="py-20" />;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Controle total das suas finanças — pessoal e negócio"
        description="O painel financeiro mais completo do Brasil. Controle pessoal e empresarial, DRE automático, IA financeira e conexão bancária via Open Finance. Grátis para começar."
        url="https://korafinance.com.br"
      />
      <Navbar />
      <HeroSection />
      <TrustStrip />
      <Suspense fallback={<SectionFallback />}>
        <MetricsSection />
        <FeaturesSection />
        <WhatsAppSection />
        <LiveDemoSection />
        <UseCasesSection />
        <HowItWorks />
        <ComparisonSection />
        <TestimonialsSection />
        <PricingSection />
        <SecuritySection />
        <FAQSection />
        <CTASection />
        <Footer />
      </Suspense>
    </div>
  );
}

// Reusable pricing cards component — espelha o visual da PricingSection da landing
export function PricingCards({ currentPlan, onUpgrade, compact }: { currentPlan?: string; onUpgrade?: (plan: string) => void; compact?: boolean }) {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Free', price: 0, priceAnnual: 0, sub: PLAN_BENEFITS.free.tagline,
      features: PLAN_BENEFITS.free.items,
      cta: 'Começar grátis', href: '/register', featured: false, dark: false,
    },
    {
      name: 'Pro', price: 19.90, priceAnnual: 15.90, sub: PLAN_BENEFITS.pro.tagline,
      features: PLAN_BENEFITS.pro.items,
      cta: 'Assinar Pro →', href: '/register', featured: true, dark: false,
    },
    {
      name: 'Business', price: 59.90, priceAnnual: 47.90, sub: PLAN_BENEFITS.business.tagline,
      features: PLAN_BENEFITS.business.items,
      cta: 'Assinar Business', href: '/register', featured: false, dark: true,
    },
  ];

  // Em modo compact (dentro do app) usamos paddings/escala um pouco menores,
  // mas mantemos a mesma estrutura visual da landing.
  const cardPad = compact ? 'p-5 md:p-6' : 'p-6 md:p-8';
  const titleSize = compact ? 'text-[13px]' : 'text-[13px] md:text-[14px]';
  const priceSize = compact ? 'text-[32px] md:text-[36px]' : 'text-[40px] md:text-[48px]';
  const featuredScale = compact ? '' : 'md:scale-[1.04]';
  const ctaPad = compact ? 'py-2.5 md:py-3' : 'py-3 md:py-3.5';

  return (
    <div>
      {/* Toggle Mensal/Anual */}
      <div className={`flex items-center justify-center gap-3 ${compact ? 'mb-6' : 'mb-8 md:mb-12'}`}>
        <span className={`text-[13px] md:text-[14px] font-semibold transition-colors ${!annual ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>Mensal</span>
        <button onClick={() => setAnnual(!annual)} className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${annual ? 'bg-[#7C3AED]' : 'bg-[#e2e8f0]'}`}>
          <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 shadow-sm ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
        <span className={`text-[13px] md:text-[14px] font-semibold transition-colors ${annual ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>Anual</span>
        {annual && <span className="text-[10px] md:text-[11px] font-bold text-[#854d0e] bg-[#fef9c3] px-2 py-0.5 rounded-full">-20%</span>}
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch`}>
        {plans.map(p => {
          const isCurrent = currentPlan === p.name.toLowerCase();
          const price = annual ? p.priceAnnual : p.price;
          return (
            <div
              key={p.name}
              className={`relative rounded-[16px] md:rounded-[20px] ${cardPad} flex flex-col h-full ${
                p.dark
                  ? 'bg-[#0f172a] text-white'
                  : p.featured
                  ? `bg-white border-2 border-[#7C3AED] ${featuredScale}`
                  : 'bg-white border border-[#e2e8f0]'
              }`}
              style={p.featured ? { boxShadow: '0 20px 60px rgba(124, 58, 237,0.15)' } : {}}
            >
              {p.featured && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#7C3AED] text-white text-[11px] md:text-[12px] font-bold whitespace-nowrap"
                  style={{ boxShadow: '0 4px 12px rgba(124, 58, 237,0.3)' }}
                >
                  Mais popular
                </span>
              )}

              <div className={`${titleSize} font-semibold ${p.dark ? 'text-white/70' : 'text-[#64748b]'}`}>{p.name}</div>
              <div className="mt-2 mb-1">
                <span className={`${priceSize} font-[900] ${p.dark ? 'text-white' : 'text-[#0f172a]'}`}>
                  {price === 0 ? 'Grátis' : `R$ ${price.toFixed(2).replace('.', ',')}`}
                </span>
                {price > 0 && <span className={`text-[13px] md:text-[14px] ${p.dark ? 'text-white/50' : 'text-[#94a3b8]'}`}>/mês</span>}
              </div>
              {annual && price > 0 && (
                <div className="text-[11px] text-[#7C3AED] font-semibold bg-[#F5F3FF] inline-block px-2 py-0.5 rounded-full mb-1">
                  Economize R$ {((p.price - p.priceAnnual) * 12).toFixed(2).replace('.', ',')}/ano
                </div>
              )}
              <p className={`text-[12px] md:text-[13px] mb-5 md:mb-6 ${p.dark ? 'text-white/50' : 'text-[#94a3b8]'}`}>{p.sub}</p>

              <div className={`border-t mb-5 md:mb-6 ${p.dark ? 'border-white/10' : 'border-[#f1f5f9]'}`} />

              <ul className="space-y-2.5 md:space-y-3 mb-6 md:mb-8 flex-1">
                {p.features.map(f => (
                  <li key={f.label} className="flex items-center gap-2 text-[12px] md:text-[13px]">
                    {f.included ? (
                      <div className="w-4 h-4 rounded-full bg-[#7C3AED]/15 flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-[#7C3AED]" />
                      </div>
                    ) : (
                      <X className="w-4 h-4 text-[#cbd5e1] flex-shrink-0" />
                    )}
                    <span className={f.included ? (p.dark ? 'text-white/70' : 'text-[#0f172a]') : 'text-[#cbd5e1] line-through'}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className={`block w-full ${ctaPad} rounded-[10px] md:rounded-[12px] text-[14px] md:text-[15px] font-[800] text-center mt-auto bg-[#F5F3FF] text-[#7C3AED]`}>
                  Plano atual
                </div>
              ) : onUpgrade ? (
                <button
                  onClick={() => onUpgrade(p.name.toLowerCase())}
                  className={`block w-full ${ctaPad} rounded-[10px] md:rounded-[12px] text-[14px] md:text-[15px] font-[800] text-center transition-all duration-200 mt-auto ${
                    p.dark
                      ? 'bg-white text-[#0f172a] hover:bg-[#f1f5f9]'
                      : p.featured
                      ? 'bg-[#7C3AED] text-white hover:bg-[#1A0D35]'
                      : 'bg-white border-[1.5px] border-[#e2e8f0] text-[#0f172a] hover:border-[#7C3AED] hover:text-[#7C3AED]'
                  }`}
                  style={p.featured ? { boxShadow: '0 8px 24px rgba(124, 58, 237,0.35)' } : {}}
                >
                  {p.cta}
                </button>
              ) : (
                <Link
                  to={p.href}
                  className={`block w-full ${ctaPad} rounded-[10px] md:rounded-[12px] text-[14px] md:text-[15px] font-[800] text-center transition-all duration-200 mt-auto ${
                    p.dark
                      ? 'bg-white text-[#0f172a] hover:bg-[#f1f5f9]'
                      : p.featured
                      ? 'bg-[#7C3AED] text-white hover:bg-[#1A0D35]'
                      : 'bg-white border-[1.5px] border-[#e2e8f0] text-[#0f172a] hover:border-[#7C3AED] hover:text-[#7C3AED]'
                  }`}
                  style={p.featured ? { boxShadow: '0 8px 24px rgba(124, 58, 237,0.35)' } : {}}
                >
                  {p.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
