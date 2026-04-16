import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import SEO from '@/components/SEO';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const sections = [
  { emoji: '🤝', title: 'Você é nosso cliente, não nosso produto', text: 'O KoraFinance é pago. Isso significa que ganhamos dinheiro da sua assinatura, não dos seus dados. Nunca vendemos, alugamos ou compartilhamos suas informações financeiras com anunciantes ou terceiros.' },
  { emoji: '🔑', title: 'Nunca precisamos da sua senha do banco', text: 'Outros apps pedem sua senha bancária para "sincronizar automaticamente". Nós não fazemos isso. Você importa seu extrato manualmente (arquivo OFX ou CSV). É um passo extra, mas significa que suas credenciais bancárias nunca passam pelos nossos servidores.' },
  { emoji: '🗑️', title: 'Você pode ir embora quando quiser', text: 'Quer cancelar? Você pode deletar sua conta e todos os dados a qualquer momento, em 1 clique. Seus dados são apagados permanentemente em até 30 dias. Sem burocracia, sem "fale com um atendente".' },
  { emoji: '📥', title: 'Seus dados pertencem a você', text: 'Você pode exportar todos os seus dados a qualquer momento (formato JSON). Isso inclui todos os seus lançamentos, metas, orçamentos e configurações. Porque os dados que você inseriu são seus.' },
  { emoji: '🔒', title: 'Como protegemos seus dados', text: 'Todos os dados são criptografados com AES-256 — o mesmo padrão usado por bancos. A comunicação entre seu dispositivo e nossos servidores usa TLS 1.3. Nossos servidores ficam no Brasil (AWS São Paulo via Supabase).' },
  { emoji: '📋', title: 'O que coletamos e por quê', text: 'Coletamos: seu e-mail (para sua conta), seus lançamentos (para funcionar), dados de uso anônimos (para melhorar o app). Não coletamos: localização, contatos, câmera, ou qualquer dado que não seja necessário para o serviço.' },
];

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO title="Privacidade — Nossa promessa | KoraFinance" description="Seus dados são seus. Sempre. Nunca pedimos sua senha do banco, nunca vendemos dados para anunciantes." url="https://korafinance.com.br/privacidade" />
      <Navbar />
      <div className="max-w-[760px] mx-auto px-6 pt-16 pb-20">
        <div className="text-center mb-14">
          <div className="text-6xl mb-5">🛡️</div>
          <h1 className="text-[clamp(30px,5vw,44px)] font-black tracking-[-0.03em] text-[#0f172a] mb-3 leading-[1.1]">
            Nossa promessa de privacidade
          </h1>
          <p className="text-[15px] text-[#64748b]">
            Escrita em português de verdade, não em juridiquês.
          </p>
        </div>

        <div className="space-y-5">
          {sections.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex gap-4 p-6 rounded-2xl border border-[#e2e8f0] bg-white"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-2xl flex-shrink-0">
                {s.emoji}
              </div>
              <div>
                <h2 className="text-[17px] font-extrabold text-[#0f172a] mb-2 tracking-[-0.01em]">{s.title}</h2>
                <p className="text-[14px] text-[#475569] leading-[1.75]">{s.text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] text-center">
          <p className="text-[14px] text-[#475569] mb-2">
            Dúvidas sobre privacidade?{' '}
            <a href="mailto:privacidade@korafinance.com.br" className="text-[#7C3AED] font-semibold underline">
              privacidade@korafinance.com.br
            </a>
          </p>
          <p className="text-[12px] text-[#94a3b8]">
            Também temos uma{' '}
            <Link to="/politica-de-privacidade" className="underline">Política de Privacidade completa</Link>
            {' '}e uma página de{' '}
            <Link to="/seguranca" className="underline">Segurança</Link>.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
