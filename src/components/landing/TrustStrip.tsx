export default function TrustStrip() {
  const brands = ['Mercado Pago', 'Nubank', 'Stripe', 'Shopify', 'WooCommerce', 'Hotmart'];
  const doubled = [...brands, ...brands];

  return (
    <section className="py-6 border-t border-b border-border bg-background overflow-hidden">
      <p className="text-[11px] uppercase tracking-[1.5px] text-muted font-semibold text-center mb-4">
        Integra com as ferramentas que você já usa
      </p>
      <div className="relative">
        <div className="flex animate-marquee whitespace-nowrap gap-16 px-8">
          {doubled.map((b, i) => (
            <span key={i} className="text-lg font-bold text-[#94a3b8] select-none flex-shrink-0">
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
