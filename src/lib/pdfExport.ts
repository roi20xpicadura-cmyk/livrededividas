import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TxRow {
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  origin: string;
}

interface ReportData {
  transactions: TxRow[];
  userName: string;
  period: string;
  currency: string;
}

export function generateMonthlyPDF({ transactions, userName, period, currency }: ReportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;

  const fmtMoney = (v: number) =>
    `${currency} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Header ──
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, pageW, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('KoraFinance', margin, 16);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Relatório Financeiro — ${period}`, margin, 26);
  doc.setFontSize(9);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • ${userName}`, margin, 33);

  // ── Summary ──
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  let y = 46;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do Período', margin, y);
  y += 10;

  const boxW = (pageW - margin * 2 - 8) / 3;
  const boxes = [
    { label: 'Receitas', value: fmtMoney(income), color: [22, 163, 74] as [number, number, number] },
    { label: 'Despesas', value: fmtMoney(expense), color: [220, 38, 38] as [number, number, number] },
    { label: 'Saldo', value: fmtMoney(balance), color: balance >= 0 ? [22, 163, 74] as [number, number, number] : [220, 38, 38] as [number, number, number] },
  ];

  boxes.forEach((box, i) => {
    const x = margin + i * (boxW + 4);
    doc.setFillColor(245, 247, 245);
    doc.roundedRect(x, y, boxW, 22, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(box.label, x + 6, y + 8);
    doc.setFontSize(13);
    doc.setTextColor(...box.color);
    doc.setFont('helvetica', 'bold');
    doc.text(box.value, x + 6, y + 17);
  });

  y += 30;

  // ── Category breakdown ──
  const catMap: Record<string, { income: number; expense: number }> = {};
  transactions.forEach(t => {
    if (!catMap[t.category]) catMap[t.category] = { income: 0, expense: 0 };
    catMap[t.category][t.type as 'income' | 'expense'] += t.amount;
  });

  const catRows = Object.entries(catMap)
    .sort((a, b) => (b[1].expense + b[1].income) - (a[1].expense + a[1].income))
    .slice(0, 10);

  if (catRows.length > 0) {
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Categorias', margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Categoria', 'Receitas', 'Despesas', 'Líquido']],
      body: catRows.map(([cat, v]) => [
        cat,
        fmtMoney(v.income),
        fmtMoney(v.expense),
        fmtMoney(v.income - v.expense),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 248] },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Transaction table ──
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Lançamentos', margin, y);
  y += 4;

  const sortedTx = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  autoTable(doc, {
    startY: y,
    head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
    body: sortedTx.map(t => [
      format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy'),
      t.description.substring(0, 40),
      t.category,
      t.type === 'income' ? 'Receita' : 'Despesa',
      fmtMoney(t.amount),
    ]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 248] },
    columnStyles: {
      4: { halign: 'right' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const row = sortedTx[data.row.index];
        if (row) {
          data.cell.styles.textColor = row.type === 'expense' ? [220, 38, 38] : [22, 163, 74];
        }
      }
    },
  });

  // ── Footer on each page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(`KoraFinance • ${period} • Página ${i}/${totalPages}`, margin, h - 8);
  }

  doc.save(`kora-relatorio-${period.replace(/\s/g, '-').toLowerCase()}.pdf`);
}
