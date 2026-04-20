import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ChevronDown, TrendingUp, TrendingDown, Wallet, Sparkles,
  UtensilsCrossed, Car, Home, ShoppingBag, Heart, GraduationCap,
  Plane, Gamepad2, Shirt, Dumbbell, Baby, PawPrint, Fuel, Bus,
  Coffee, Pizza, ShoppingCart, Smartphone, Wifi, Zap, Droplet,
  Receipt, CreditCard, Briefcase, DollarSign, Gift, Music, Film,
  Book, Stethoscope, Pill, Scissors, Sparkle, Bike, Train, Cigarette,
  Wine, Beer, Banknote, PiggyBank, TrendingUp as TUp, Building2,
  Hammer, Wrench, Cat, Dog, Sofa, Laptop, Tv, Headphones, Camera,
  Package, Truck, MapPin, Bed, Tag,
  type LucideIcon,
} from 'lucide-react';

type Tx = { id: string; amount: number; category: string; type: string; date: string };
type Period = 'this_month' | 'last_month' | 'year';
type TxType = 'expense' | 'income';

// Mapeamento inteligente de categoria → ícone (matching por palavras-chave em PT)
const CATEGORY_ICONS: { keywords: string[]; icon: LucideIcon }[] = [
  // Alimentação
  { keywords: ['restaurante', 'restaur', 'comida', 'aliment', 'refeição', 'refeicao', 'almoço', 'almoco', 'jantar', 'janta'], icon: UtensilsCrossed },
  { keywords: ['mercado', 'supermercado', 'feira', 'compras de mês', 'compras do mes'], icon: ShoppingCart },
  { keywords: ['ifood', 'delivery', 'pizza', 'lanche', 'fast food', 'fastfood'], icon: Pizza },
  { keywords: ['café', 'cafe', 'padaria'], icon: Coffee },
  { keywords: ['bar', 'cerveja', 'chopp'], icon: Beer },
  { keywords: ['vinho', 'bebida', 'drink'], icon: Wine },
  // Transporte
  { keywords: ['uber', '99', 'taxi', 'táxi', 'corrida'], icon: Car },
  { keywords: ['gasolina', 'combustível', 'combustivel', 'posto', 'álcool', 'alcool', 'etanol', 'diesel'], icon: Fuel },
  { keywords: ['ônibus', 'onibus', 'metrô', 'metro', 'transporte público', 'transporte publico', 'bilhete'], icon: Bus },
  { keywords: ['trem', 'cptm'], icon: Train },
  { keywords: ['bike', 'bicicleta', 'patinete'], icon: Bike },
  { keywords: ['carro', 'veículo', 'veiculo', 'automóvel', 'automovel', 'transporte'], icon: Car },
  // Moradia
  { keywords: ['aluguel', 'aluguél', 'casa', 'moradia', 'condomínio', 'condominio', 'iptu'], icon: Home },
  { keywords: ['móveis', 'moveis', 'decoração', 'decoracao', 'sofá', 'sofa'], icon: Sofa },
  { keywords: ['cama', 'colchão', 'colchao', 'quarto'], icon: Bed },
  // Contas/Serviços
  { keywords: ['luz', 'energia', 'elétric', 'eletric'], icon: Zap },
  { keywords: ['água', 'agua', 'saneamento'], icon: Droplet },
  { keywords: ['internet', 'wifi', 'wi-fi'], icon: Wifi },
  { keywords: ['celular', 'telefone', 'fone', 'plano de celular', 'tim', 'vivo', 'claro', 'oi'], icon: Smartphone },
  { keywords: ['conta', 'fatura', 'boleto'], icon: Receipt },
  { keywords: ['cartão', 'cartao', 'crédito', 'credito'], icon: CreditCard },
  // Saúde
  { keywords: ['saúde', 'saude', 'médico', 'medico', 'hospital', 'consulta', 'plano de saúde', 'plano de saude'], icon: Stethoscope },
  { keywords: ['farmácia', 'farmacia', 'remédio', 'remedio', 'medicamento'], icon: Pill },
  { keywords: ['academia', 'gym', 'esporte', 'fitness', 'treino'], icon: Dumbbell },
  // Educação
  { keywords: ['educação', 'educacao', 'escola', 'faculdade', 'universidade', 'curso', 'mensalidade'], icon: GraduationCap },
  { keywords: ['livro', 'livraria'], icon: Book },
  // Lazer/Entretenimento
  { keywords: ['lazer', 'entretenimento', 'diversão', 'diversao'], icon: Gamepad2 },
  { keywords: ['cinema', 'filme', 'streaming', 'netflix', 'disney', 'hbo', 'prime'], icon: Film },
  { keywords: ['música', 'musica', 'spotify', 'deezer'], icon: Music },
  { keywords: ['jogo', 'game', 'playstation', 'xbox', 'nintendo'], icon: Gamepad2 },
  { keywords: ['viagem', 'viajar', 'passagem', 'hotel', 'turismo'], icon: Plane },
  // Compras/Pessoais
  { keywords: ['roupa', 'vestuário', 'vestuario', 'moda', 'calçado', 'calcado', 'sapato'], icon: Shirt },
  { keywords: ['shopping', 'compra'], icon: ShoppingBag },
  { keywords: ['beleza', 'cabelo', 'salão', 'salao', 'barbearia', 'barbeiro'], icon: Scissors },
  { keywords: ['cosmético', 'cosmetico', 'maquiagem', 'perfume'], icon: Sparkle },
  { keywords: ['presente', 'gift'], icon: Gift },
  // Família/Pets
  { keywords: ['filho', 'criança', 'crianca', 'bebê', 'bebe', 'fralda'], icon: Baby },
  { keywords: ['pet', 'animal'], icon: PawPrint },
  { keywords: ['cachorro', 'cão', 'cao'], icon: Dog },
  { keywords: ['gato'], icon: Cat },
  // Vícios
  { keywords: ['cigarro', 'fumo', 'tabaco'], icon: Cigarette },
  // Trabalho/Renda
  { keywords: ['salário', 'salario', 'ordenado'], icon: Banknote },
  { keywords: ['freela', 'freelance', 'extra', 'bico'], icon: Briefcase },
  { keywords: ['investimento', 'rendimento', 'dividendo'], icon: TUp },
  { keywords: ['poupança', 'poupanca', 'reserva'], icon: PiggyBank },
  { keywords: ['venda', 'vendas'], icon: Tag },
  { keywords: ['empresa', 'negócio', 'negocio'], icon: Building2 },
  // Manutenção
  { keywords: ['reforma', 'construção', 'construcao'], icon: Hammer },
  { keywords: ['conserto', 'manutenção', 'manutencao', 'reparo'], icon: Wrench },
  // Tech
  { keywords: ['computador', 'notebook', 'laptop'], icon: Laptop },
  { keywords: ['tv', 'televisão', 'televisao'], icon: Tv },
  { keywords: ['fone', 'headphone', 'headset'], icon: Headphones },
  { keywords: ['câmera', 'camera', 'foto'], icon: Camera },
  // Outros
  { keywords: ['frete', 'entrega', 'envio'], icon: Truck },
  { keywords: ['pacote', 'encomenda'], icon: Package },
  { keywords: ['dinheiro', 'cash'], icon: DollarSign },
  { keywords: ['amor', 'doação', 'doacao'], icon: Heart },
  { keywords: ['endereço', 'endereco', 'localização', 'localizacao'], icon: MapPin },
];

