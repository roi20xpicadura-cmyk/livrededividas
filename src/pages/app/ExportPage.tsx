import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { generateMonthlyPDF } from '@/lib/pdfExport';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { FileText, Table, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Tx = {
  date: string; description: string; amount: number;
  type: string; category: string; origin: string;
};

export function ExportPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const targetDate = subMonths(new Date(), monthOffset);
  const period = format(targetDate, "MMMM 'de' yyyy", { locale: ptBR });
  const periodCapitalized = period.charAt(0).toUpperCase() + period.slice(1);

  useEffect(() => {
    if (!user) return;
    const start = format(startOfMonth(targetDate), 'yyyy-MM-dd');
    const end = format(endOfMonth(targetDate), 'yyyy-MM-dd');
    setLoading(true);
    supabase.from('transactions').select('date,description,amount,type,category,origin')
      .eq('user_id', user.id).gte('date', start).lte('date', end).is('deleted_at', null)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setTxs((data || []) as Tx[]);
        setLoading(false);
      });
  }, [user, monthOffset]);

  const totals = useMemo(() => {
    const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { inc, exp, net: inc - exp };
  }, [txs]);

  const handlePDF = async () => {
    if (txs.length === 0) {
      toast.error('Nenhum lançamento neste período');
      return;
    }
    setGenerating(true);
    try {
      generateMonthlyPDF({
        transactions: txs,
        userName: profile?.full_name || 'Usuário',
        period: periodCapitalized,
        currency: 'R$',
      });
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
    setGenerating(false);
  };

  const handleCSV = () => {
    if (txs.length === 0) {
      toast.error('Nenhum lançamento neste período');
      return;
    }
    const header = "Data,Descrição,Valor,Tipo,Origem,Categoria\n";
    const rows = txs.map(t =>
      `${t.date},"${t.description}",${t.amount},${t.type === 'income' ? 'Receita' : 'Despesa'},${t.origin === 'business' ? 'Negócio' : 'Pessoal'},"${t.category}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kora-lancamentos-${format(targetDate, 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  };

  const handleJSON = () => {
    const blob = new Blob([JSON.stringify(txs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kora-backup-${format(targetDate, 'yyyy-MM')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exportado!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Period selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)' }}>
        <button onClick={() => setMonthOffset(prev => prev + 1)}
          className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-sunken)', color: 'var(--color-text-muted)' }}>
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </button>
        <div className="text-center">
          <p className="text-sm font-extrabold" style={{ color: 'var(--color-text-strong)' }}>{periodCapitalized}</p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>{txs.length} lançamentos</p>
        </div>
        <button onClick={() => setMonthOffset(prev => Math.max(0, prev - 1))} disabled={monthOffset === 0}
          className="flex items-center justify-center disabled:opacity-30" style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-sunken)', color: 'var(--color-text-muted)' }}>
          <ChevronRight style={{ width: 16, height: 16 }} />
        </button>
      </motion.div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3">
        {[
          { label: 'Receitas', value: totals.inc, color: 'var(--color-success-solid)' },
          { label: 'Despesas', value: totals.exp, color: 'var(--color-danger-solid)' },
          { label: 'Saldo', value: totals.net, color: totals.net >= 0 ? 'var(--color-success-solid)' : 'var(--color-danger-solid)' },
        ].map(item => (
          <div key={item.label} className="p-3 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-weak)' }}>
            <p className="text-[10px] font-bold" style={{ color: 'var(--color-text-subtle)' }}>{item.label}</p>
            <p className="text-sm font-black mt-1" style={{ color: item.color }}>
              {loading ? '...' : `R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Export buttons */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={handlePDF} disabled={generating || loading}
          className="flex flex-col items-center p-6 rounded-xl border-[1.5px] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
          style={{ borderColor: 'var(--color-border-base)', background: 'var(--color-bg-surface)' }}>
          <div className="flex items-center justify-center mb-3" style={{ width: 48, height: 48, borderRadius: 'var(--radius-xl)', background: 'var(--color-danger-bg)' }}>
            {generating ? <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: 'var(--color-danger-solid)' }} /> : <FileText style={{ width: 24, height: 24, color: 'var(--color-danger-solid)' }} />}
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--color-text-strong)' }}>Relatório PDF</span>
          <span className="text-[11px] text-center mt-1" style={{ color: 'var(--color-text-subtle)' }}>Resumo completo com gráficos e categorias</span>
        </button>

        <button onClick={handleCSV} disabled={loading}
          className="flex flex-col items-center p-6 rounded-xl border-[1.5px] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
          style={{ borderColor: 'var(--color-border-base)', background: 'var(--color-bg-surface)' }}>
          <div className="flex items-center justify-center mb-3" style={{ width: 48, height: 48, borderRadius: 'var(--radius-xl)', background: 'var(--color-green-50)' }}>
            <Table style={{ width: 24, height: 24, color: 'var(--color-green-600)' }} />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--color-text-strong)' }}>Exportar CSV</span>
          <span className="text-[11px] text-center mt-1" style={{ color: 'var(--color-text-subtle)' }}>Lançamentos em formato planilha</span>
        </button>

        <button onClick={handleJSON} disabled={loading}
          className="flex flex-col items-center p-6 rounded-xl border-[1.5px] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
          style={{ borderColor: 'var(--color-border-base)', background: 'var(--color-bg-surface)' }}>
          <div className="flex items-center justify-center mb-3" style={{ width: 48, height: 48, borderRadius: 'var(--radius-xl)', background: 'var(--color-info-bg)' }}>
            <Download style={{ width: 24, height: 24, color: 'var(--color-info-solid)' }} />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--color-text-strong)' }}>Backup JSON</span>
          <span className="text-[11px] text-center mt-1" style={{ color: 'var(--color-text-subtle)' }}>Dados brutos para backup</span>
        </button>
      </motion.div>
    </div>
  );
}
