import { useMemo, useState } from 'react';
import { KNOWN_SERVICES } from '@/lib/subscriptionDetector';
import { getCategoryStyle } from '@/lib/categoryIcons';
import {
  ArrowDownLeft, ArrowUpRight, Banknote, Coins, Wallet, Gift, TrendingUp,
  PiggyBank, Briefcase, Building2, Receipt, ShoppingBag, Ticket, Plane,
  Coffee, Pizza, Bus, Bike, Smartphone, Wifi, Zap, Droplet, Flame,
  Stethoscope, Baby, Dog, Music, Camera, Gamepad2, Sparkles,
  Hammer, GraduationCap, ShieldCheck, MapPin, Heart, ShoppingCart,
  UtensilsCrossed, Car, Fuel, Home, Dumbbell, Palmtree, Film,
  type LucideIcon,
} from 'lucide-react';
// Heurística por palavra-chave na descrição (vence sobre categoria)
const KEYWORD_ICONS: Array<[RegExp, { Icon: LucideIcon; bg: string; fg: string }]> = [
  // receitas
  [/\bpix\b.*(receb|in)|receb.*pix|transf.*receb|deposito|depósito|credito\s*recebido/i,
    { Icon: ArrowDownLeft, bg: 'rgba(16,185,129,0.12)', fg: '#059669' }],
  [/\bsalario|salário|holerite|folha/i,
    { Icon: Banknote, bg: 'rgba(34,197,94,0.12)', fg: '#16A34A' }],
  [/freela|freelance|projeto|servic[oó]/i,
    { Icon: Briefcase, bg: 'rgba(16,185,129,0.12)', fg: '#059669' }],
  [/dividend|rendiment|juros|aplica/i,
    { Icon: PiggyBank, bg: 'rgba(20,184,166,0.12)', fg: '#0D9488' }],
  [/cashback|estorno|reembolso/i,
    { Icon: Coins, bg: 'rgba(245,158,11,0.14)', fg: '#D97706' }],
  [/presente|premio|prêmio|bônus|bonus/i,
    { Icon: Gift, bg: 'rgba(236,72,153,0.12)', fg: '#DB2777' }],
  [/aluguel\s*receb|locac/i,
    { Icon: Building2, bg: 'rgba(20,184,166,0.12)', fg: '#0D9488' }],
  [/venda|vendas/i,
    { Icon: TrendingUp, bg: 'rgba(34,197,94,0.12)', fg: '#16A34A' }],

  // despesas / contexto
  [/\bpix\b.*env|envio.*pix|transf.*env/i,
    { Icon: ArrowUpRight, bg: 'rgba(99,102,241,0.12)', fg: '#4F46E5' }],
  [/cafe|café|coffee|starbucks/i,
    { Icon: Coffee, bg: 'rgba(180,83,9,0.14)', fg: '#92400E' }],
  [/pizza|hambur|burger|lanch|almoc|almoço|janta|restaurante|comida|refeic/i,
    { Icon: UtensilsCrossed, bg: 'rgba(249,115,22,0.12)', fg: '#EA580C' }],
  [/pizza|hambur|burger/i,
    { Icon: Pizza, bg: 'rgba(249,115,22,0.12)', fg: '#EA580C' }],
  [/mercado|supermerc|feira|hortifr|atacad/i,
    { Icon: ShoppingCart, bg: 'rgba(34,197,94,0.12)', fg: '#16A34A' }],
  [/praia|lazer|parque|passeio|f[eé]rias/i,
    { Icon: Palmtree, bg: 'rgba(20,184,166,0.14)', fg: '#0D9488' }],
  [/academia|gym|crossfit|treino/i,
    { Icon: Dumbbell, bg: 'rgba(124,58,237,0.12)', fg: '#7C3AED' }],
  [/gasolin|combust|posto|etanol|alcool/i,
    { Icon: Fuel, bg: 'rgba(234,88,12,0.14)', fg: '#C2410C' }],
  [/uber|99\s|taxi|táxi|carro\s*app/i,
    { Icon: Car, bg: 'rgba(15,23,42,0.10)', fg: '#0F172A' }],
  [/aluguel|condom[ií]nio|imovel|imóvel|casa\b/i,
    { Icon: Home, bg: 'rgba(99,102,241,0.12)', fg: '#4F46E5' }],
  [/netflix|prime\s*video|disney|hbo|globoplay|filme|cinema/i,
    { Icon: Film, bg: 'rgba(168,85,247,0.12)', fg: '#9333EA' }],
  [/onibus|ônibus|metro|metrô|bilhet/i,
    { Icon: Bus, bg: 'rgba(59,130,246,0.12)', fg: '#2563EB' }],
  [/bike|bicicl/i,
    { Icon: Bike, bg: 'rgba(20,184,166,0.12)', fg: '#0D9488' }],
  [/passag|voo|aere|aéreo|latam|gol|azul/i,
    { Icon: Plane, bg: 'rgba(99,102,241,0.12)', fg: '#4F46E5' }],
  [/celular|tim|vivo|claro|oi\s|operadora|recarg/i,
    { Icon: Smartphone, bg: 'rgba(139,92,246,0.14)', fg: '#7C3AED' }],
  [/internet|wifi|banda\s*larga|net\s/i,
    { Icon: Wifi, bg: 'rgba(59,130,246,0.12)', fg: '#2563EB' }],
  [/luz|energia|eletric/i,
    { Icon: Zap, bg: 'rgba(234,179,8,0.14)', fg: '#CA8A04' }],
  [/agua|água|saneam/i,
    { Icon: Droplet, bg: 'rgba(6,182,212,0.12)', fg: '#0891B2' }],
  [/gas\s|\bgás\b|botij/i,
    { Icon: Flame, bg: 'rgba(249,115,22,0.12)', fg: '#EA580C' }],
  [/medic|m[eé]dico|consulta|hospital|clinic/i,
    { Icon: Stethoscope, bg: 'rgba(20,184,166,0.12)', fg: '#0D9488' }],
  [/escola|colegio|colégio|matric|mensalid/i,
    { Icon: GraduationCap, bg: 'rgba(99,102,241,0.12)', fg: '#4F46E5' }],
  [/seguro/i,
    { Icon: ShieldCheck, bg: 'rgba(100,116,139,0.14)', fg: '#475569' }],
  [/cinema|show|ingress|teatro|evento/i,
    { Icon: Ticket, bg: 'rgba(168,85,247,0.12)', fg: '#9333EA' }],
  [/jogo|game|steam|playstation|xbox/i,
    { Icon: Gamepad2, bg: 'rgba(139,92,246,0.14)', fg: '#7C3AED' }],
  [/musica|música|spotify|deezer/i,
    { Icon: Music, bg: 'rgba(34,197,94,0.12)', fg: '#16A34A' }],
  [/foto|photo|camera/i,
    { Icon: Camera, bg: 'rgba(168,85,247,0.12)', fg: '#9333EA' }],
  [/manuten|reparo|conserto|reforma/i,
    { Icon: Hammer, bg: 'rgba(180,83,9,0.14)', fg: '#92400E' }],
  [/pet|veterin|racao|ração/i,
    { Icon: Dog, bg: 'rgba(245,158,11,0.14)', fg: '#D97706' }],
  [/bebe|bebê|fralda|crianc/i,
    { Icon: Baby, bg: 'rgba(236,72,153,0.12)', fg: '#DB2777' }],
  [/doac|doaç|caridade/i,
    { Icon: Heart, bg: 'rgba(236,72,153,0.10)', fg: '#DB2777' }],
  [/viagem|hotel|airbnb|booking/i,
    { Icon: MapPin, bg: 'rgba(20,184,166,0.12)', fg: '#0D9488' }],
  [/compra|loja|store|\bshop\b/i,
    { Icon: ShoppingBag, bg: 'rgba(168,85,247,0.12)', fg: '#9333EA' }],
  [/boleto|fatura|conta\b/i,
    { Icon: Receipt, bg: 'rgba(100,116,139,0.14)', fg: '#475569' }],
];

