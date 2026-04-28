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

type IconStyle = { Icon: LucideIcon; bg: string; fg: string };

const tone = {
  brand: { bg: 'hsl(var(--primary) / 0.12)', fg: 'hsl(var(--primary))' },
  brandSoft: { bg: 'hsl(var(--primary) / 0.08)', fg: 'hsl(var(--primary))' },
  blue: { bg: 'hsl(var(--blue) / 0.12)', fg: 'hsl(var(--blue))' },
  warning: { bg: 'hsl(var(--warning) / 0.12)', fg: 'hsl(var(--warning))' },
  success: { bg: 'hsl(var(--success) / 0.12)', fg: 'hsl(var(--success))' },
  neutral: { bg: 'hsl(var(--muted) / 0.35)', fg: 'hsl(var(--muted-foreground))' },
  strong: { bg: 'hsl(var(--foreground) / 0.08)', fg: 'hsl(var(--foreground))' },
} satisfies Record<string, { bg: string; fg: string }>;

// Heurística por palavra-chave na descrição (vence sobre categoria)
const KEYWORD_ICONS: Array<[RegExp, IconStyle]> = [
  // receitas
  [/\bpix\b.*(receb|in)|receb.*pix|transf.*receb|deposito|depósito|credito\s*recebido/i,
    { Icon: ArrowDownLeft, ...tone.success }],
  [/\bsalario|salário|holerite|folha/i,
    { Icon: Banknote, ...tone.success }],
  [/freela|freelance|projeto|servic[oó]/i,
    { Icon: Briefcase, ...tone.brand }],
  [/dividend|rendiment|juros|aplica/i,
    { Icon: PiggyBank, ...tone.blue }],
  [/cashback|estorno|reembolso/i,
    { Icon: Coins, ...tone.warning }],
  [/presente|premio|prêmio|bônus|bonus/i,
    { Icon: Gift, ...tone.brand }],
  [/aluguel\s*receb|locac/i,
    { Icon: Building2, ...tone.blue }],
  [/venda|vendas/i,
    { Icon: TrendingUp, ...tone.success }],

  // despesas / contexto
  [/\bpix\b.*env|envio.*pix|transf.*env/i,
    { Icon: ArrowUpRight, ...tone.brand }],
  [/cafe|café|coffee|starbucks/i,
    { Icon: Coffee, ...tone.warning }],
  [/pizza|hambur|burger|lanch|almoc|almoço|janta|restaurante|comida|refeic/i,
    { Icon: UtensilsCrossed, ...tone.warning }],
  [/pizza|hambur|burger/i,
    { Icon: Pizza, ...tone.warning }],
  [/mercado|supermerc|feira|hortifr|atacad/i,
    { Icon: ShoppingCart, ...tone.blue }],
  [/praia|lazer|parque|passeio|f[eé]rias/i,
    { Icon: Palmtree, ...tone.blue }],
  [/academia|gym|crossfit|treino/i,
    { Icon: Dumbbell, ...tone.brand }],
  [/gasolin|combust|posto|etanol|alcool/i,
    { Icon: Fuel, ...tone.warning }],
  [/uber|99\s|taxi|táxi|carro\s*app/i,
    { Icon: Car, ...tone.strong }],
  [/aluguel|condom[ií]nio|imovel|imóvel|casa\b/i,
    { Icon: Home, ...tone.blue }],
  [/netflix|prime\s*video|disney|hbo|globoplay|filme|cinema/i,
    { Icon: Film, ...tone.brand }],
  [/onibus|ônibus|metro|metrô|bilhet/i,
    { Icon: Bus, ...tone.blue }],
  [/bike|bicicl/i,
    { Icon: Bike, ...tone.blue }],
  [/passag|voo|aere|aéreo|latam|gol|azul/i,
    { Icon: Plane, ...tone.brand }],
  [/celular|tim|vivo|claro|oi\s|operadora|recarg/i,
    { Icon: Smartphone, ...tone.brand }],
  [/internet|wifi|banda\s*larga|net\s/i,
    { Icon: Wifi, ...tone.blue }],
  [/luz|energia|eletric/i,
    { Icon: Zap, ...tone.warning }],
  [/agua|água|saneam/i,
    { Icon: Droplet, ...tone.blue }],
  [/gas\s|\bgás\b|botij/i,
    { Icon: Flame, ...tone.warning }],
  [/medic|m[eé]dico|consulta|hospital|clinic/i,
    { Icon: Stethoscope, ...tone.blue }],
  [/escola|colegio|colégio|matric|mensalid/i,
    { Icon: GraduationCap, ...tone.brand }],
  [/seguro/i,
    { Icon: ShieldCheck, ...tone.neutral }],
  [/cinema|show|ingress|teatro|evento/i,
    { Icon: Ticket, ...tone.brand }],
  [/jogo|game|steam|playstation|xbox/i,
    { Icon: Gamepad2, ...tone.brand }],
  [/musica|música|spotify|deezer/i,
    { Icon: Music, ...tone.blue }],
  [/foto|photo|camera/i,
    { Icon: Camera, ...tone.brand }],
  [/manuten|reparo|conserto|reforma/i,
    { Icon: Hammer, ...tone.warning }],
  [/pet|veterin|racao|ração/i,
    { Icon: Dog, ...tone.warning }],
  [/bebe|bebê|fralda|crianc/i,
    { Icon: Baby, ...tone.brandSoft }],
  [/doac|doaç|caridade/i,
    { Icon: Heart, ...tone.brandSoft }],
  [/viagem|hotel|airbnb|booking/i,
    { Icon: MapPin, ...tone.blue }],
  [/compra|loja|store|\bshop\b/i,
    { Icon: ShoppingBag, ...tone.brand }],
  [/boleto|fatura|conta\b/i,
    { Icon: Receipt, ...tone.neutral }],
];

// Paleta determinística para "Outros" (varia por nome → evita 4 cinzas iguais)
const FALLBACK_PALETTE = [
  tone.brand,
  tone.blue,
  tone.warning,
  tone.neutral,
  tone.brandSoft,
  tone.strong,
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
  // 2) categoria específica (não genérica) vence sobre favicon
  const hasSpecificCategory = !isGenericCategory(category);
  let finalStyle: { Icon: LucideIcon; bg: string; fg: string };
  if (kw) {
    finalStyle = kw;
  } else if (hasSpecificCategory) {
    finalStyle = { Icon: style.Icon, bg: style.bg, fg: style.fg };
  } else {
    const idx = hashIdx(description || 'x', FALLBACK_PALETTE.length);
    const iconIdx = hashIdx(description || 'x', FALLBACK_ICONS.length);
    finalStyle = { Icon: FALLBACK_ICONS[iconIdx], ...FALLBACK_PALETTE[idx] };
  }
  // Favicon só entra quando NÃO há keyword nem categoria específica —
  // evita que "Mercado/Almoço/Praia" virem favicons genéricos do Google.
  const useFavicon = !kw && !hasSpecificCategory && domain && !imgFailed;
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
    border: '1px solid var(--color-border-weak)',
    boxShadow: 'inset 0 -1px 0 hsl(var(--foreground) / 0.03)',
  };

  if (useFavicon) {
    const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    return (
      <div style={{
        ...container,
        background: 'var(--color-bg-surface)',
        boxShadow: 'inset 0 0 0 1px var(--color-border-weak), var(--shadow-xs)',
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
