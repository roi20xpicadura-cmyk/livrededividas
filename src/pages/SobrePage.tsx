import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { BarChart3, Target, Shield, Heart } from 'lucide-react';

export default function SobrePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-base)' }}>
      <Navbar />
      <div className="max-w-[760px] mx-auto px-6 pt-[60px] pb-[80px]">
        <p className="text-[11px] font-extrabold tracking-[1.5px] uppercase mb-3" style={{ color: 'var(--color-green-600)' }}>SOBRE</p>
        <h1 className="font-black tracking-[-0.8px] mb-4" style={{ fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--color-text-strong)' }}>Sobre o FinDash Pro</h1>

        <p className="text-[15px] mb-6" style={{ color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
          O FinDash Pro nasceu da necessidade de um painel financeiro completo, bonito e intuitivo para brasileiros que levam dinheiro a sério. Acreditamos que o controle financeiro deve ser acessível, poderoso e — por que não — prazeroso.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {[
            { icon: BarChart3, title: 'Visão completa', desc: 'Receitas, despesas, metas, dívidas, cartões e investimentos em um só lugar.' },
            { icon: Target, title: 'Orientado a metas', desc: 'Defina objetivos financeiros e acompanhe seu progresso em tempo real.' },
            { icon: Shield, title: 'Privacidade primeiro', desc: 'Seus dados são seus. Criptografia, RLS e compliance total com a LGPD.' },
            { icon: Heart, title: 'Feito no Brasil', desc: 'Pensado para a realidade brasileira: R$, PIX, cartões nacionais e LGPD.' },
          ].map(v => (
            <div key={v.title} className="p-5 rounded-xl border" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-weak)' }}>
              <v.icon size={22} style={{ color: 'var(--color-green-600)' }} className="mb-3" />
              <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--color-text-base)' }}>{v.title}</p>
              <p className="text-[13px]" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="p-6 rounded-xl" style={{ background: 'var(--color-bg-sunken)' }}>
          <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--color-text-base)' }}>Contato</p>
          <p className="text-[14px]" style={{ color: 'var(--color-text-muted)' }}>E-mail: <a href="mailto:contato@findashpro.com.br" className="underline" style={{ color: 'var(--color-green-600)' }}>contato@findashpro.com.br</a></p>
          <p className="text-[13px] mt-2" style={{ color: 'var(--color-text-subtle)' }}>© 2026 FinDash Pro. Todos os direitos reservados. Made with 💚 no Brasil</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
