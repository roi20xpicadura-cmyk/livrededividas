const brands = [
  { name: 'Nubank', domain: 'nubank.com.br' },
  { name: 'Itaú', domain: 'itau.com.br' },
  { name: 'Bradesco', domain: 'bradesco.com.br' },
  { name: 'Inter', domain: 'bancointer.com.br' },
  { name: 'Hotmart', domain: 'hotmart.com' },
  { name: 'Kiwify', domain: 'kiwify.com.br' },
  { name: 'Shopify', domain: 'shopify.com' },
  { name: 'Stripe', domain: 'stripe.com' },
  { name: 'Mercado Pago', domain: 'mercadopago.com.br' },
  { name: 'PagSeguro', domain: 'pagseguro.com.br' },
  { name: 'WooCommerce', domain: 'woocommerce.com' },
  { name: 'Eduzz', domain: 'eduzz.com' },
  { name: 'Banco do Brasil', domain: 'bb.com.br' },
  { name: 'Santander', domain: 'santander.com.br' },
  { name: 'C6 Bank', domain: 'c6bank.com.br' },
];

export default function TrustStrip() {
  const doubled = [...brands, ...brands];

  return (
    <section className="py-8 border-t border-b border-[#e2e8f0] bg-[#f8fafc] overflow-hidden">
      <p className="text-[12px] font-semibold text-[#94a3b8] uppercase tracking-[1px] text-center mb-6">
        Funciona com as plataformas que você já usa
      </p>
      <div className="relative">
        <div className="marquee-track flex items-center gap-16 px-8" style={{ width: 'max-content' }}>
          {doubled.map((b, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0 opacity-45 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300 cursor-default">
              <img
                src={`https://www.google.com/s2/favicons?domain=${b.domain}&sz=32`}
                alt={b.name}
                className="w-6 h-6"
                loading="lazy"
              />
              <span className="text-[14px] font-bold text-[#64748b] select-none whitespace-nowrap">{b.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
