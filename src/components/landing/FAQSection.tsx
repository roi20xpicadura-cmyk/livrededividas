import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';

const faqs = [
  { q: 'O plano gratuito é realmente grátis para sempre?', a: 'Sim. O plano Free não tem limite de tempo e não precisa de cartão de crédito. Você pode usar indefinidamente com até 50 lançamentos/mês.' },
  { q: 'Posso cancelar minha assinatura a qualquer momento?', a: 'Sim. Sem multa e sem burocracia. O acesso continua até o fim do período pago.' },
  { q: 'Meus dados financeiros estão seguros?', a: 'Todos os dados são criptografados com TLS 1.3 e armazenados em servidores seguros. Nunca compartilhamos suas informações.' },
  { q: 'Funciona bem no celular?', a: 'Sim. O FinDash Pro é 100% responsivo e funciona perfeitamente em smartphone e tablet.' },
  { q: 'Posso separar finanças pessoais das do negócio?', a: 'Sim, essa é uma das funcionalidades principais. Cada lançamento pode ser marcado como pessoal ou do negócio.' },
  { q: 'O que é o DRE?', a: 'O DRE (Demonstrativo de Resultado do Exercício) é um relatório que mostra todas as suas receitas, despesas e o lucro líquido do período. É gerado automaticamente a partir dos seus lançamentos.' },
  { q: 'Vocês oferecem suporte?', a: 'Sim. Plano Free recebe suporte por e-mail. Plano Pro tem suporte prioritário. Plano Business tem suporte via WhatsApp.' },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 md:py-24 px-4 bg-background">
      <div className="max-w-[720px] mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[clamp(28px,4vw,40px)] font-black text-fin-green-dark text-center tracking-tight mb-12"
        >
          Perguntas frequentes
        </motion.h2>

        <div className="space-y-2">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`border-[1.5px] rounded-xl overflow-hidden transition-colors duration-200 ${
                  isOpen ? 'border-fin-green-border bg-fin-green-pale' : 'border-border bg-card'
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-bold text-[15px] text-fin-green-dark pr-4">{f.q}</span>
                  <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                    {isOpen ? <X className="w-4 h-4 text-muted flex-shrink-0" /> : <Plus className="w-4 h-4 text-muted flex-shrink-0" />}
                  </motion.div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5 text-sm text-muted leading-[1.8]">{f.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
