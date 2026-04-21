import {
  UtensilsCrossed,
  ShoppingCart,
  Truck,
  Car,
  Fuel,
  Home,
  Receipt,
  Heart,
  Pill,
  Dumbbell,
  GraduationCap,
  BookOpen,
  Sparkles,
  Film,
  Repeat,
  Shirt,
  Scissors,
  Briefcase,
  CreditCard,
  TrendingDown,
  PawPrint,
  CircleDot,
  Megaphone,
  Package,
  Users,
  Laptop,
  Landmark,
  Monitor,
  TrendingUp,
  Wallet,
  Building2,
  PiggyBank,
  Gift,
  Undo2,
  Wrench,
  Brain,
  Handshake,
  type LucideIcon,
} from "lucide-react";

export type CategoryStyle = {
  Icon: LucideIcon;
  bg: string; // soft background (HSL ok)
  fg: string; // icon color
};

// Paleta suave — usa hex pastel para fundos e tom mais saturado para ícone.
// Light/dark: usamos opacity no bg via rgba para funcionar nos dois temas.
const palette = {
  orange: { bg: "rgba(249, 115, 22, 0.12)", fg: "#EA580C" },
  rose:   { bg: "rgba(244, 63, 94, 0.12)",  fg: "#E11D48" },
  amber:  { bg: "rgba(245, 158, 11, 0.12)", fg: "#D97706" },
  yellow: { bg: "rgba(234, 179, 8, 0.14)",  fg: "#CA8A04" },
  green:  { bg: "rgba(34, 197, 94, 0.12)",  fg: "#16A34A" },
  emerald:{ bg: "rgba(16, 185, 129, 0.12)", fg: "#059669" },
  teal:   { bg: "rgba(20, 184, 166, 0.12)", fg: "#0D9488" },
  cyan:   { bg: "rgba(6, 182, 212, 0.12)",  fg: "#0891B2" },
  blue:   { bg: "rgba(59, 130, 246, 0.12)", fg: "#2563EB" },
  indigo: { bg: "rgba(99, 102, 241, 0.12)", fg: "#4F46E5" },
  violet: { bg: "rgba(139, 92, 246, 0.14)", fg: "#7C3AED" },
  purple: { bg: "rgba(168, 85, 247, 0.12)", fg: "#9333EA" },
  pink:   { bg: "rgba(236, 72, 153, 0.12)", fg: "#DB2777" },
  slate:  { bg: "rgba(100, 116, 139, 0.14)",fg: "#475569" },
};

const MAP: Record<string, CategoryStyle> = {
  // Despesa pessoal
  "Supermercado":   { Icon: ShoppingCart,    ...palette.green  },
  "Alimentação":    { Icon: UtensilsCrossed, ...palette.orange },
  "Restaurante":    { Icon: UtensilsCrossed, ...palette.orange },
  "Delivery":       { Icon: Truck,           ...palette.amber  },
  "Transporte":     { Icon: Car,             ...palette.blue   },
  "Combustível":    { Icon: Fuel,            ...palette.blue   },
  "Uber/Taxi":      { Icon: Car,             ...palette.blue   },
  "Moradia":        { Icon: Home,            ...palette.teal   },
  "Aluguel":        { Icon: Home,            ...palette.teal   },
  "Contas":         { Icon: Receipt,         ...palette.slate  },
  "Saúde":          { Icon: Heart,           ...palette.rose   },
  "Farmácia":       { Icon: Pill,            ...palette.rose   },
  "Academia":       { Icon: Dumbbell,        ...palette.violet },
  "Educação":       { Icon: GraduationCap,   ...palette.indigo },
  "Cursos":         { Icon: BookOpen,        ...palette.indigo },
  "Lazer":          { Icon: Sparkles,        ...palette.purple },
  "Streaming":      { Icon: Film,            ...palette.purple },
  "Assinaturas":    { Icon: Repeat,          ...palette.purple },
  "Vestuário":      { Icon: Shirt,           ...palette.pink   },
  "Roupas":         { Icon: Shirt,           ...palette.pink   },
  "Beleza":         { Icon: Scissors,        ...palette.pink   },
  "Financeiro":     { Icon: Briefcase,       ...palette.slate  },
  "Cartão":         { Icon: CreditCard,      ...palette.slate  },
  "Cartão de Crédito": { Icon: CreditCard,   ...palette.slate  },
  "Dívidas":        { Icon: TrendingDown,    ...palette.rose   },
  "Pets":           { Icon: PawPrint,        ...palette.amber  },
  "Outros":         { Icon: CircleDot,       ...palette.slate  },
  "Outro":          { Icon: CircleDot,       ...palette.slate  },

  // Despesa negócio
  "Marketing":          { Icon: Megaphone,  ...palette.purple },
  "Fornecedor":         { Icon: Package,    ...palette.amber  },
  "Folha de Pagamento": { Icon: Users,      ...palette.blue   },
  "Software":           { Icon: Laptop,     ...palette.indigo },
  "Impostos":           { Icon: Landmark,   ...palette.slate  },
  "Equipamentos":       { Icon: Monitor,    ...palette.cyan   },
  "Logística":          { Icon: Truck,      ...palette.amber  },

  // Receita
  "Salário":         { Icon: Wallet,     ...palette.green   },
  "Freelance":       { Icon: Briefcase,  ...palette.emerald },
  "Vendas":          { Icon: TrendingUp, ...palette.green   },
  "Aluguel Recebido":{ Icon: Building2,  ...palette.teal    },
  "Investimentos":   { Icon: TrendingUp, ...palette.emerald },
  "Dividendos":      { Icon: PiggyBank,  ...palette.emerald },
  "Bônus":           { Icon: Gift,       ...palette.amber   },
  "Renda Extra":     { Icon: Sparkles,   ...palette.green   },
  "Presente":        { Icon: Gift,       ...palette.pink    },
  "Reembolso":       { Icon: Undo2,      ...palette.cyan    },
  "Serviços":        { Icon: Wrench,     ...palette.slate   },
  "Consultoria":     { Icon: Brain,      ...palette.indigo  },
  "Parceria":        { Icon: Handshake,  ...palette.violet  },
};

export function getCategoryStyle(category: string | null | undefined, isIncome = false): CategoryStyle {
  if (category && MAP[category]) return MAP[category];
  return isIncome
    ? { Icon: TrendingUp, ...palette.green }
    : { Icon: CircleDot,  ...palette.slate };
}