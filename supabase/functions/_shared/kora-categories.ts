// supabase/functions/_shared/kora-categories.ts
//
// Listas de categorias válidas — espelhadas de src/lib/objectives.ts.
// Mantenha em sync manualmente: Edge functions Deno não conseguem importar
// de src/. Se adicionar categoria nova no frontend, atualize aqui.
//
// Uso:
//   - kora-tools injeta a lista no system prompt pra IA propor só categorias reais
//   - performAction valida e mapeia "Outros" quando LLM inventar uma fora da lista

export const PERSONAL_EXPENSE_CATEGORIES = [
  "Supermercado", "Restaurante", "Delivery", "Lanches",
  "Combustível", "Uber/Taxi", "Transporte público", "Estacionamento",
  "Aluguel", "Contas (luz/água)", "Internet", "Condomínio",
  "Saúde", "Farmácia", "Academia", "Dentista",
  "Educação", "Cursos", "Livros",
  "Lazer", "Streaming", "Viagem", "Esportes",
  "Roupas", "Beleza",
  "Cartão de Crédito", "Dívidas", "Poupança", "Investimentos",
  "Casa / Reforma", "Eletrônicos", "Pets", "Outros",
] as const;

export const PERSONAL_INCOME_CATEGORIES = [
  "Salário", "Freelance", "Bônus", "Aluguel Recebido", "Rendimentos",
  "Dividendos", "Presente", "Venda de itens", "Outras receitas",
] as const;

export const BUSINESS_EXPENSE_CATEGORIES = [
  "Fornecedores", "Matéria-prima", "Escritório", "Aluguel comercial",
  "Contas do negócio", "Equipamentos", "Software", "Telefone / Internet",
  "Folha de Pagamento", "Prestadores", "Treinamentos", "Benefícios",
  "Marketing", "Anúncios pagos", "Eventos", "Brindes / Cortesias",
  "Frete / Entrega", "Combustível", "Viagens a negócio",
  "Impostos", "Contabilidade", "Tarifas bancárias", "Empréstimos", "Seguros",
  "Jurídico", "Licenças / Alvarás", "Outros",
] as const;

export const BUSINESS_INCOME_CATEGORIES = [
  "Vendas", "Serviços", "Assinaturas", "Consultoria", "Comissões",
  "Licenciamento", "Aluguel de espaço", "Reembolsos", "Outras receitas",
] as const;

export type TransactionOrigin = "personal" | "business";
export type TransactionType = "income" | "expense";

/**
 * Retorna a lista de categorias válidas pra um par (origin, type).
 */
export function getValidCategories(
  origin: TransactionOrigin,
  type: TransactionType,
): readonly string[] {
  if (type === "expense") {
    return origin === "business" ? BUSINESS_EXPENSE_CATEGORIES : PERSONAL_EXPENSE_CATEGORIES;
  }
  return origin === "business" ? BUSINESS_INCOME_CATEGORIES : PERSONAL_INCOME_CATEGORIES;
}

/**
 * Normaliza uma categoria proposta pela IA: se não for válida, retorna "Outros".
 */
export function normalizeCategory(
  proposed: string | undefined,
  origin: TransactionOrigin,
  type: TransactionType,
): string {
  const valid = getValidCategories(origin, type);
  if (!proposed) return type === "income" ? "Outras receitas" : "Outros";
  const trimmed = proposed.trim();
  if (valid.includes(trimmed)) return trimmed;
  // Tenta match case-insensitive
  const lower = trimmed.toLowerCase();
  const found = valid.find((c) => c.toLowerCase() === lower);
  if (found) return found;
  return type === "income" ? "Outras receitas" : "Outros";
}
