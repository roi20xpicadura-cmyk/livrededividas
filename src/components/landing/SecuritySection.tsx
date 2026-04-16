import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const promises = [
  { icon: '🔐', title: 'Nunca pedimos sua senha do banco', desc: 'Você importa seu extrato manualmente. Nenhum acesso às suas credenciais bancárias.' },
  { icon: '🚫', title: 'Zero anúncios. Zero rastreamento.', desc: 'Você é nosso cliente, não nosso produto. Nunca vendemos seus dados para ninguém.' },
  { icon: '🗑️', title: 'Delete tudo em 1 clique', desc: 'Quer sair? Delete sua conta e todos os dados são apagados permanentemente em 30 dias.' },
  { icon: '🔒', title: 'Criptografia de nível bancário', desc: 'Todos os dados são criptografados com AES-256 — o mesmo padrão usado por bancos.' },
];

const comparison = [
  { practice: 'Pede senha do banco para integrar', others: 'bad', kora: 'good' },
  { practice: 'Vende dados para anunciantes', others: 'bad', kora: 'good' },
  { practice: 'Mostra anúncios no app', others: 'bad', kora: 'good' },
  { practice: 'Criptografia AES-256', others: 'sometimes', kora: 'good' },
  { practice: 'Delete de conta com apagamento total', others: 'sometimes', kora: 'good' },
  { practice: 'Conformidade com LGPD', others: 'sometimes', kora: 'good' },
  { practice: 'Sem rastreamento de terceiros', others: 'bad', kora: 'good' },
];

const badges = [
  { icon: '🇧🇷', text: 'LGPD Compliant' },
  { icon: '🔒', text: 'AES-256 Encryption' },
  { icon: '🚫', text: 'Sem anúncios' },
  { icon: '👤', text: 'Sem venda de dados' },
  { icon: '☁️', text: 'Supabase / AWS' },
  { icon: '🗑️', text: 'Direito ao esquecimento' },
];

export default function SecuritySection() {
  return (
    <section id="seguranca" className="py-24 px-4 bg-white">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] mb-5">
            <span>🛡️</span>
            <span className="text-[11px] font-extrabold tracking-[1.5px] uppercase text-[#5B21B6]">Segurança & Privacidade</span>
          </div>
          <h2 className="text-[clamp(28px,4vw,44px)] font-black tracking-[-0.03em] text-[#0f172a] mb-4 leading-[1.1]">
            Seus dados são seus.<br />
            <span className="text-[#7C3AED]">Sempre.</span>
          </h2>
          <p className="text-[15px] md:text-[16px] text-[#475569] max-w-[620px] mx-auto leading-[1.7]">
            Enquanto outros apps pedem sua senha do banco, o KoraFinance nunca precisa disso. Seus dados ficam com você.
          </p>
        </div>

        {/* Promise card */}
        <div className="relative rounded-[24px] bg-[#0a0f0a] p-8 md:p-10 mb-10 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#7C3AED]/20 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="text-[11px] font-extrabold tracking-[2px] uppercase text-[#4ade80] mb-6">Nossa promessa</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {promises.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-4 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]"
                >
                  <div className="text-3xl flex-shrink-0">{item.icon}</div>
                  <div>
                    <div className="text-[15px] font-extrabold text-white mb-1.5">{item.title}</div>
                    <div className="text-[13px] text-white/60 leading-[1.6]">{item.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison */}
        <div className="rounded-[20px] border border-[#e2e8f0] bg-white overflow-hidden mb-10">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] bg-[#f8fafc] border-b border-[#e2e8f0]">
            <div className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[1px] text-[#64748b]">Prática</div>
            <div className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[1px] text-[#64748b] text-center">Outros apps</div>
            <div className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[1px] text-[#7C3AED] text-center">⭐ KoraFinance</div>
          </div>
          {comparison.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1.5fr_1fr_1fr] items-center ${i < comparison.length - 1 ? 'border-b border-[#f1f5f9]' : ''}`}
            >
              <div className="px-4 py-3 text-[13px] font-medium text-[#0f172a]">{row.practice}</div>
              <div className="px-4 py-3 text-center">
                {row.others === 'bad' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fef2f2] text-[#dc2626] text-[11px] font-bold">
                    <X size={11} strokeWidth={3} /> Sim
                  </span>
                ) : (
                  <Check size={16} className="inline text-[#94a3b8]" />
                )}
              </div>
              <div className="px-4 py-3 text-center">
                {row.others === 'bad' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F3FF] text-[#7C3AED] text-[11px] font-bold">
                    <Check size={11} strokeWidth={3} /> Nunca
                  </span>
                ) : (
                  <Check size={16} className="inline text-[#7C3AED]" strokeWidth={3} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-2 justify-center">
          {badges.map((b, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-[12px] font-semibold text-[#475569]"
            >
              <span>{b.icon}</span>
              {b.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