function getCategoryIcon(name: string): LucideIcon {
  const normalized = name.toLowerCase().trim();
  for (const { keywords, icon } of CATEGORY_ICONS) {
    if (keywords.some(k => normalized.includes(k))) return icon;
  }
  return Wallet;
}

// Paleta multicolor premium — uma cor distinta por categoria
const PALETTE: { from: string; to: string; solid: string }[] = [
  { from: '#10B981', to: '#059669', solid: '#10B981' }, // emerald
  { from: '#3B82F6', to: '#2563EB', solid: '#3B82F6' }, // blue
  { from: '#F59E0B', to: '#D97706', solid: '#F59E0B' }, // amber
  { from: '#EC4899', to: '#DB2777', solid: '#EC4899' }, // pink
  { from: '#8B5CF6', to: '#7C3AED', solid: '#8B5CF6' }, // violet
  { from: '#F97316', to: '#EA580C', solid: '#F97316' }, // orange
  { from: '#06B6D4', to: '#0891B2', solid: '#06B6D4' }, // cyan
  { from: '#EF4444', to: '#DC2626', solid: '#EF4444' }, // red
  { from: '#14B8A6', to: '#0D9488', solid: '#14B8A6' }, // teal
  { from: '#A855F7', to: '#9333EA', solid: '#A855F7' }, // purple
  { from: '#84CC16', to: '#65A30D', solid: '#84CC16' }, // lime
  { from: '#6366F1', to: '#4F46E5', solid: '#6366F1' }, // indigo
];

