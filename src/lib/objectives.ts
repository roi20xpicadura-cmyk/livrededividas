export const OBJECTIVES = [
  { key: 'debt_free', emoji: '🆘', label: 'Sair das dívidas', desc: 'Organize e quite todas as suas dívidas.', urgent: true },
  { key: 'pay_car', emoji: '🚗', label: 'Quitar o carro', desc: 'Acompanhe as parcelas e quite antes.', urgent: false },
  { key: 'pay_card', emoji: '💳', label: 'Quitar cartão de crédito', desc: 'Livre-se das faturas e juros altos.', urgent: true },
  { key: 'save_money', emoji: '💰', label: 'Juntar dinheiro', desc: 'Crie o hábito de poupar todo mês.', urgent: false },
  { key: 'emergency_fund', emoji: '🛡️', label: 'Reserva de emergência', desc: 'Tenha 6 meses de gastos guardados.', urgent: false },
  { key: 'travel', emoji: '✈️', label: 'Realizar uma viagem', desc: 'Poupe para a viagem dos seus sonhos.', urgent: false },
  { key: 'buy_house', emoji: '🏠', label: 'Comprar imóvel', desc: 'Junte o valor de entrada ou quite.', urgent: false },
  { key: 'invest', emoji: '📈', label: 'Começar a investir', desc: 'Faça seu dinheiro trabalhar por você.', urgent: false },
  { key: 'education', emoji: '🎓', label: 'Pagar estudos', desc: 'Faculdade, curso ou especialização.', urgent: false },
  { key: 'family', emoji: '👶', label: 'Planejar família', desc: 'Filhos, casamento ou novo lar.', urgent: false },
  { key: 'open_business', emoji: '🏪', label: 'Abrir um negócio', desc: 'Junte capital para empreender.', urgent: false },
  { key: 'custom', emoji: '🎯', label: 'Outro objetivo', desc: 'Defina seu próprio objetivo.', urgent: false },
] as const;

export type ObjectiveKey = typeof OBJECTIVES[number]['key'];

export const SMART_TIPS: Record<string, string> = {
  debt_free: '💡 Regra dos 50/30/20: destine 20% da renda para quitar dívidas prioritariamente antes de qualquer investimento.',
  pay_card: '💡 Pague sempre o valor total da fatura — nunca o mínimo. Os juros do cartão chegam a 400% ao ano.',
  save_money: '💡 Automatize suas economias: no dia do pagamento, transfira o valor a guardar imediatamente.',
  emergency_fund: '💡 Meta ideal de reserva: 6 meses dos seus gastos mensais. Comece com R$ 1.000 e aumente gradualmente.',
  invest: '💡 Invista antes de gastar. Trate seus investimentos como uma conta a pagar obrigatória.',
  pay_car: '💡 Considere amortizar parcelas do carro quando tiver extra. Isso reduz os juros totais significativamente.',
  travel: '💡 Crie uma "conta viagem" separada e deposite um valor fixo todo mês. Pesquise milhas e promoções.',
  buy_house: '💡 Para financiamento, a entrada ideal é 30%. Quanto maior a entrada, menores os juros.',
  education: '💡 Pesquise bolsas e financiamentos com juros baixos antes de pagar à vista.',
  family: '💡 O custo médio de um filho no primeiro ano é R$ 20-30 mil. Comece a poupar com antecedência.',
  open_business: '💡 Tenha pelo menos 6 meses de capital de giro antes de abrir. Valide a ideia antes de investir.',
  custom: '💡 Defina metas SMART: Específica, Mensurável, Atingível, Relevante e com Prazo.',
};

// ─────────────────────────────────────────────────────────────
// CATEGORIES — separated by profile (Personal vs Business)
// Stored as Portuguese labels (compatible with existing data).
// ─────────────────────────────────────────────────────────────

export interface CategoryItem {
  label: string;
  emoji: string;
}

export const PERSONAL_EXPENSE_CATEGORIES: CategoryItem[] = [
  // Alimentação
  { label: 'Supermercado', emoji: '🛒' },
  { label: 'Restaurante', emoji: '🍽️' },
  { label: 'Delivery', emoji: '🛵' },
  { label: 'Lanches', emoji: '🥤' },
  // Transporte
  { label: 'Combustível', emoji: '⛽' },
  { label: 'Uber/Taxi', emoji: '🚕' },
  { label: 'Transporte público', emoji: '🚌' },
  { label: 'Estacionamento', emoji: '🅿️' },
  // Moradia
  { label: 'Aluguel', emoji: '🏠' },
  { label: 'Contas (luz/água)', emoji: '💡' },
  { label: 'Internet', emoji: '📶' },
  { label: 'Condomínio', emoji: '🏢' },
  // Saúde
  { label: 'Saúde', emoji: '❤️' },
  { label: 'Farmácia', emoji: '💊' },
  { label: 'Academia', emoji: '🏋️' },
  { label: 'Dentista', emoji: '🦷' },
  // Educação
  { label: 'Educação', emoji: '📚' },
  { label: 'Cursos', emoji: '🎓' },
  { label: 'Livros', emoji: '📖' },
  // Lazer
  { label: 'Lazer', emoji: '🎮' },
  { label: 'Streaming', emoji: '📺' },
  { label: 'Viagem', emoji: '✈️' },
  { label: 'Esportes', emoji: '⚽' },
  // Vestuário
  { label: 'Roupas', emoji: '👕' },
  { label: 'Beleza', emoji: '💄' },
  // Financeiro pessoal
  { label: 'Cartão de Crédito', emoji: '💳' },
  { label: 'Dívidas', emoji: '⚠️' },
  { label: 'Poupança', emoji: '🐷' },
  { label: 'Investimentos', emoji: '📈' },
  // Casa
  { label: 'Casa / Reforma', emoji: '🔨' },
  { label: 'Eletrônicos', emoji: '📱' },
  { label: 'Pets', emoji: '🐾' },
  { label: 'Outros', emoji: '💸' },
];

