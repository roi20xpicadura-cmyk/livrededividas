import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Lock, Shield, Key, HardDrive, AlertTriangle, CreditCard, Mail } from 'lucide-react';

const features = [
  { icon: Lock, title: 'Criptografia TLS 1.3', desc: 'Toda comunicação entre seu dispositivo e nossos servidores é criptografada com o padrão mais avançado disponível.' },
  { icon: Shield, title: 'Row Level Security', desc: 'Cada usuário só acessa os próprios dados. Nenhum funcionário ou sistema pode ver seus dados financeiros sem sua autorização.' },
  { icon: Key, title: 'Autenticação Segura', desc: 'Senhas nunca são armazenadas em texto puro. Utilizamos bcrypt com salt para hash seguro. Suporte a autenticação Google OAuth.' },
  { icon: HardDrive, title: 'Backups Diários', desc: 'Seus dados são copiados automaticamente todos os dias e armazenados de forma criptografada em múltiplas localizações.' },
  { icon: AlertTriangle, title: 'Monitoramento 24/7', desc: 'Nossos sistemas detectam e bloqueiam automaticamente tentativas de acesso suspeitas, IPs maliciosos e ataques de força bruta.' },
  { icon: CreditCard, title: 'Pagamentos via Stripe', desc: 'Não armazenamos dados de cartão de crédito. Todos os pagamentos são processados pelo Stripe, certificado PCI DSS nível 1.' },
];

export default function SegurancaPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-base)' }}>
      <Navbar />
      <div className="max-w-[760px] mx-auto px-6 pt-[60px] pb-[80px]">
        <p className="text-[11px] font-extrabold tracking-[1.5px] uppercase mb-3" style={{ color: 'var(--color-green-600)' }}>SEGURANÇA</p>
        <h1 className="font-black tracking-[-0.8px] mb-2" style={{ fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--color-text-strong)' }}>Segurança dos seus dados</h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--color-text-muted)', lineHeight: 1.8 }}>Como protegemos suas informações financeiras</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {features.map(f => (
            <div key={f.title} className="p-5 rounded-xl border transition-all hover:shadow-md" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-weak)' }}>
              <f.icon size={24} style={{ color: 'var(--color-green-600)' }} className="mb-3" />
              <p className="text-[15px] font-bold mb-2" style={{ color: 'var(--color-text-base)' }}>{f.title}</p>
              <p className="text-[13px]" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="p-6 rounded-xl border" style={{ background: 'var(--color-bg-sunken)', borderColor: 'var(--color-border-weak)' }}>
          <div className="flex items-center gap-3 mb-3">
            <Mail size={20} style={{ color: 'var(--color-green-600)' }} />
            <p className="text-[15px] font-bold" style={{ color: 'var(--color-text-base)' }}>Encontrou uma vulnerabilidade?</p>
          </div>
          <p className="text-[14px] mb-2" style={{ color: 'var(--color-text-muted)' }}>Agradecemos reports responsáveis de segurança. Entre em contato: <a href="mailto:seguranca@korafinance.com.br" className="underline" style={{ color: 'var(--color-green-600)' }}>seguranca@korafinance.com.br</a></p>
          <p className="text-[13px]" style={{ color: 'var(--color-text-subtle)' }}>Prometemos responder em até 48h e não entrar com ações legais contra pesquisadores de boa-fé.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