const PERIOD_LABELS: Record<Period, string> = {
  this_month: 'Este mês',
  last_month: 'Mês passado',
  year: 'Ano',
};

function getRange(period: Period): [string, string] {
  const now = new Date();
  if (period === 'this_month') return [format(startOfMonth(now), 'yyyy-MM-dd'), format(endOfMonth(now), 'yyyy-MM-dd')];
  if (period === 'last_month') {
    const prev = subMonths(now, 1);
    return [format(startOfMonth(prev), 'yyyy-MM-dd'), format(endOfMonth(prev), 'yyyy-MM-dd')];
  }
  return [format(startOfYear(now), 'yyyy-MM-dd'), format(endOfYear(now), 'yyyy-MM-dd')];
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Donut({ slices, total }: { slices: { from: string; to: string; value: number }[]; total: number }) {
  const size = 240;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 drop-shadow-[0_8px_24px_rgba(124,58,237,0.18)]">
      <defs>
        {slices.map((s, i) => (
          <linearGradient key={i} id={`donut-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={s.from} />
            <stop offset="100%" stopColor={s.to} />
          </linearGradient>
        ))}
        <filter id="donut-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-bg-sunken)" strokeWidth={stroke} opacity={0.6} />
      {total > 0 && slices.map((s, i) => {
        const len = (s.value / total) * c;
        const dash = `${len} ${c - len}`;
        const el = (
          <motion.circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#donut-grad-${i})`}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 * i, duration: 0.5 }}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('this_month');
  const [txType, setTxType] = useState<TxType>('expense');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const [start, end] = getRange(period);
    setLoading(true);
    supabase
      .from('transactions')
      .select('id, amount, category, type, date')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .is('deleted_at', null)
      .then(({ data }) => {
        setTxs((data as Tx[]) || []);
        setLoading(false);
      });
  }, [user, period]);

  const { categories, total } = useMemo(() => {
    const filtered = txs.filter(t => t.type === txType);
    const map = new Map<string, number>();
    filtered.forEach(t => {
      const cat = t.category || 'Outro';
      map.set(cat, (map.get(cat) || 0) + Number(t.amount || 0));
    });
    const arr = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const tot = arr.reduce((s, c) => s + c.value, 0);
    const colored = arr.map((c, i) => {
      const palette = PALETTE[i % PALETTE.length];
      return {
        ...c,
        from: palette.from,
        to: palette.to,
        solid: palette.solid,
        pct: tot > 0 ? (c.value / tot) * 100 : 0,
      };
    });
    return { categories: colored, total: tot };
  }, [txs, txType]);

  const isEmpty = !loading && categories.length === 0;

  return (
    <div className="max-w-5xl mx-auto pb-20" style={{ padding: '16px' }}>
      {/* Hero card: tipo + período */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative overflow-hidden"
        style={{
          background:
            'radial-gradient(120% 80% at 0% 0%, rgba(16,185,129,0.08) 0%, transparent 55%), radial-gradient(100% 70% at 100% 100%, rgba(59,130,246,0.06) 0%, transparent 50%), linear-gradient(180deg, var(--color-bg-surface) 0%, var(--color-bg-surface) 100%)',
          border: '1px solid var(--color-border-weak)',
          borderRadius: 'var(--radius-2xl)',
          padding: '20px 18px 22px',
          marginBottom: 16,
          boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 40px -24px rgba(16,185,129,0.15)',
        }}
      >
        {/* Premium badge */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="flex items-center gap-1.5"
            style={{
              background: 'var(--color-green-50)',
              border: '1px solid var(--color-border-weak)',
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 10,
              fontWeight: 800,
              color: 'var(--color-green-700)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles style={{ width: 11, height: 11 }} />
            Breakdown
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {PERIOD_LABELS[period]}
          </span>
        </div>

        {/* Type selector */}
        <div className="flex items-center justify-center mb-4 relative">
          <button
            onClick={() => setShowTypeMenu(v => !v)}
            className="flex items-center gap-2 transition-all"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-base)',
              borderRadius: 'var(--radius-full)',
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 800,
              color: 'var(--color-text-strong)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            {txType === 'expense' ? (
              <><TrendingDown style={{ width: 14, height: 14, color: 'var(--color-danger-solid)' }} /> Despesas</>
            ) : (
              <><TrendingUp style={{ width: 14, height: 14, color: 'var(--color-success-solid)' }} /> Receitas</>
            )}
            <ChevronDown style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} />
          </button>

          {showTypeMenu && (
            <div
              className="absolute top-full mt-2 z-10"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-base)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                padding: 4,
                minWidth: 160,
              }}
            >
              {(['expense', 'income'] as TxType[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTxType(t); setShowTypeMenu(false); }}
                  className="flex items-center gap-2 w-full text-left transition-colors"
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--color-text-base)',
                    borderRadius: 'var(--radius-md)',
                    background: txType === t ? 'var(--color-green-50)' : 'transparent',
                  }}
                >
                  {t === 'expense'
                    ? <><TrendingDown style={{ width: 14, height: 14, color: 'var(--color-danger-solid)' }} /> Despesas</>
                    : <><TrendingUp style={{ width: 14, height: 14, color: 'var(--color-success-solid)' }} /> Receitas</>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Period tabs */}
        <div
          className="flex items-center justify-center"
          style={{
            background: 'var(--color-bg-sunken)',
            border: '1px solid var(--color-border-weak)',
            borderRadius: 'var(--radius-full)',
            padding: 4,
            margin: '0 auto 24px',
            width: 'fit-content',
          }}
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="transition-all relative"
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 800,
                borderRadius: 'var(--radius-full)',
                background: period === p ? 'var(--color-green-600)' : 'transparent',
                color: period === p ? '#fff' : 'var(--color-text-muted)',
                cursor: 'pointer',
                border: 'none',
                boxShadow: period === p ? '0 4px 12px -2px rgba(16,185,129,0.35)' : 'none',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Donut + summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
          <div className="flex justify-center relative">
            <Donut slices={categories} total={total} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Total
              </span>
              <motion.span
                key={total}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: 'var(--color-text-strong)',
                  fontVariantNumeric: 'tabular-nums',
                  marginTop: 2,
                  letterSpacing: '-0.02em',
                }}
              >
                {fmt(total)}
              </motion.span>
              <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
              </span>
            </div>
          </div>

          {/* Top 5 legenda */}
          <div className="space-y-2">
            {categories.slice(0, 5).map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
                      boxShadow: `0 0 8px ${c.solid}66`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--color-text-base)', fontWeight: 600 }} className="truncate">
                    {c.name}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-strong)', fontVariantNumeric: 'tabular-nums' }}>
                  {c.pct.toFixed(1)}%
                </span>
              </motion.div>
            ))}
            {categories.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Wallet style={{ width: 24, height: 24, color: 'var(--color-text-subtle)' }} />
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
                  Sem dados nesse período.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Lista detalhada */}
      <div
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-weak)',
          borderRadius: 'var(--radius-2xl)',
          padding: '8px 4px',
        }}
      >
        {loading && (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-bg-sunken)' }} />
                <div className="flex-1 space-y-2">
                  <div style={{ height: 10, width: '40%', background: 'var(--color-bg-sunken)', borderRadius: 4 }} />
                  <div style={{ height: 6, width: '100%', background: 'var(--color-bg-sunken)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center text-center" style={{ padding: '40px 20px' }}>
            <div
              className="flex items-center justify-center"
              style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-green-50)', marginBottom: 12 }}
            >
              <Wallet style={{ width: 26, height: 26, color: 'var(--color-green-600)' }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-strong)' }}>
              Sem {txType === 'expense' ? 'despesas' : 'receitas'} nesse período
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, maxWidth: 280 }}>
              Lance algumas transações ou troque o período pra ver o breakdown.
            </p>
          </div>
        )}

        {!loading && categories.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, ease: 'easeOut' }}
            whileHover={{ x: 2 }}
            style={{
              padding: '14px 12px',
              borderBottom: i < categories.length - 1 ? '1px solid var(--color-border-weak)' : 'none',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 40, height: 40, borderRadius: '12px',
                    background: `linear-gradient(135deg, ${c.from}1f, ${c.to}33)`,
                    border: `1px solid ${c.solid}33`,
                    color: c.solid,
                    fontSize: 15, fontWeight: 900,
                    boxShadow: `0 4px 12px -4px ${c.solid}40`,
                  }}
                >
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-strong)' }} className="truncate">
                      {c.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: c.solid,
                        background: `${c.solid}14`,
                        padding: '2px 6px',
                        borderRadius: 999,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {c.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: 'var(--color-text-strong)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fmt(c.value)}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginLeft: 52 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${c.pct}%` }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${c.from}, ${c.to})`,
                  borderRadius: 'var(--radius-full)',
                  boxShadow: `0 0 12px ${c.solid}55`,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}