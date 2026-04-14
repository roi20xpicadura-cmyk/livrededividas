import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

const testimonials = [
  { quote: 'Finalmente encontrei algo que junta minha loja Hotmart com minhas finanças pessoais. Importei R$ 23.000 em vendas e já apareceu tudo organizado. Nunca mais vou usar planilha.', highlight: 'R$ 23.000 em vendas', name: 'Ana Beatriz M.', role: 'Produtora de Conteúdo, SP', gradient: 'from-[#16a34a] to-[#22c55e]' },
  { quote: 'O score financeiro mudou meu comportamento. Em 3 meses fui de 420 para 780 pontos e paguei R$ 12.000 em dívidas usando a estratégia snowball.', highlight: 'R$ 12.000 em dívidas', name: 'Carlos Eduardo S.', role: 'Empresário, RJ', gradient: 'from-[#2563eb] to-[#3b82f6]' },
  { quote: 'A IA me disse que gastei 40% a mais em delivery do que na semana anterior. Simples assim. Nenhum outro app me deu esse tipo de insight.', highlight: '40% a mais em delivery', name: 'Juliana R.', role: 'Engenheira, MG', gradient: 'from-[#7c3aed] to-[#8b5cf6]' },
  { quote: 'Uso para o pessoal e para o negócio. O DRE automático me poupa 4 horas por mês que eu gastava em planilha.', highlight: '4 horas por mês', name: 'Roberto A.', role: 'E-commerce, SC', gradient: 'from-[#f59e0b] to-[#fbbf24]' },
  { quote: 'Instalei como PWA no iPhone e parece app nativo. Design muito melhor que o Mobills e Organizze.', highlight: 'parece app nativo', name: 'Fernanda K.', role: 'Designer, SP', gradient: 'from-[#ef4444] to-[#f87171]' },
  { quote: 'Bati minha meta de reserva de emergência em 8 meses. O acompanhamento visual das metas me mantinha motivado todo dia.', highlight: '8 meses', name: 'Diego M.', role: 'Desenvolvedor, PR', gradient: 'from-[#0ea5e9] to-[#38bdf8]' },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 px-4 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-[clamp(28px,4vw,48px)] font-[900] text-[#0f172a] tracking-[-2px] text-center mb-14">
          Quem usa, não para.
        </motion.h2>
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {testimonials.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5, ease }} className="break-inside-avoid bg-white border border-[#e2e8f0] rounded-2xl p-6 hover:border-[#86efac] transition-colors duration-200">
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-[#f59e0b] text-[#f59e0b]" />)}
              </div>
              <p className="text-[15px] text-[#0f172a] leading-[1.7] mb-4">
                "{t.quote.split(t.highlight).map((part, pi) => (
                  <span key={pi}>{part}{pi < t.quote.split(t.highlight).length - 1 && <strong className="text-[#16a34a] font-bold">{t.highlight}</strong>}</span>
                ))}"
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-[12px] font-bold`}>
                  {t.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[#0f172a]">{t.name}</div>
                  <div className="text-[12px] text-[#94a3b8]">{t.role}</div>
                </div>
                <span className="ml-auto text-[11px] text-[#16a34a] font-medium">✓ Verificado</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