export const PERSONAL_INCOME_CATEGORIES: CategoryItem[] = [
  { label: 'Salário', emoji: '💼' },
  { label: 'Freelance', emoji: '💻' },
  { label: 'Bônus', emoji: '🎁' },
  { label: 'Aluguel Recebido', emoji: '🏠' },
  { label: 'Rendimentos', emoji: '📊' },
  { label: 'Dividendos', emoji: '💰' },
  { label: 'Presente', emoji: '🎀' },
  { label: 'Venda de itens', emoji: '📦' },
  { label: 'Outras receitas', emoji: '💵' },
];

export const BUSINESS_EXPENSE_CATEGORIES: CategoryItem[] = [
  // Operacional
  { label: 'Fornecedores', emoji: '🏭' },
  { label: 'Matéria-prima', emoji: '📦' },
  { label: 'Escritório', emoji: '🏢' },
  { label: 'Aluguel comercial', emoji: '🔑' },
  { label: 'Contas do negócio', emoji: '💡' },
  { label: 'Equipamentos', emoji: '🖥️' },
  { label: 'Software', emoji: '⚙️' },
  { label: 'Telefone / Internet', emoji: '📱' },
  // Pessoal/RH
  { label: 'Folha de Pagamento', emoji: '👥' },
  { label: 'Prestadores', emoji: '🤝' },
  { label: 'Treinamentos', emoji: '🎓' },
  { label: 'Benefícios', emoji: '❤️' },
  // Vendas / Marketing
  { label: 'Marketing', emoji: '📢' },
  { label: 'Anúncios pagos', emoji: '📣' },
  { label: 'Eventos', emoji: '🎪' },
  { label: 'Brindes / Cortesias', emoji: '🎁' },
  // Logística
  { label: 'Frete / Entrega', emoji: '🚚' },
  { label: 'Combustível', emoji: '⛽' },
  { label: 'Viagens a negócio', emoji: '✈️' },
  // Financeiro
  { label: 'Impostos', emoji: '📋' },
  { label: 'Contabilidade', emoji: '🧾' },
  { label: 'Tarifas bancárias', emoji: '🏦' },
  { label: 'Empréstimos', emoji: '💳' },
  { label: 'Seguros', emoji: '🛡️' },
  // Jurídico
  { label: 'Jurídico', emoji: '⚖️' },
  { label: 'Licenças / Alvarás', emoji: '📜' },
  { label: 'Outros', emoji: '💸' },
];

export const BUSINESS_INCOME_CATEGORIES: CategoryItem[] = [
  { label: 'Vendas', emoji: '📦' },
  { label: 'Serviços', emoji: '🤝' },
  { label: 'Assinaturas', emoji: '🔄' },
  { label: 'Consultoria', emoji: '💡' },
  { label: 'Comissões', emoji: '💰' },
  { label: 'Licenciamento', emoji: '📜' },
  { label: 'Aluguel de espaço', emoji: '🏢' },
  { label: 'Reembolsos', emoji: '↩️' },
  { label: 'Outras receitas', emoji: '💵' },
];

/** New profile-aware accessor returning rich objects (label + emoji). */
export function getCategoriesByProfile(
  txType: 'income' | 'expense',
  profile: 'personal' | 'business'
): CategoryItem[] {
  if (txType === 'expense') {
    return profile === 'business' ? BUSINESS_EXPENSE_CATEGORIES : PERSONAL_EXPENSE_CATEGORIES;
  }
  return profile === 'business' ? BUSINESS_INCOME_CATEGORIES : PERSONAL_INCOME_CATEGORIES;
}

// ── Legacy string-array exports (kept for backward compat) ──
export const PERSONAL_INCOME_CATS = PERSONAL_INCOME_CATEGORIES.map(c => c.label);
export const PERSONAL_EXPENSE_CATS = PERSONAL_EXPENSE_CATEGORIES.map(c => c.label);
export const BUSINESS_INCOME_CATS = BUSINESS_INCOME_CATEGORIES.map(c => c.label);
export const BUSINESS_EXPENSE_CATS = BUSINESS_EXPENSE_CATEGORIES.map(c => c.label);

export function getCategories(profileType: string, txType: 'income' | 'expense') {
  if (profileType === 'personal') return txType === 'income' ? PERSONAL_INCOME_CATS : PERSONAL_EXPENSE_CATS;
  if (profileType === 'business') return txType === 'income' ? BUSINESS_INCOME_CATS : BUSINESS_EXPENSE_CATS;
  // both
  if (txType === 'income') return [
    { group: '💼 Negócio', items: BUSINESS_INCOME_CATS },
    { group: '🏠 Pessoal', items: PERSONAL_INCOME_CATS },
  ];
  return [
    { group: '💼 Negócio', items: BUSINESS_EXPENSE_CATS },
    { group: '🏠 Pessoal', items: PERSONAL_EXPENSE_CATS },
  ];
}

export function getObjectiveBorderColor(type: string) {
  if (['debt_free', 'pay_card'].includes(type)) return 'border-red-300';
  if (['save_money', 'emergency_fund'].includes(type)) return 'border-primary';
  if (['invest', 'open_business'].includes(type)) return 'border-blue-400';
  if (['travel', 'buy_house', 'education'].includes(type)) return 'border-amber-400';
  return 'border-border';
}
