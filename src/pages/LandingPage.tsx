import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import TrustStrip from '@/components/landing/TrustStrip';
import FeaturesSection from '@/components/landing/FeaturesSection';
import MetricsSection from '@/components/landing/MetricsSection';
import HowItWorks from '@/components/landing/HowItWorks';
import PricingSection from '@/components/landing/PricingSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import FAQSection from '@/components/landing/FAQSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-card">
      <Navbar />
      <HeroSection />
      <TrustStrip />
      <FeaturesSection />
      <MetricsSection />
      <HowItWorks />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}

// Reusable pricing cards component — kept here for import compatibility
export function PricingCards({ currentPlan, onUpgrade }: { currentPlan?: string; onUpgrade?: (plan: string) => void }) {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Free', price: 0, priceAnnual: 0, badge: null,
      features: ['Até 50 lançamentos/mês', '2 metas ativas', '1 cartão de crédito', '2 investimentos', 'Suporte por e-mail'],
      excluded: ['DRE', 'Exportação', 'Gráficos avançados'],
      cta: 'Começar grátis', href: '/register', dark: false,
    },
    {
      name: 'Pro', price: 29, priceAnnual: 23, badge: 'Mais popular',
      features: ['Lançamentos ilimitados', 'Metas ilimitadas', 'Cartões ilimitados', 'Investimentos ilimitados', 'DRE completo', 'Exportação CSV + JSON', 'Gráficos avançados', 'Suporte prioritário'],
      excluded: [],
      cta: 'Assinar Pro', href: '/register', dark: false,
    },
    {
      name: 'Business', price: 79, priceAnnual: 63, badge: null,
      features: ['Tudo do Pro', 'Multi-empresa (até 3)', 'Relatórios personalizados', 'API access', 'Onboarding personalizado', 'Suporte via WhatsApp'],
      excluded: [],
      cta: 'Assinar Business', href: '/register', dark: true,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm font-semibold ${!annual ? 'text-foreground' : 'text-muted'}`}>Mensal</span>
        <button onClick={() => setAnnual(!annual)} className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${annual ? 'bg-primary' : 'bg-border'}`}>
          <div className={`w-5 h-5 rounded-full bg-card absolute top-0.5 transition-transform duration-200 ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
        <span className={`text-sm font-semibold ${annual ? 'text-foreground' : 'text-muted'}`}>Anual</span>
        {annual && <span className="text-xs font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">Economize 20%</span>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {plans.map(p => {
          const isCurrent = currentPlan === p.name.toLowerCase();
          const price = annual ? p.priceAnnual : p.price;
          const isPro = p.name === 'Pro';
          return (
            <div
              key={p.name}
              className={`relative rounded-[20px] p-7 transition-all duration-200 ${
                p.dark
                  ? 'bg-[#0f172a] text-white border-[1.5px] border-[#1e293b]'
                  : isPro
                  ? 'bg-card border-2 border-primary scale-[1.02]'
                  : 'bg-card border-[1.5px] border-border'
              }`}
            >
              {isPro && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-extrabold">
                  Mais popular
                </span>
              )}
              <h3 className={`font-extrabold text-lg ${p.dark ? 'text-white' : 'text-foreground'}`}>{p.name}</h3>
              <div className="mt-2 mb-5">
                <span className={`text-3xl font-black ${p.dark ? 'text-white' : isPro ? 'text-primary' : 'text-foreground'}`}>
                  {price === 0 ? 'Grátis' : `R$ ${price}`}
                </span>
                {price > 0 && <span className={`text-sm ${p.dark ? 'text-[#94a3b8]' : 'text-muted'}`}>/mês</span>}
              </div>
              <ul className="space-y-2.5 mb-7">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px] leading-[1.8]">
                    <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <span className={p.dark ? 'text-[#cbd5e1]' : 'text-foreground'}>{f}</span>
                  </li>
                ))}
                {p.excluded.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px] text-muted line-through">{f}</li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="w-full py-3 rounded-[9px] bg-fin-green-pale text-primary text-sm font-bold text-center">Plano atual</div>
              ) : onUpgrade ? (
                <button onClick={() => onUpgrade(p.name.toLowerCase())} className={`w-full py-3 rounded-[9px] text-sm font-extrabold transition-all duration-200 ${
                  p.dark ? 'bg-white text-[#0f172a] hover:bg-[#f1f5f9]' : 'bg-primary text-primary-foreground hover:bg-fin-green-dark'
                }`}>
                  {p.cta}
                </button>
              ) : (
                <Link to={p.href} className={`block w-full py-3 rounded-[9px] text-sm font-extrabold text-center transition-all duration-200 ${
                  p.dark ? 'bg-white text-[#0f172a] hover:bg-[#f1f5f9]' : 'bg-primary text-primary-foreground hover:bg-fin-green-dark'
                }`}>
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
