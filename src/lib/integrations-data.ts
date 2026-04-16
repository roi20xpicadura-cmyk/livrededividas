export type IntegrationStatus = 'available' | 'coming_soon' | 'pro_required';
export type IntegrationCategory = 'bancos' | 'ecommerce' | 'pagamentos' | 'infoprodutos' | 'contabilidade' | 'outros';
export type IntegrationMethod = 'ofx_import' | 'webhook' | 'api_key' | 'oauth';

export interface IntegrationDef {
  id: string;
  name: string;
  domain: string;
  color: string;
  description: string;
  imports: string[];
  status: IntegrationStatus;
  category: IntegrationCategory;
  method: IntegrationMethod;
  plan?: 'pro';
  instructions?: string[];
}

export const getLogoUrl = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

export const INTEGRATIONS: IntegrationDef[] = [
  // ─── BANCOS ───
  { id: 'nubank', name: 'Nubank', domain: 'nubank.com.br', color: '#820AD1', description: 'Importe extratos, faturas e transações do Nubank automaticamente via Open Finance.', imports: ['Extrato', 'Fatura', 'Pix'], status: 'available', category: 'bancos', method: 'ofx_import', instructions: ['Abra o app do Nubank', 'Toque em "Meu perfil" → "Extrato"', 'Toque no ícone de compartilhar (↑)', 'Selecione "Exportar OFX"', 'Volte aqui e faça o upload do arquivo'] },
  { id: 'itau', name: 'Itaú', domain: 'itau.com.br', color: '#EC7000', description: 'Conecte sua conta Itaú e importe todas as movimentações bancárias.', imports: ['Extrato', 'Investimentos', 'Cartão'], status: 'available', category: 'bancos', method: 'ofx_import', instructions: ['Acesse o Internet Banking do Itaú', 'Vá em "Extrato e Lançamentos"', 'Clique em "Exportar extrato"', 'Escolha o período e formato OFX', 'Faça o upload aqui abaixo'] },
  { id: 'bradesco', name: 'Bradesco', domain: 'bradesco.com.br', color: '#CC0000', description: 'Sincronize transações e extratos do Bradesco com um clique.', imports: ['Extrato', 'Cartão', 'Poupança'], status: 'available', category: 'bancos', method: 'ofx_import', instructions: ['Abra o app ou Internet Banking Bradesco', 'Acesse "Extrato"', 'Selecione o período desejado', 'Clique em "Download" → formato OFX', 'Faça o upload abaixo'] },
  { id: 'bb', name: 'Banco do Brasil', domain: 'bb.com.br', color: '#FFDD00', description: 'Importe movimentações da sua conta Banco do Brasil.', imports: ['Extrato', 'Poupança', 'Cartão'], status: 'available', category: 'bancos', method: 'ofx_import', instructions: ['Acesse o app ou BB.com.br', 'Vá em "Extrato"', 'Clique em "Exportar"', 'Selecione OFX e o período', 'Faça upload aqui'] },
  { id: 'inter', name: 'Inter', domain: 'bancointer.com.br', color: '#FF7A00', description: 'Conecte o Banco Inter e importe extrato, investimentos e cartão.', imports: ['Extrato', 'Cartão', 'Investimentos'], status: 'available', category: 'bancos', method: 'ofx_import', instructions: ['Abra o app do Banco Inter', 'Acesse "Extrato"', 'Toque em "Exportar extrato"', 'Escolha o formato OFX', 'Faça upload abaixo'] },
  { id: 'santander', name: 'Santander', domain: 'santander.com.br', color: '#EC0000', description: 'Sincronize sua conta Santander e acompanhe todas as movimentações.', imports: ['Extrato', 'Cartão', 'Crédito'], status: 'available', category: 'bancos', method: 'ofx_import', instructions: ['Acesse o Internet Banking Santander', 'Vá em "Extrato"', 'Clique em "Exportar"', 'Selecione OFX/QIF e o período', 'Faça upload abaixo'] },
  { id: 'caixa', name: 'Caixa Econômica', domain: 'caixa.gov.br', color: '#0C4C8A', description: 'Importe extratos e movimentações da Caixa Econômica Federal.', imports: ['Extrato', 'Poupança', 'FGTS'], status: 'available', category: 'bancos', method: 'ofx_import' },
  { id: 'c6bank', name: 'C6 Bank', domain: 'c6bank.com.br', color: '#1A1A1A', description: 'Conecte o C6 Bank e importe transações, cartão e investimentos.', imports: ['Extrato', 'Cartão', 'Investimentos'], status: 'available', category: 'bancos', method: 'ofx_import' },
  { id: 'sicoob', name: 'Sicoob', domain: 'sicoob.com.br', color: '#007A3D', description: 'Integre sua conta cooperativa Sicoob ao KoraFinance.', imports: ['Extrato', 'Poupança'], status: 'available', category: 'bancos', method: 'ofx_import' },
  { id: 'xp', name: 'XP Investimentos', domain: 'xpi.com.br', color: '#000000', description: 'Importe sua carteira de investimentos da XP automaticamente.', imports: ['Carteira', 'Rendimentos', 'Extrato'], status: 'coming_soon', category: 'bancos', method: 'api_key' },

  // ─── E-COMMERCE ───
  { id: 'shopify', name: 'Shopify', domain: 'shopify.com', color: '#96BF48', description: 'Importe vendas, pedidos e clientes da sua loja Shopify automaticamente.', imports: ['Vendas', 'Pedidos', 'Clientes', 'Produtos'], status: 'available', category: 'ecommerce', method: 'webhook', plan: 'pro' },
  { id: 'woocommerce', name: 'WooCommerce', domain: 'woocommerce.com', color: '#96588A', description: 'Sincronize receitas e pedidos do WooCommerce com seu painel financeiro.', imports: ['Vendas', 'Pedidos', 'Reembolsos'], status: 'available', category: 'ecommerce', method: 'webhook', plan: 'pro' },
  { id: 'yampi', name: 'Yampi', domain: 'yampi.com.br', color: '#6C5CE7', description: 'Conecte sua loja Yampi e importe vendas e métricas financeiras.', imports: ['Vendas', 'Pedidos', 'Clientes'], status: 'available', category: 'ecommerce', method: 'webhook', plan: 'pro' },
  { id: 'nuvemshop', name: 'Nuvemshop', domain: 'nuvemshop.com.br', color: '#1CDAC5', description: 'Integre sua Nuvemshop e acompanhe receitas de e-commerce no painel.', imports: ['Vendas', 'Pedidos', 'Produtos'], status: 'available', category: 'ecommerce', method: 'webhook', plan: 'pro' },
  { id: 'lojaintegrada', name: 'Loja Integrada', domain: 'lojaintegrada.com.br', color: '#2563EB', description: 'Importe dados financeiros da sua Loja Integrada.', imports: ['Vendas', 'Pedidos'], status: 'coming_soon', category: 'ecommerce', method: 'webhook' },
  { id: 'mercadolivre', name: 'Mercado Livre', domain: 'mercadolivre.com.br', color: '#FFE600', description: 'Sincronize vendas e receitas do Mercado Livre com seu painel.', imports: ['Vendas', 'Reputação', 'Repasses'], status: 'coming_soon', category: 'ecommerce', method: 'api_key' },

  // ─── PAGAMENTOS ───
  { id: 'mercadopago', name: 'Mercado Pago', domain: 'mercadopago.com.br', color: '#009EE3', description: 'Importe recebimentos, repasses e extrato do Mercado Pago.', imports: ['Recebimentos', 'Repasses', 'Extrato'], status: 'available', category: 'pagamentos', method: 'webhook', plan: 'pro' },
  { id: 'pagseguro', name: 'PagSeguro', domain: 'pagseguro.com.br', color: '#00B140', description: 'Conecte o PagSeguro e acompanhe todos os recebimentos.', imports: ['Recebimentos', 'Extrato', 'Maquininha'], status: 'available', category: 'pagamentos', method: 'webhook', plan: 'pro' },
  { id: 'stripe', name: 'Stripe', domain: 'stripe.com', color: '#635BFF', description: 'Importe receitas de assinaturas e pagamentos do Stripe.', imports: ['Receitas', 'Assinaturas', 'Reembolsos'], status: 'available', category: 'pagamentos', method: 'webhook', plan: 'pro' },
  { id: 'paypal', name: 'PayPal', domain: 'paypal.com', color: '#003087', description: 'Sincronize recebimentos e pagamentos do PayPal.', imports: ['Recebimentos', 'Pagamentos', 'Extrato'], status: 'available', category: 'pagamentos', method: 'webhook', plan: 'pro' },
  { id: 'pix', name: 'Pix (Banco Central)', domain: 'bcb.gov.br', color: '#32BCAD', description: 'Importe recebimentos via Pix direto de qualquer banco brasileiro.', imports: ['Recebimentos Pix', 'QR Codes'], status: 'coming_soon', category: 'pagamentos', method: 'api_key' },
  { id: 'cielo', name: 'Cielo', domain: 'cielo.com.br', color: '#004B8D', description: 'Conecte sua maquininha Cielo e importe todas as vendas.', imports: ['Vendas', 'Recebíveis', 'Antecipações'], status: 'coming_soon', category: 'pagamentos', method: 'api_key' },

  // ─── INFOPRODUTOS ───
  { id: 'hotmart', name: 'Hotmart', domain: 'hotmart.com', color: '#F04E23', description: 'Importe vendas, comissões e afiliados da Hotmart automaticamente.', imports: ['Vendas', 'Comissões', 'Reembolsos', 'Afiliados'], status: 'available', category: 'infoprodutos', method: 'webhook', plan: 'pro' },
  { id: 'kiwify', name: 'Kiwify', domain: 'kiwify.com.br', color: '#00C853', description: 'Sincronize receitas e métricas de vendas da Kiwify.', imports: ['Vendas', 'Assinaturas', 'Afiliados'], status: 'available', category: 'infoprodutos', method: 'webhook', plan: 'pro' },
  { id: 'eduzz', name: 'Eduzz', domain: 'eduzz.com', color: '#FF6B00', description: 'Conecte a Eduzz e acompanhe todas as suas receitas de infoprodutos.', imports: ['Vendas', 'Comissões', 'Reembolsos'], status: 'available', category: 'infoprodutos', method: 'webhook', plan: 'pro' },
  { id: 'monetizze', name: 'Monetizze', domain: 'monetizze.com.br', color: '#8B5CF6', description: 'Importe vendas e repasses da Monetizze para seu painel financeiro.', imports: ['Vendas', 'Repasses', 'Afiliados'], status: 'available', category: 'infoprodutos', method: 'webhook', plan: 'pro' },
  { id: 'perfectpay', name: 'Perfect Pay', domain: 'perfectpay.com.br', color: '#1A73E8', description: 'Sincronize receitas e métricas de vendas da Perfect Pay.', imports: ['Vendas', 'Assinaturas'], status: 'coming_soon', category: 'infoprodutos', method: 'webhook' },
  { id: 'ticto', name: 'Ticto', domain: 'ticto.app', color: '#7C3AED', description: 'Importe dados financeiros da plataforma Ticto.', imports: ['Vendas', 'Assinaturas'], status: 'coming_soon', category: 'infoprodutos', method: 'webhook' },

  // ─── CONTABILIDADE ───
  { id: 'contaazul', name: 'Conta Azul', domain: 'contaazul.com', color: '#0066CC', description: 'Sincronize dados financeiros com o Conta Azul e mantenha sua contabilidade atualizada.', imports: ['NF-e', 'Lançamentos', 'DRE'], status: 'coming_soon', category: 'contabilidade', method: 'api_key' },
  { id: 'quickbooks', name: 'QuickBooks', domain: 'quickbooks.intuit.com', color: '#2CA01C', description: 'Integre com o QuickBooks para sincronizar dados contábeis.', imports: ['Lançamentos', 'Relatórios', 'NF-e'], status: 'coming_soon', category: 'contabilidade', method: 'api_key' },
  { id: 'omie', name: 'Omie', domain: 'omie.com.br', color: '#FF6B35', description: 'Conecte o ERP Omie e sincronize dados financeiros empresariais.', imports: ['Notas Fiscais', 'Contas a Pagar', 'DRE'], status: 'coming_soon', category: 'contabilidade', method: 'api_key' },

  // ─── OUTROS ───
  { id: 'googlesheets', name: 'Google Sheets', domain: 'sheets.google.com', color: '#34A853', description: 'Exporte dados financeiros para planilhas do Google Sheets automaticamente.', imports: ['Lançamentos', 'Relatórios', 'Metas'], status: 'available', category: 'outros', method: 'api_key', plan: 'pro' },
  { id: 'notion', name: 'Notion', domain: 'notion.so', color: '#000000', description: 'Sincronize resumos financeiros com suas páginas do Notion.', imports: ['Resumo Mensal', 'Metas', 'Score'], status: 'coming_soon', category: 'outros', method: 'api_key' },
  { id: 'whatsapp', name: 'WhatsApp (via API)', domain: 'whatsapp.com', color: '#25D366', description: 'Receba alertas e resumos financeiros direto no seu WhatsApp.', imports: ['Alertas', 'Resumo Diário', 'Vencimentos'], status: 'coming_soon', category: 'outros', method: 'api_key' },
];

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  bancos: 'Bancos',
  ecommerce: 'E-commerce',
  pagamentos: 'Pagamentos',
  infoprodutos: 'Infoprodutos',
  contabilidade: 'Contabilidade',
  outros: 'Outros',
};

