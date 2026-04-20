import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Briefcase, Check, ArrowRight } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

export default function UseCasesSection() {
  return (
    <section className="py-16 md:py-28 px-4 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-[28px] md:text-[48px] font-[900] text-[#0f172a] tracking-[-1px] md:tracking-[-2px] text-center mb-10 md:mb-14">
          Feito para você.
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-stretch">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease }}
            className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-[20px] md:rounded-[24px] p-6 md:p-10 flex flex-col h-full">
            <div className="w-10 md:w-12 h-10 md:h-12 rounded-full bg-[#7C3AED] flex items-center justify-center mb-3 md:mb-4">
              <User className="w-5 md:w-6 h-5 md:h-6 text-white" />
            </div>
            <span className="self-start text-[10px] md:text-[11px] font-[700] text-[#7C3AED] bg-white px-3 py-1 rounded-full border border-[#DDD6FE]">Vida Pessoal</span>
            <h3 className="text-[22px] md:text-[32px] font-[800] text-[#0f172a] mt-3 md:mt-4 mb-4 md:mb-5 tracking-[-0.5px]">
              Quer organizar sua vida financeira?
            </h3>
            <ul className="space-y-2.5 md:space-y-3 mb-6 md:mb-8 flex-1">
              {['Controle de gastos diários', 'Metas de curto e longo prazo', 'Sair das dívidas mais rápido', 'Score de saúde financeira', 'Relatório mensal inteligente', 'Orçamento por categoria'].map(f => (
                <li key={f} className="flex items-center gap-2 text-[13px] md:text-[14px] text-[#0f172a]">
                  <Check className="w-4 h-4 text-[#7C3AED] flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link to="/register" className="w-full h-11 md:h-12 rounded-[10px] md:rounded-[12px] bg-[#7C3AED] text-white font-bold text-[14px] md:text-[15px] flex items-center justify-center gap-2 hover:bg-[#1A0D35] transition-colors">
              Começar agora <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.5, ease }}
            className="bg-[#0f172a] rounded-[20px] md:rounded-[24px] p-6 md:p-10 flex flex-col h-full">
            <div className="w-10 md:w-12 h-10 md:h-12 rounded-full bg-[#1e3a1e] flex items-center justify-center mb-3 md:mb-4">
              <Briefcase className="w-5 md:w-6 h-5 md:h-6 text-white" />
            </div>
            <span className="self-start text-[10px] md:text-[11px] font-[700] text-[#0f172a] bg-white px-3 py-1 rounded-full">Meu Negócio</span>
            <h3 className="text-[22px] md:text-[32px] font-[800] text-white mt-3 md:mt-4 mb-4 md:mb-5 tracking-[-0.5px]">
              Quer escalar seu negócio?
            </h3>
            <ul className="space-y-2.5 md:space-y-3 mb-6 md:mb-8 flex-1">
              {['DRE automático todo mês', 'Importar vendas de Hotmart, Shopify...', 'Separar pessoal e empresarial', 'Fluxo de caixa projetado', 'Relatório para contador em PDF', 'Multi-empresa no mesmo painel'].map(f => (
                <li key={f} className="flex items-center gap-2 text-[13px] md:text-[14px] text-white/70">
                  <Check className="w-4 h-4 text-[#4ade80] flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link to="/register" className="w-full h-11 md:h-12 rounded-[10px] md:rounded-[12px] bg-white text-[#0f172a] font-bold text-[14px] md:text-[15px] flex items-center justify-center gap-2 hover:bg-[#f1f5f9] transition-colors">
              Testar grátis <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
