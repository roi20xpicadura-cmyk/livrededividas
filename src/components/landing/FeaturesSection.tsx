import { BarChart3, FileText, Target, CreditCard, PiggyBank, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: BarChart3,
    title: 'Lançamentos inteligentes',
    desc: 'Separe receitas e despesas entre pessoal e negócio com um clique. Categorias automáticas, filtros avançados e histórico completo.',
    large: true,
    preview: (
      <div className="mt-4 space-y-2">
        {[
          { desc: 'Vendas Shopify', cat: 'Vendas', type: 'Receita', val: 'R$ 4.200', color: 'bg-primary/10 text-primary' },
          { desc: 'Facebook Ads', cat: 'Marketing', type: 'Despesa', val: '-R$ 890', color: 'bg-destructive/10 text-destructive' },
          { desc: 'Freelance Design', cat: 'Freelance', type: 'Receita', val: 'R$ 1.500', color: 'bg-primary/10 text-primary' },
        ].map((t) => (
          <div key={t.desc} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-background/50 text-[11px]">
            <span className="font-medium text-foreground">{t.desc}</span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${t.color}`}>{t.cat}</span>
              <span className={`font-bold tabular-nums ${t.val.startsWith('-') ? 'text-destructive' : 'text-primary'}`}>{t.val}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: FileText,
    title: 'DRE em tempo real',
    desc: 'Demonstrativo gerado automaticamente a partir dos seus dados.',
    large: false,
    preview: (
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="text-primary font-bold">
          <div>Receitas</div>
          <div className="text-base font-black mt-0.5">R$ 28.900</div>
        </div>
        <div className="text-destructive font-bold">
          <div>Despesas</div>
          <div className="text-base font-black mt-0.5">R$ 16.450</div>
        </div>
      </div>
    ),
  },
  {
    icon: Target,
    title: 'Metas visuais',
    desc: 'Defina objetivos e veja seu progresso com barras animadas.',
    large: false,
    preview: (
      <div className="mt-3 space-y-2">
        {[
          { name: 'Reserva', pct: 72 },
          { name: 'Carro novo', pct: 45 },
        ].map((g) => (
          <div key={g.name} className="text-[10px]">
            <div className="flex justify-between font-semibold text-foreground mb-0.5">
              <span>{g.name}</span>
              <span>{g.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-fin-green-pale">
              <div className="h-full rounded-full bg-primary" style={{ width: `${g.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: PiggyBank,
    title: 'Carteira de investimentos',
    desc: 'Acompanhe renda fixa, variável, cripto e fundos. Veja sua rentabilidade em tempo real.',
    large: true,
    preview: (
      <div className="mt-4 space-y-1.5">
        {[
          { name: 'Tesouro Selic', val: 'R$ 15.200', ret: '+8.2%' },
          { name: 'PETR4', val: 'R$ 8.450', ret: '+12.4%' },
          { name: 'Bitcoin', val: 'R$ 3.200', ret: '-2.1%' },
        ].map((inv) => (
          <div key={inv.name} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-background/50 text-[11px]">
            <span className="font-medium text-foreground">{inv.name}</span>
            <div className="flex items-center gap-3">
              <span className="font-bold tabular-nums text-foreground">{inv.val}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${inv.ret.startsWith('-') ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                {inv.ret}
              </span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: CreditCard,
    title: 'Cartões de crédito',
    desc: 'Visualize limite, gasto e vencimento de todos os seus cartões.',
    large: false,
  },
  {
    icon: Download,
    title: 'Relatórios e exportação',
    desc: 'CSV, JSON, DRE em PDF e relatório por WhatsApp.',
    large: false,
  },
];

export default function FeaturesSection() {
  return (
    <section id="recursos" className="py-20 md:py-24 px-4 bg-card">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[clamp(28px,4vw,40px)] font-black text-fin-green-dark text-center tracking-tight"
        >
          Tudo que você precisa, nada do que não precisa
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-base text-muted text-center mt-3 mb-14"
        >
          Construído para empreendedores que levam finanças a sério.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={`bg-card border-[1.5px] border-border rounded-[20px] p-7 hover:border-fin-green-light hover:-translate-y-[3px] transition-all duration-300 ${
                f.large ? 'md:col-span-2' : ''
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-fin-green-pale border border-fin-green-border flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-extrabold text-fin-green-dark mt-4">{f.title}</h3>
              <p className="text-sm text-muted mt-2 leading-[1.7]">{f.desc}</p>
              {f.preview}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
