import { motion } from 'framer-motion';

const features = [
  { name: 'IA Financeira personalizada', kora: true, pierre: true, mobills: false },
  { name: 'WhatsApp IA', kora: true, pierre: false, mobills: false },
  { name: 'Dashboard visual completo', kora: true, pierre: false, mobills: true },
  { name: 'Módulo de dívidas (Snowball/Avalanche)', kora: true, pierre: false, mobills: false },
  { name: 'Simulador "E se...?"', kora: true, pierre: false, mobills: false },
  { name: 'IA Preditiva (90 dias)', kora: true, pierre: false, mobills: false },
  { name: 'Perfil MEI + DRE', kora: true, pierre: false, mobills: false },
  { name: 'Gamificação (score, conquistas)', kora: true, pierre: false, mobills: false },
  { name: 'Integrações e-commerce', kora: true, pierre: false, mobills: false },
  { name: 'Open Finance automático', kora: false, pierre: true, mobills: false },
];

export default function ComparisonSection() {
  return (
    <section className="py-20 md:py-28 px-4" style={{ background: 'white' }}>
      <div className="max-w-[860px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <span className="inline-block text-[11px] font-extrabold tracking-[0.1em] uppercase px-3.5 py-1 rounded-full mb-4" style={{ color: '#16a34a', background: '#f0fdf4' }}>
            Comparativo
          </span>
          <h2 className="text-[28px] md:text-[36px] font-black tracking-tight" style={{ color: '#0D1412' }}>
            Por que FinDash Pro?
          </h2>
          <p className="text-[16px] mt-3 max-w-[480px] mx-auto" style={{ color: '#6B7975' }}>
            Mais completo que qualquer alternativa no Brasil.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-hidden"
          style={{
            background: 'white',
            border: '1px solid #E2E8E5',
            borderRadius: 20,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px_80px] md:grid-cols-[1fr_120px_120px_120px] px-4 md:px-6 py-3.5" style={{ borderBottom: '1px solid #E2E8E5', background: '#F7F8F6' }}>
            <div className="text-[12px] font-bold" style={{ color: '#6B7975' }}>Funcionalidade</div>
            {[
              { name: 'FinDash', highlight: true },
              { name: 'Pierre', highlight: false },
              { name: 'Mobills', highlight: false },
            ].map(app => (
              <div key={app.name} className="text-center text-[12px] md:text-[13px] font-extrabold" style={{ color: app.highlight ? '#16a34a' : '#6B7975' }}>
                {app.highlight && '⭐ '}{app.name}
              </div>
            ))}
          </div>

          {/* Rows */}
          {features.map((f, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_80px_80px_80px] md:grid-cols-[1fr_120px_120px_120px] px-4 md:px-6 py-3"
              style={{
                borderBottom: i < features.length - 1 ? '1px solid #F0F2EF' : 'none',
                background: f.kora && !f.pierre ? '#FAFFFE' : 'white',
              }}
            >
              <div className="flex items-center gap-2 text-[12px] md:text-[13px] font-medium" style={{ color: '#3D4B47' }}>
                {f.kora && !f.pierre && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#dcfce7', color: '#166534' }}>
                    exclusivo
                  </span>
                )}
                <span className="truncate md:whitespace-normal">{f.name}</span>
              </div>
              {[f.kora, f.pierre, f.mobills].map((has, j) => (
                <div key={j} className="text-center text-[16px]">
                  {has
                    ? <span style={{ color: '#16a34a' }}>✓</span>
                    : <span style={{ color: '#E2E8E5' }}>—</span>
                  }
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
