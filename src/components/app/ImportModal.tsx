import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, AlertCircle, Check } from 'lucide-react';
import { parseOFX, ParsedTransaction } from '@/lib/ofxParser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profileType: string;
}

export default function ImportModal({ open, onClose, onSuccess, profileType }: Props) {
  const { user } = useAuth();
  const [fileType, setFileType] = useState<'csv' | 'ofx' | null>(null);
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [csvMapping, setCsvMapping] = useState({ date: 0, desc: 1, val: 2, type: -1 });

  const reset = () => {
    setFileType(null);
    setParsed([]);
    setFileName('');
    setCsvData(null);
    setCsvMapping({ date: 0, desc: 1, val: 2, type: -1 });
  };

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;

      if (ext === 'ofx') {
        setFileType('ofx');
        const txs = parseOFX(text);
        setParsed(txs);
      } else {
        setFileType('csv');
        const rows = text.split('\n').map(r => r.split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, '')));
        setCsvData(rows);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleCsvConfirm = () => {
    if (!csvData) return;
    const rows = csvData.slice(1).filter(r => r.length > Math.max(csvMapping.date, csvMapping.desc, csvMapping.val));
    const txs: ParsedTransaction[] = rows.map(row => {
      const d = row[csvMapping.date];
      const de = row[csvMapping.desc];
      const v = parseFloat(row[csvMapping.val].replace(/[^\d.,-]/g, '').replace(',', '.'));
      const tp = csvMapping.type >= 0 && row[csvMapping.type]?.toLowerCase().includes('desp')
        ? 'expense' as const
        : (v < 0 ? 'expense' as const : 'income' as const);
      return {
        type: tp,
        amount: Math.abs(v),
        date: d,
        description: de,
        source_id: '',
        category: tp === 'income' ? 'Receita' : 'Outros',
      };
    }).filter(t => t.amount > 0 && t.description);
    setParsed(txs);
    setFileType('csv');
    setCsvData(null); // move to preview
  };

  const handleImport = async () => {
    if (!user || parsed.length === 0) return;
    setImporting(true);

    const origin = profileType === 'business' ? 'business' : 'personal';
    const batch = parsed.map(t => ({
      user_id: user.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      origin,
      category: t.category,
    }));

    // Insert in chunks of 50
    let count = 0;
    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      const { error } = await supabase.from('transactions').insert(chunk);
      if (!error) count += chunk.length;
    }

    setImporting(false);
    toast.success(`${count} lançamentos importados com sucesso!`);
    reset();
    onClose();
    onSuccess();
  };

  const incomeTotal = parsed.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenseTotal = parsed.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center md:p-4"
          onClick={() => { reset(); onClose(); }}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="bg-card rounded-t-2xl md:rounded-2xl w-full md:max-w-[640px] max-h-[85vh] overflow-y-auto shadow-xl">

            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b" style={{ borderColor: 'var(--color-border-weak)' }}>
              <div className="flex items-center" style={{ gap: 8 }}>
                <Upload style={{ width: 16, height: 16, color: 'var(--color-green-600)' }} />
                <h3 className="text-sm font-extrabold" style={{ color: 'var(--color-text-strong)' }}>Importar Lançamentos</h3>
              </div>
              <button onClick={() => { reset(); onClose(); }} style={{ color: 'var(--color-text-subtle)' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="p-4 md:p-5">
              {/* Step 1: File picker */}
              {!csvData && parsed.length === 0 && (
                <div>
                  {/* Privacy trust banner */}
                  <div className="mb-4 p-3 rounded-xl flex items-start gap-3" style={{ background: 'var(--color-green-50, #F5F3FF)', border: '1px solid var(--color-green-200, #DDD6FE)' }}>
                    <span className="text-xl flex-shrink-0">🛡️</span>
                    <div>
                      <p className="text-[12px] font-extrabold" style={{ color: 'var(--color-green-700, #6D28D9)' }}>Nunca pedimos sua senha do banco</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-green-700, #6D28D9)', opacity: 0.8, lineHeight: 1.5 }}>Você importa apenas o arquivo de extrato. Nenhum acesso às suas credenciais bancárias.</p>
                    </div>
                  </div>
                  <div
                    className="border-2 border-dashed rounded-xl p-8 md:p-10 text-center cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--color-green-200)', background: 'var(--color-bg-base)' }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                    onClick={() => {
                      const inp = document.createElement('input');
                      inp.type = 'file';
                      inp.accept = '.csv,.ofx';
                      inp.onchange = (ev: Event) => {
                        const target = ev.target as HTMLInputElement;
                        if (target.files?.[0]) handleFile(target.files[0]);
                      };
                      inp.click();
                    }}>
                    <Upload style={{ width: 40, height: 40, color: 'var(--color-green-600)' }} className="mx-auto mb-3" />
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-strong)' }}>Arraste o arquivo aqui</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>ou clique para selecionar</p>
                    <div className="flex items-center justify-center mt-4" style={{ gap: 8 }}>
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-green-50)', color: 'var(--color-green-700)' }}>CSV</span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info-text)' }}>OFX</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-lg flex items-start" style={{ background: 'var(--color-info-bg)', gap: 8 }}>
                    <AlertCircle style={{ width: 14, height: 14, color: 'var(--color-info-text)', flexShrink: 0, marginTop: 2 }} />
                    <p className="text-[11px]" style={{ color: 'var(--color-info-text)', lineHeight: 1.6 }}>
                      <strong>CSV:</strong> Extratos de bancos e planilhas. <strong>OFX:</strong> Formato padrão bancário do Brasil (Internet Banking → Extrato → Exportar OFX).
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2a: CSV column mapping */}
              {csvData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <FileText style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>{fileName}</span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border-base)' }}>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr style={{ background: 'var(--color-bg-sunken)' }}>
                          {csvData[0]?.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left font-bold" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(1, 5).map((r, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--color-border-weak)' }}>
                            {r.map((c, j) => <td key={j} className="px-3 py-1.5" style={{ color: 'var(--color-text-base)' }}>{c}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {([['Data', 'date'], ['Descrição', 'desc'], ['Valor', 'val'], ['Tipo (opcional)', 'type']] as const).map(([label, key]) => (
                      <div key={key}>
                        <label className="text-[10px] uppercase font-bold block mb-1" style={{ color: 'var(--color-text-subtle)' }}>{label}</label>
                        <select
                          value={csvMapping[key]}
                          onChange={e => setCsvMapping(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                          className="w-full h-9 px-2 text-[12px] rounded-lg border focus:outline-none"
                          style={{ borderColor: 'var(--color-border-base)', background: 'var(--color-bg-base)', color: 'var(--color-text-base)' }}>
                          {key === 'type' && <option value={-1}>Auto-detectar</option>}
                          {csvData[0]?.map((h, i) => <option key={i} value={i}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleCsvConfirm}
                    className="w-full py-2.5 rounded-lg font-extrabold text-[13px] transition-colors"
                    style={{ background: '#7C3AED', color: 'white' }}>
                    Mapear e continuar →
                  </button>
                </div>
              )}

              {/* Step 3: Preview parsed transactions */}
              {parsed.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <Check style={{ width: 14, height: 14, color: 'var(--color-success-solid)' }} />
                      <span className="text-xs font-bold" style={{ color: 'var(--color-text-strong)' }}>
                        {parsed.length} lançamentos encontrados
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: fileType === 'ofx' ? 'var(--color-info-bg)' : 'var(--color-green-50)', color: fileType === 'ofx' ? 'var(--color-info-text)' : 'var(--color-green-700)' }}>
                      {fileType?.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg" style={{ background: 'var(--color-success-bg)' }}>
                      <p className="text-[10px] font-bold" style={{ color: 'var(--color-success-text)' }}>Receitas</p>
                      <p className="text-sm font-black" style={{ color: 'var(--color-success-solid)' }}>
                        R$ {incomeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'var(--color-danger-bg)' }}>
                      <p className="text-[10px] font-bold" style={{ color: 'var(--color-danger-text)' }}>Despesas</p>
                      <p className="text-sm font-black" style={{ color: 'var(--color-danger-solid)' }}>
                        R$ {expenseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-y-auto rounded-lg border" style={{ maxHeight: 200, borderColor: 'var(--color-border-base)' }}>
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0" style={{ background: 'var(--color-bg-sunken)' }}>
                        <tr>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: 'var(--color-text-muted)' }}>Data</th>
                          <th className="px-3 py-2 text-left font-bold" style={{ color: 'var(--color-text-muted)' }}>Descrição</th>
                          <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--color-text-muted)' }}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.slice(0, 20).map((t, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--color-border-weak)' }}>
                            <td className="px-3 py-1.5" style={{ color: 'var(--color-text-base)' }}>{t.date}</td>
                            <td className="px-3 py-1.5 truncate max-w-[160px]" style={{ color: 'var(--color-text-base)' }}>{t.description}</td>
                            <td className="px-3 py-1.5 text-right font-bold" style={{ color: t.type === 'income' ? 'var(--color-success-solid)' : 'var(--color-danger-solid)' }}>
                              {t.type === 'expense' ? '-' : '+'}R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        {parsed.length > 20 && (
                          <tr><td colSpan={3} className="px-3 py-2 text-center text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>... e mais {parsed.length - 20} lançamentos</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <button onClick={handleImport} disabled={importing}
                    className="w-full py-3 rounded-lg font-extrabold text-[13px] transition-colors disabled:opacity-50"
                    style={{ background: '#7C3AED', color: 'white' }}>
                    {importing ? 'Importando...' : `Importar ${parsed.length} lançamentos`}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
