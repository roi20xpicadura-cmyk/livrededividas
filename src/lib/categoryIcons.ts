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

// Paleta suave com tokens HSL do tema — evita vermelhos/rosas em ícones comuns.
const palette = {
  brand: { bg: "hsl(var(--primary) / 0.12)", fg: "hsl(var(--primary))" },
  brandSoft: { bg: "hsl(var(--primary) / 0.08)", fg: "hsl(var(--primary))" },
  amber:  { bg: "hsl(var(--warning) / 0.12)", fg: "hsl(var(--warning))" },
  green:  { bg: "hsl(var(--success) / 0.12)", fg: "hsl(var(--success))" },
  emerald:{ bg: "hsl(var(--success) / 0.12)", fg: "hsl(var(--success))" },
  blue:   { bg: "hsl(var(--blue) / 0.12)", fg: "hsl(var(--blue))" },
  slate:  { bg: "hsl(var(--muted) / 0.35)", fg: "hsl(var(--muted-foreground))" },
};

const MAP: Record<string, CategoryStyle> = {
  // Despesa pessoal
  "Supermercado":   { Icon: ShoppingCart,    ...palette.green  },
  "Alimentação":    { Icon: UtensilsCrossed, ...palette.amber  },
  "Restaurante":    { Icon: UtensilsCrossed, ...palette.amber  },
  "Delivery":       { Icon: Truck,           ...palette.amber  },
  "Transporte":     { Icon: Car,             ...palette.blue   },
  "Combustível":    { Icon: Fuel,            ...palette.blue   },
  "Uber/Taxi":      { Icon: Car,             ...palette.blue   },
  "Moradia":        { Icon: Home,            ...palette.blue   },
  "Aluguel":        { Icon: Home,            ...palette.blue   },
  "Contas":         { Icon: Receipt,         ...palette.slate  },
  "Saúde":          { Icon: Heart,           ...palette.blue   },
  "Farmácia":       { Icon: Pill,            ...palette.blue   },
  "Academia":       { Icon: Dumbbell,        ...palette.brand  },
  "Educação":       { Icon: GraduationCap,   ...palette.brand  },
  "Cursos":         { Icon: BookOpen,        ...palette.brand  },
  "Lazer":          { Icon: Sparkles,        ...palette.brand  },
  "Streaming":      { Icon: Film,            ...palette.brand  },
  "Assinaturas":    { Icon: Repeat,          ...palette.brand  },
  "Vestuário":      { Icon: Shirt,           ...palette.brandSoft },
  "Roupas":         { Icon: Shirt,           ...palette.brandSoft },
  "Beleza":         { Icon: Scissors,        ...palette.brandSoft },
  "Financeiro":     { Icon: Briefcase,       ...palette.slate  },
  "Cartão":         { Icon: CreditCard,      ...palette.slate  },
  "Cartão de Crédito": { Icon: CreditCard,   ...palette.slate  },
  "Dívidas":        { Icon: TrendingDown,    ...palette.amber  },
  "Pets":           { Icon: PawPrint,        ...palette.amber  },
  "Outros":         { Icon: CircleDot,       ...palette.slate  },
  "Outro":          { Icon: CircleDot,       ...palette.slate  },

  // Despesa negócio
  "Marketing":          { Icon: Megaphone,  ...palette.brand  },
  "Fornecedor":         { Icon: Package,    ...palette.amber  },
  "Folha de Pagamento": { Icon: Users,      ...palette.blue   },
  "Software":           { Icon: Laptop,     ...palette.brand  },
  "Impostos":           { Icon: Landmark,   ...palette.slate  },
  "Equipamentos":       { Icon: Monitor,    ...palette.blue   },
  "Logística":          { Icon: Truck,      ...palette.amber  },

  // Receita
  "Salário":         { Icon: Wallet,     ...palette.green   },
  "Freelance":       { Icon: Briefcase,  ...palette.emerald },
  "Vendas":          { Icon: TrendingUp, ...palette.green   },
  "Aluguel Recebido":{ Icon: Building2,  ...palette.blue    },
  "Investimentos":   { Icon: TrendingUp, ...palette.emerald },
  "Dividendos":      { Icon: PiggyBank,  ...palette.emerald },
  "Bônus":           { Icon: Gift,       ...palette.amber   },
  "Renda Extra":     { Icon: Sparkles,   ...palette.green   },
  "Presente":        { Icon: Gift,       ...palette.brandSoft },
  "Reembolso":       { Icon: Undo2,      ...palette.blue    },
  "Serviços":        { Icon: Wrench,     ...palette.slate   },
  "Consultoria":     { Icon: Brain,      ...palette.brand   },
  "Parceria":        { Icon: Handshake,  ...palette.brand   },
};

export function getCategoryStyle(category: string | null | undefined, isIncome = false): CategoryStyle {
  if (category && MAP[category]) return MAP[category];
  return isIncome
    ? { Icon: TrendingUp, ...palette.green }
    : { Icon: CircleDot,  ...palette.slate };
}