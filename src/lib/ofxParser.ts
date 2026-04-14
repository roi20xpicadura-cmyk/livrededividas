import { suggestCategory } from './categorySuggester';

export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  source_id: string;
  category: string;
}

export function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  const matches = content.matchAll(txRegex);

  for (const match of matches) {
    const block = match[1];
    const getValue = (tag: string) => {
      const regex = new RegExp(`<${tag}>([^<\\n]+)`, 'i');
      return block.match(regex)?.[1]?.trim() || '';
    };

    const dtposted = getValue('DTPOSTED');
    const trnamt = parseFloat(getValue('TRNAMT').replace(',', '.') || '0');
    const memo = getValue('MEMO') || getValue('NAME') || 'Sem descrição';
    const fitid = getValue('FITID');

    const dateStr = dtposted.substring(0, 8);
    const date = dateStr.length === 8
      ? `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
      : new Date().toISOString().split('T')[0];

    const type = trnamt > 0 ? 'income' : 'expense';

    transactions.push({
      type,
      amount: Math.abs(trnamt),
      date,
      description: memo,
      source_id: fitid,
      category: suggestCategory(memo) || (type === 'income' ? 'Receita' : 'Outros'),
    });
  }

  return transactions;
}

export function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].toLowerCase().split(sep).map(h => h.trim().replace(/"/g, ''));

  return lines.slice(1).map(line => {
    const cols = line.split(sep).map(c => c.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] || ''));

    const rawAmount = row['valor'] || row['amount'] || row['value'] || '0';
    const amount = parseFloat(rawAmount.replace(/[^\d.,-]/g, '').replace(',', '.'));
    const description = row['descrição'] || row['descricao'] || row['description'] || row['memo'] || '';
    const rawDate = row['data'] || row['date'] || '';

    let date = new Date().toISOString().split('T')[0];
    if (rawDate) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        date = parts[2].length === 4
          ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
          : `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else {
        date = rawDate;
      }
    }

    const type = amount > 0 ? 'income' : 'expense';
    return {
      type,
      amount: Math.abs(amount),
      date,
      description,
      source_id: '',
      category: suggestCategory(description) || (type === 'income' ? 'Receita' : 'Outros'),
    };
  }).filter(t => t.amount > 0 && t.description);
}
