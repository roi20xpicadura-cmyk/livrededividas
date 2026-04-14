import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export default function SEO({ title, description, image, url }: SEOProps) {
  const fullTitle = title
    ? `${title} — FinDash Pro`
    : 'FinDash Pro — Controle total das suas finanças';
  const desc = description ||
    'O painel financeiro mais completo do Brasil. Controle pessoal e empresarial, DRE automático, IA financeira e muito mais.';
  const img = image || 'https://findashpro.com.br/og-image.png';
  const canonical = url || 'https://findashpro.com.br';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="FinDash Pro" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonical} />
    </Helmet>
  );
}
