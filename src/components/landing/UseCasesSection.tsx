import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Briefcase, Check, ArrowRight } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1];

export default function UseCasesSection() {
  return (
    <section className="py-20 md:py-28 px-4 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[clamp(28px,4vw,48px)] font-[900] text-[#0f172a] tracking-[-2px] text-center mb-14"
        >
          Feito para você.
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[24px] p-8 md:p-10"
          >
            <div className="w-12 h-12 rounded-full bg-[#16a34a] flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] font-[700] text-[#16a34a] bg-white px-3 py-1 rounded-full border border-[#bbf7d0]">Vida Pessoal</span>
            <h3 className="text-[24px] md:text-[32px] font-[800] text-[#0f172a] mt-4 mb-5 tracking-[-0.5px]">
              Quer organizar sua vida financeira?
            </h3>
            <ul className="space-y-3 mb-8">
              {['Controle de gastos diários', 'Metas de curto e longo prazo', 'Sair das dívidas mais rápido', 'Score de saúde financeira', 'Relatório mensal inteligente', 'Orçamento por categoria'].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-[14px] text-[#0f172a]">
                  <Check className="w-4 h-4 text-[#16a34a] flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link to="/register" className="w-full h-12 rounded-[12px] bg-[#16a34a] text-white font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-[#14532d] transition-colors">
              Começar agora <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5, ease }}
            className="bg-[#0f172a] rounded-[24px] p-8 md:p-10"
          >
            <div className="w-12 h-12 rounded-full bg-[#1e3a1e] flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] font-[700] text-[#0f172a] bg-white px-3 py-1 rounded-full">Meu Negócio</span>
            <h3 className="text-[24px] md:text-[32px] font-[800] text-white mt-4 mb-5 tracking-[-0.5px]">
              Quer escalar seu negócio?
            </h3>
            <ul className="space-y-3 mb-8">
              {['DRE automático todo mês', 'Importar vendas de Hotmart, Shopify...', 'Separar pessoal e empresarial', 'Fluxo de caixa projetado', 'Relatório para contador em PDF', 'Multi-empresa no mesmo painel'].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-[14px] text-white/70">
                  <Check className="w-4 h-4 text-[#4ade80] flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link to="/register" className="w-full h-12 rounded-[12px] bg-white text-[#0f172a] font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] transition-colors">
              Testar grátis <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
