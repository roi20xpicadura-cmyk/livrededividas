const CATEGORY_RULES: Record<string, string[]> = {
  'Alimentação': ['ifood','rappi','mcdonalds','burger','pizza','mercado','supermercado','padaria','restaurante','lanchonete','sushi','açougue','hortifruti','pão de açúcar','extra','carrefour','walmart'],
  'Transporte': ['uber','99','cabify','táxi','combustível','posto','gasolina','diesel','parking','estacionamento','metrô','ônibus','passagem'],
  'Moradia': ['aluguel','condomínio','iptu','água','luz','energia','gás','internet','net','vivo','claro','tim','oi'],
  'Saúde': ['farmácia','drogasil','ultrafarma','consulta','médico','dentista','plano de saúde','amil','sulamerica','unimed','exame','hospital'],
  'Educação': ['curso','faculdade','escola','mensalidade','livro','alura','udemy','coursera','inglês','idioma'],
  'Lazer': ['cinema','netflix','spotify','steam','jogos','show','teatro','parque','viagem','hotel','airbnb','booking'],
  'Assinaturas': ['netflix','spotify','amazon','prime','youtube','icloud','google one','microsoft','adobe','canva'],
  'Roupas': ['renner','riachuelo','hm','zara','shein','netshoes','centauro'],
  'Marketing': ['facebook ads','google ads','tiktok ads','instagram','meta','tráfego','impulsionar'],
  'Software': ['aws','vercel','supabase','github','figma','notion','slack'],
  'Salários Equipe': ['salário','folha','pagamento funcionário','pro labore'],
  'Impostos': ['das','simples','irpf','icms','iss','nota fiscal'],
};

export function suggestCategory(description: string): string | null {
  // Check learned patterns first
  const learned = getLearnedCategory(description);
  if (learned) return learned;

  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some(k => lower.includes(k))) return category;
  }
  return null;
}

export function learnCategoryPattern(description: string, category: string) {
  const patterns = JSON.parse(localStorage.getItem('categoryPatterns') || '{}');
  patterns[description.toLowerCase().trim()] = category;
  localStorage.setItem('categoryPatterns', JSON.stringify(patterns));
}

function getLearnedCategory(description: string): string | null {
  const patterns = JSON.parse(localStorage.getItem('categoryPatterns') || '{}');
  return patterns[description.toLowerCase().trim()] || null;
}
