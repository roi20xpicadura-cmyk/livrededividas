import { Link } from 'react-router-dom';
import { BarChart3, Target, CreditCard, PiggyBank, FileText, Download, Check, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const features = [
  { icon: BarChart3, title: 'Lançamentos completos', desc: 'Separe receitas e despesas entre pessoal e negócio automaticamente.' },
  { icon: FileText, title: 'DRE automático', desc: 'Demonstrativo de resultado gerado em tempo real a partir dos seus dados.' },
  { icon: Target, title: 'Controle de metas', desc: 'Acompanhe sua poupança e objetivos financeiros dia a dia.' },
  { icon: CreditCard, title: 'Cartões de crédito', desc: 'Visualize limite, utilização e vencimento de todos os seus cartões.' },
  { icon: PiggyBank, title: 'Carteira de investimentos', desc: 'Acompanhe seu patrimônio e rentabilidade em tempo real.' },
  { icon: Download, title: 'Relatórios e exportação', desc: 'Exporte seus dados em CSV, JSON e imprima relatórios.' },
];

const steps = [
  { num: '1', title: 'Crie sua conta grátis', desc: 'Em 30 segundos, sem cartão de crédito.' },
  { num: '2', title: 'Adicione seus lançamentos', desc: 'Configure suas metas e categorias personalizadas.' },
  { num: '3', title: 'Acompanhe seu crescimento', desc: 'Veja seus resultados financeiros em tempo real.' },
];

const testimonials = [
  { name: 'Ana Silva', role: 'E-commerce Owner', quote: 'O FinDash Pro mudou completamente minha visão financeira. Consigo ver exatamente para onde vai cada centavo.' },
  { name: 'Carlos Santos', role: 'Freelancer', quote: 'Finalmente um painel que separa pessoal de negócio. Indispensável para quem é PJ.' },
  { name: 'Marina Oliveira', role: 'Empreendedora', quote: 'A funcionalidade de metas me motivou a guardar mais. Já alcancei 3 objetivos financeiros!' },
];

const faqs = [
  { q: 'O plano gratuito é realmente grátis?', a: 'Sim! O plano Free é gratuito para sempre, com limite de 50 lançamentos por mês.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem multas ou taxas de cancelamento. Sua conta volta ao plano Free.' },
  { q: 'Meus dados estão seguros?', a: 'Usamos criptografia de ponta a ponta e isolamento por usuário (RLS) no banco de dados.' },
  { q: 'Posso usar no celular?', a: 'Sim! O FinDash Pro é totalmente responsivo e funciona em qualquer dispositivo.' },
  { q: 'Vocês oferecem suporte?', a: 'Sim! Suporte por e-mail no plano Free, prioritário no Pro e via WhatsApp no Business.' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-card border-b-2 border-primary">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-black text-foreground">FinDash Pro</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted">
            <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#precos" className="hover:text-foreground transition-colors">Preços</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-muted hover:text-foreground transition-colors">Entrar</Link>
            <Link to="/register" className="px-4 py-2 rounded-[9px] bg-primary text-primary-foreground text-sm font-extrabold hover:brightness-110 transition-all">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-[56px] font-black text-fin-green-dark leading-tight tracking-tight">
            Controle total das suas finanças — pessoal e negócio
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mt-6 text-lg text-muted max-w-2xl mx-auto">
            O painel financeiro mais completo do Brasil. Lançamentos, metas, DRE, investimentos e cartões — tudo em um só lugar.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="px-8 py-3 rounded-[9px] bg-primary text-primary-foreground text-sm font-extrabold hover:brightness-110 transition-all">
              Começar grátis
            </Link>
            <Link to="/pricing" className="px-8 py-3 rounded-[9px] border-[1.5px] border-border text-foreground text-sm font-extrabold hover:border-fin-green-light transition-all">
              Ver preços
            </Link>
          </motion.div>
          <p className="mt-6 text-xs text-muted">Usado por +2.000 empreendedores brasileiros</p>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="py-20 px-4 bg-fin-green-pale">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-fin-green-dark text-center mb-12">Tudo que você precisa em um só lugar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="card-surface p-6">
                <div className="w-10 h-10 rounded-lg bg-fin-green-pale flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-fin-green" />
                </div>
                <h3 className="font-extrabold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-fin-green-dark text-center mb-12">Como funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-black text-lg flex items-center justify-center mx-auto mb-4">{s.num}</div>
                <h3 className="font-extrabold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="py-20 px-4 bg-fin-green-pale">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-fin-green-dark text-center mb-12">Planos e preços</h2>
          <PricingCards />
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-fin-green-dark text-center mb-12">O que nossos usuários dizem</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="card-surface p-6">
                <p className="text-sm text-muted mb-4 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-fin-green-pale flex items-center justify-center text-fin-green font-bold text-sm">{t.name[0]}</div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{t.name}</p>
                    <p className="text-xs text-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-fin-green-pale">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-fin-green-dark text-center mb-12">Perguntas frequentes</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="card-surface overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-foreground">
                  {f.q}
                  <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="px-4 pb-4 text-sm text-muted">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-4 bg-primary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-primary-foreground mb-4">Comece hoje. É grátis para sempre.</h2>
          <Link to="/register" className="inline-block px-8 py-3 rounded-[9px] bg-card text-foreground text-sm font-extrabold hover:scale-105 transition-transform">
            Criar conta grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">FinDash Pro</span>
          </div>
          <div className="flex gap-4">
            <Link to="/pricing" className="hover:text-foreground">Preços</Link>
            <span>Termos</span>
            <span>Privacidade</span>
          </div>
          <span>© 2025 FinDash Pro. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}

// Reusable pricing cards component
export function PricingCards({ currentPlan, onUpgrade }: { currentPlan?: string; onUpgrade?: (plan: string) => void }) {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Free', price: 0, priceAnnual: 0, badge: null,
      features: ['Até 50 lançamentos/mês', '2 metas ativas', '1 cartão de crédito', '2 investimentos', 'Suporte por e-mail'],
      excluded: ['DRE', 'Exportação', 'Gráficos avançados'],
      cta: 'Começar grátis', href: '/register',
    },
    {
      name: 'Pro', price: 29, priceAnnual: 23, badge: 'Mais popular',
      features: ['Lançamentos ilimitados', 'Metas ilimitadas', 'Cartões ilimitados', 'Investimentos ilimitados', 'DRE completo', 'Exportação CSV + JSON', 'Gráficos avançados', 'Suporte prioritário'],
      excluded: [],
      cta: 'Assinar Pro', href: '/register',
    },
    {
      name: 'Business', price: 79, priceAnnual: 63, badge: null,
      features: ['Tudo do Pro', 'Multi-empresa (até 3)', 'Relatórios personalizados', 'API access', 'Onboarding personalizado', 'Suporte via WhatsApp'],
      excluded: [],
      cta: 'Assinar Business', href: '/register',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={`text-sm font-semibold ${!annual ? 'text-foreground' : 'text-muted'}`}>Mensal</span>
        <button onClick={() => setAnnual(!annual)} className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${annual ? 'bg-primary' : 'bg-border'}`}>
          <div className={`w-5 h-5 rounded-full bg-card absolute top-0.5 transition-transform duration-200 ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
        <span className={`text-sm font-semibold ${annual ? 'text-foreground' : 'text-muted'}`}>Anual <span className="text-fin-green text-xs">-20%</span></span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(p => {
          const isCurrent = currentPlan === p.name.toLowerCase();
          const price = annual ? p.priceAnnual : p.price;
          return (
            <div key={p.name} className={`card-surface p-6 relative ${p.badge ? 'border-primary border-2' : ''}`}>
              {p.badge && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{p.badge}</span>}
              <h3 className="font-extrabold text-lg text-foreground">{p.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-black text-foreground">{price === 0 ? 'Grátis' : `R$ ${price}`}</span>
                {price > 0 && <span className="text-sm text-muted">/mês</span>}
              </div>
              <ul className="space-y-2 mb-6">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-foreground"><Check className="w-3.5 h-3.5 text-fin-green flex-shrink-0" />{f}</li>
                ))}
                {p.excluded.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted line-through">{f}</li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="w-full py-2.5 rounded-[9px] bg-fin-green-pale text-fin-green text-sm font-bold text-center">Plano atual</div>
              ) : onUpgrade ? (
                <button onClick={() => onUpgrade(p.name.toLowerCase())} className="w-full py-2.5 rounded-[9px] bg-primary text-primary-foreground text-sm font-extrabold hover:brightness-110 transition-all">
                  {p.cta}
                </button>
              ) : (
                <Link to={p.href} className="block w-full py-2.5 rounded-[9px] bg-primary text-primary-foreground text-sm font-extrabold hover:brightness-110 transition-all text-center">
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
