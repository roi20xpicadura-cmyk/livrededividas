const BANK_CATEGORY_RULES: Record<string, string[]> = {
  'Alimentação': [
    'ifood','rappi','uber eats','james delivery',
    'mcdonalds','burger king','subway','giraffas',
    'outback','spoleto','madero','habibs',
    'pão de açúcar','carrefour','extra','walmart',
    'atacadão','assaí','makro','oba hortifruti',
    'mercado','supermercado','padaria','restaurante',
    'lanchonete','sushi','açougue','hortifruti',
  ],
  'Transporte': [
    'uber','99','cabify','sem parar','veloe',
    'conectcar','movida','localiza','hertz',
    'petrobras','ipiranga','shell','posto',
    'metrô','sptrans','bilhete único',
    'combustível','gasolina','diesel','estacionamento',
  ],
  'Saúde': [
    'drogasil','ultrafarma','droga raia','pacheco',
    'fleury','dasa','einstein','hospital','clínica',
    'lab','dr.','dra.','dentista','amil','bradesco saúde',
    'farmácia','consulta','médico','plano de saúde',
    'sulamerica','unimed','exame',
  ],
  'Educação': [
    'alura','udemy','coursera',
    'duolingo','wizard','cultura inglesa',
    'fgv','insper','ibmec','anhanguera','estácio',
    'curso','faculdade','escola','mensalidade','livro','inglês','idioma',
  ],
  'Lazer': [
    'netflix','spotify','amazon prime','disney',
    'hbo','globoplay','telecine','apple tv',
    'steam','playstation','xbox','nintendo',
    'ingresso','sympla','eventbrite',
    'cinema','show','teatro','parque','viagem','hotel','airbnb','booking',
  ],
  'Moradia': [
    'aluguel','condomínio','luz','energia',
    'enel','cpfl','cemig','sabesp','copasa',
    'vivo','claro','tim','oi','net',
    'iptu','água','gás','internet',
  ],
  'Vestuário': [
    'renner','riachuelo','hering','zara','h&m',
    'shein','shopee','netshoes','centauro',
  ],
  'Finanças': [
    'ted','doc','pix','tarifa','juros',
    'anuidade','seguro','financiamento','parcela',
  ],
  'Assinaturas': [
    'icloud','google one','microsoft','adobe','canva',
    'youtube premium',
  ],
  'Marketing': [
    'facebook ads','google ads','tiktok ads','instagram','meta','tráfego','impulsionar',
  ],
  'Software': [
    'aws','vercel','supabase','github','figma','notion','slack',
  ],
  'Salários Equipe': [
    'salário','folha','pagamento funcionário','pro labore',
  ],
  'Impostos': [
    'das','simples','irpf','icms','iss','nota fiscal',
  ],
};

export function suggestBankCategory(description: string, merchantName?: string | null): string {
  const text = `${merchantName || ''} ${description}`.toLowerCase();
  for (const [category, keywords] of Object.entries(BANK_CATEGORY_RULES)) {
    if (keywords.some(k => text.includes(k))) return category;
  }
  return 'Outros';
}
