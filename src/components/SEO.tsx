import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown>;
}

export default function SEO({ title, description, image, url, type = 'website', jsonLd }: SEOProps) {
  const fullTitle = title
    ? `${title} — FinDash Pro`
    : 'FinDash Pro — Controle total das suas finanças';
  const desc = description ||
    'O painel financeiro mais completo do Brasil. Controle pessoal e empresarial, DRE automático, IA financeira e conexão bancária via Open Finance.';
  const img = image || 'https://findashpro.com.br/og-image.png';
  const canonical = url || 'https://findashpro.com.br';

  const defaultJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FinDash Pro',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: desc,
    url: 'https://findashpro.com.br',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
      description: 'Plano gratuito disponível',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '2400',
      bestRating: '5',
    },
    author: {
      '@type': 'Organization',
      name: 'FinDash Pro',
      url: 'https://findashpro.com.br',
    },
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="keywords" content="controle financeiro, finanças pessoais, DRE, gestão financeira, planilha financeira, orçamento, metas financeiras, open finance, IA financeira" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="FinDash Pro" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
      <link rel="canonical" href={canonical} />
      <script type="application/ld+json">
        {JSON.stringify(jsonLd || defaultJsonLd)}
      </script>
    </Helmet>
  );
}