// Paleta determinística para "Outros" (varia por nome → evita 4 cinzas iguais)
const FALLBACK_PALETTE = [
  { bg: 'rgba(139,92,246,0.14)', fg: '#7C3AED' },
  { bg: 'rgba(59,130,246,0.12)',  fg: '#2563EB' },
  { bg: 'rgba(20,184,166,0.12)',  fg: '#0D9488' },
  { bg: 'rgba(245,158,11,0.14)',  fg: '#D97706' },
  { bg: 'rgba(236,72,153,0.12)',  fg: '#DB2777' },
  { bg: 'rgba(99,102,241,0.12)',  fg: '#4F46E5' },
  { bg: 'rgba(6,182,212,0.12)',   fg: '#0891B2' },
];
const FALLBACK_ICONS: LucideIcon[] = [Sparkles, Wallet, Coins, Receipt, ShoppingBag, Briefcase, Ticket];

function hashIdx(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function matchKeyword(desc: string) {
  if (!desc) return null;
  for (const [re, style] of KEYWORD_ICONS) if (re.test(desc)) return style;
  return null;
}

function isGenericCategory(cat?: string | null) {
  if (!cat) return true;
  const c = cat.trim().toLowerCase();
  return c === 'outros' || c === 'outro' || c === 'sem categoria';
}

interface Props {
  description: string;
  category?: string | null;
  isIncome?: boolean;
  size?: number;
  rounded?: number;
}

// description → domain (uma vez, em memória)
function findDomainFor(desc: string): string | null {
  if (!desc) return null;
  for (const svc of KNOWN_SERVICES) {
    if (svc.domain && svc.patterns.some(p => p.test(desc))) return svc.domain;
  }
  return null;
}

// Heurística leve: tenta extrair um domínio "marca.com" da descrição
// Ex.: "UBER*TRIP", "AMZN MKTPLACE", "MERCADOLIVRE", "PG *NUBANK"
const BRAND_GUESS: Array<[RegExp, string]> = [
  [/\buber\b/i, 'uber.com'],
  [/ifood/i, 'ifood.com.br'],
  [/rappi/i, 'rappi.com.br'],
  [/\b99\s*app\b|99pop/i, '99app.com'],
  [/amazon|amzn/i, 'amazon.com'],
  [/mercado\s*livre|mercadolivre|\bmlb\b/i, 'mercadolivre.com.br'],
  [/mercado\s*pago|mercadopago/i, 'mercadopago.com.br'],
  [/shopee/i, 'shopee.com.br'],
  [/aliexpress/i, 'aliexpress.com'],
  [/magalu|magazine\s*luiza/i, 'magazineluiza.com.br'],
  [/americanas/i, 'americanas.com.br'],
  [/nubank/i, 'nubank.com.br'],
  [/itau|itaú/i, 'itau.com.br'],
  [/bradesco/i, 'bradesco.com.br'],
  [/santander/i, 'santander.com.br'],
  [/banco\s*do\s*brasil|\bbb\b/i, 'bb.com.br'],
  [/caixa/i, 'caixa.gov.br'],
  [/inter\b/i, 'bancointer.com.br'],
  [/c6\s*bank|\bc6\b/i, 'c6bank.com.br'],
  [/pag\s*seguro|pagseguro|pag\*/i, 'pagseguro.uol.com.br'],
  [/stone\b/i, 'stone.com.br'],
  [/picpay/i, 'picpay.com'],
  [/google/i, 'google.com'],
  [/microsoft/i, 'microsoft.com'],
  [/whatsapp/i, 'whatsapp.com'],
  [/instagram|meta\b|facebook/i, 'meta.com'],
  [/booking/i, 'booking.com'],
  [/airbnb/i, 'airbnb.com'],
  [/latam/i, 'latamairlines.com'],
  [/gol\s*linhas|gollinhas/i, 'voegol.com.br'],
  [/azul\s*linhas|azul\s*viagens/i, 'voeazul.com.br'],
  [/posto|shell\b/i, 'shell.com'],
  [/petrobras|br\s*distribuidora/i, 'petrobras.com.br'],
  [/ipiranga/i, 'ipiranga.com.br'],
  [/mc\s*donald|mcdonald/i, 'mcdonalds.com'],
  [/burger\s*king|\bbk\b/i, 'burgerking.com.br'],
  [/starbucks/i, 'starbucks.com'],
  [/subway/i, 'subway.com'],
  [/pao\s*de\s*acucar|pão\s*de\s*açúcar/i, 'paodeacucar.com'],
  [/carrefour/i, 'carrefour.com.br'],
  [/extra\s*super|extra\s*hiper/i, 'clubeextra.com.br'],
  [/assai|assaí/i, 'assai.com.br'],
  [/atacadao|atacadão/i, 'atacadao.com.br'],
];

function guessDomainFromDesc(desc: string): string | null {
  if (!desc) return null;
  for (const [re, domain] of BRAND_GUESS) {
    if (re.test(desc)) return domain;
  }
  return null;
}

export default function TransactionIcon({
  description,
  category,
  isIncome = false,
  size = 40,
  rounded = 12,
}: Props) {
  const domain = useMemo(
    () => findDomainFor(description) ?? guessDomainFromDesc(description),
    [description]
  );
  const [imgFailed, setImgFailed] = useState(false);

  const style = getCategoryStyle(category, isIncome);
  // 1) palavra-chave na descrição vence
  const kw = matchKeyword(description);
  // 2) se categoria for genérica, varia por hash do nome
  let finalStyle: { Icon: LucideIcon; bg: string; fg: string };
  if (kw) {
    finalStyle = kw;
  } else if (isGenericCategory(category)) {
    const idx = hashIdx(description || 'x', FALLBACK_PALETTE.length);
    const iconIdx = hashIdx(description || 'x', FALLBACK_ICONS.length);
    finalStyle = { Icon: FALLBACK_ICONS[iconIdx], ...FALLBACK_PALETTE[idx] };
  } else {
    finalStyle = { Icon: style.Icon, bg: style.bg, fg: style.fg };
  }
  const Icon = finalStyle.Icon;

  const container: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: rounded,
    background: finalStyle.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    border: '1px solid rgba(0,0,0,0.04)',
    boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.03)',
  };

  if (domain && !imgFailed) {
    const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    return (
      <div style={{
        ...container,
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
      }}>
        <img
          src={url}
          alt={description}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          style={{ width: '66%', height: '66%', objectFit: 'contain', display: 'block' }}
        />
      </div>
    );
  }

  return (
    <div style={container}>
      <Icon
        style={{ width: size * 0.5, height: size * 0.5, color: finalStyle.fg }}
        strokeWidth={2.2}
      />
    </div>
  );
}
