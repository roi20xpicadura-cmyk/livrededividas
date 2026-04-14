import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Search, PenLine, Trash2, Package, Ban, Info, Lock, Undo2, Mail } from 'lucide-react';

const rights = [
  { icon: Search, title: 'Acesso', desc: 'Ver todos os dados que temos sobre você' },
  { icon: PenLine, title: 'Correção', desc: 'Corrigir dados incorretos ou desatualizados' },
  { icon: Trash2, title: 'Eliminação', desc: 'Solicitar a exclusão dos seus dados' },
  { icon: Package, title: 'Portabilidade', desc: 'Exportar seus dados em formato legível' },
  { icon: Ban, title: 'Oposição', desc: 'Opor-se ao tratamento em certas situações' },
  { icon: Info, title: 'Informação', desc: 'Saber com quem compartilhamos seus dados' },
  { icon: Lock, title: 'Limitação', desc: 'Restringir o tratamento dos seus dados' },
  { icon: Undo2, title: 'Revogação', desc: 'Retirar o consentimento a qualquer momento' },
];

const steps = [
  { n: '1', text: 'Envie e-mail para privacidade@findashpro.com.br' },
  { n: '2', text: 'Identifique-se com o e-mail cadastrado' },
  { n: '3', text: 'Descreva o direito que deseja exercer' },
  { n: '4', text: 'Respondemos em até 15 dias úteis' },
];

export default function LGPDPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-base)' }}>
      <Navbar />
      <div className="max-w-[760px] mx-auto px-6 pt-[60px] pb-[80px]">
        <p className="text-[11px] font-extrabold tracking-[1.5px] uppercase mb-3" style={{ color: 'var(--color-green-600)' }}>LGPD</p>
        <h1 className="font-black tracking-[-0.8px] mb-2" style={{ fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--color-text-strong)' }}>Seus Direitos — LGPD</h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--color-text-muted)', lineHeight: 1.8 }}>Entenda como protegemos seus dados e como exercer seus direitos</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {rights.map(r => (
            <div key={r.title} className="p-5 rounded-xl border transition-all hover:shadow-md" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-weak)' }}>
              <r.icon size={22} style={{ color: 'var(--color-green-600)' }} className="mb-3" />
              <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--color-text-base)' }}>{r.title}</p>
              <p className="text-[14px]" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{r.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-[20px] font-extrabold mb-6" style={{ color: 'var(--color-text-strong)' }}>Como exercer seus direitos</h2>
        <div className="space-y-4 mb-12">
          {steps.map(s => (
            <div key={s.n} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0" style={{ background: 'var(--color-green-50)', color: 'var(--color-green-700)' }}>{s.n}</div>
              <p className="text-[15px] pt-1" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{s.text}</p>
            </div>
          ))}
        </div>

        <div className="p-6 rounded-xl border" style={{ background: 'var(--color-bg-sunken)', borderColor: 'var(--color-border-weak)' }}>
          <div className="flex items-center gap-3 mb-3">
            <Mail size={20} style={{ color: 'var(--color-green-600)' }} />
            <p className="text-[15px] font-bold" style={{ color: 'var(--color-text-base)' }}>Encarregado de Proteção de Dados (DPO)</p>
          </div>
          <p className="text-[14px]" style={{ color: 'var(--color-text-muted)' }}>Email: <a href="mailto:privacidade@findashpro.com.br" className="underline" style={{ color: 'var(--color-green-600)' }}>privacidade@findashpro.com.br</a></p>
          <p className="text-[13px] mt-2" style={{ color: 'var(--color-text-subtle)' }}>Você também pode contatar a ANPD (Autoridade Nacional de Proteção de Dados) em <a href="https://gov.br/anpd" target="_blank" rel="noreferrer" className="underline">gov.br/anpd</a></p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
