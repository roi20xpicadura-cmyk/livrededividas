import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  { q: 'O plano gratuito tem limite de uso?', a: 'Sim. No plano Free você pode adicionar até 50 lançamentos por mês, 2 metas e 1 cartão de crédito. É suficiente para testar o app antes de fazer upgrade.' },
  { q: 'Como funciona a IA Financeira?', a: 'A IA analisa seus dados reais e responde perguntas como "quanto gastei em delivery este mês?" ou "quando vou quitar minha dívida?". Ela usa modelos avançados — a mesma IA das empresas da Fortune 500.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. Sem fidelidade, sem multa. Cancele pelo painel em menos de 1 minuto. Você mantém o acesso até o fim do período pago.' },
  { q: 'O app funciona no celular?', a: 'Sim. O FinDash Pro é um PWA — funciona no iPhone e Android igual a um app nativo, sem precisar instalar pela App Store. Basta acessar no navegador e adicionar à tela inicial.' },
  { q: 'Meus dados financeiros ficam seguros?', a: 'Seus dados são criptografados com TLS 1.3, armazenados com Row Level Security e backups diários. Seguimos a LGPD e nunca vendemos seus dados para terceiros.' },
  { q: 'Funciona para empresas e para uso pessoal?', a: 'Sim. Você pode usar para sua vida pessoal, para seu negócio ou para os dois juntos — com separação completa dos dados. É o único app financeiro brasileiro que resolve os dois cenários em um só lugar.' },
  { q: 'Como importo dados do meu banco?', a: 'Você exporta o extrato do seu banco em formato OFX (todos os bancos suportam) e faz o upload no app. A IA categoriza tudo automaticamente. Em breve teremos conexão automática via Open Finance.' },
  { q: 'Vocês têm suporte?', a: 'Sim. Chat ao vivo dentro do app, e-mail e base de conhecimento. Planos Pro e Business têm tempo de resposta prioritário.' },
];

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05, duration: 0.4 }} className="border-b border-[#f1f5f9]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left">
        <span className="text-[16px] font-semibold text-[#0f172a] pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-[#94a3b8] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <p className="pb-5 text-[15px] text-[#64748b] leading-[1.7]">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQSection() {
  const half = Math.ceil(faqs.length / 2);
  return (
    <section id="faq" className="py-20 md:py-28 px-4 bg-white">
      <div className="max-w-[1000px] mx-auto">
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-[clamp(28px,4vw,48px)] font-[900] text-[#0f172a] tracking-[-2px] text-center mb-14">
          Perguntas frequentes
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>{faqs.slice(0, half).map((f, i) => <FAQItem key={i} q={f.q} a={f.a} index={i} />)}</div>
          <div>{faqs.slice(half).map((f, i) => <FAQItem key={i} q={f.q} a={f.a} index={half + i} />)}</div>
        </div>
      </div>
    </section>
  );
}