export const CATEGORY_EMOJI: Record<IntegrationCategory, string> = {
  bancos: '🏦',
  ecommerce: '🛒',
  pagamentos: '💳',
  infoprodutos: '🎓',
  contabilidade: '📊',
  outros: '⚡',
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  bancos: { bg: '#eff6ff', text: '#1d4ed8' },
  ecommerce: { bg: '#F5F3FF', text: '#6D28D9' },
  pagamentos: { bg: '#fef9c3', text: '#854d0e' },
  infoprodutos: { bg: '#fdf4ff', text: '#7e22ce' },
  contabilidade: { bg: '#fff7ed', text: '#c2410c' },
  outros: { bg: '#f8fafc', text: '#475569' },
};

export const CATEGORY_COUNTS: Record<string, number> = {
  all: INTEGRATIONS.length,
  bancos: INTEGRATIONS.filter(i => i.category === 'bancos').length,
  ecommerce: INTEGRATIONS.filter(i => i.category === 'ecommerce').length,
  pagamentos: INTEGRATIONS.filter(i => i.category === 'pagamentos').length,
  infoprodutos: INTEGRATIONS.filter(i => i.category === 'infoprodutos').length,
  contabilidade: INTEGRATIONS.filter(i => i.category === 'contabilidade').length,
  outros: INTEGRATIONS.filter(i => i.category === 'outros').length,
};
