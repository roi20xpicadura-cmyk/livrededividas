import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

const columns = [
  { title: 'Produto', links: [{ label: 'Recursos', href: '#recursos' }, { label: 'Preços', href: '#precos' }, { label: 'Changelog', href: '#' }, { label: 'Roadmap', href: '#' }] },
  { title: 'Empresa', links: [{ label: 'Sobre nós', href: '#' }, { label: 'Blog', href: '#' }, { label: 'Carreiras', href: '#' }, { label: 'Imprensa', href: '#' }] },
  { title: 'Suporte', links: [{ label: 'Central de Ajuda', href: '#' }, { label: 'Contato', href: '#' }, { label: 'Status', href: '#' }, { label: 'Comunidade', href: '#' }] },
];

export default function Footer() {
  return (
    <footer className="bg-[#0f172a] text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand col */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-[8px] bg-primary flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-black text-white">FinDash Pro</span>
            </div>
            <p className="text-xs text-[#94a3b8] leading-[1.7] max-w-[220px]">
              O painel financeiro para quem leva dinheiro a sério.
            </p>
            <div className="flex gap-2 mt-4">
              {['X', 'In', 'IG', 'YT'].map((s) => (
                <div key={s} className="w-9 h-9 rounded-lg bg-[#1e293b] flex items-center justify-center text-[11px] font-bold text-[#64748b] hover:text-primary transition-colors duration-200 cursor-pointer">
                  {s}
                </div>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] uppercase tracking-[1px] text-[#64748b] font-semibold mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-[#94a3b8] hover:text-white transition-colors duration-150">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[#1e293b] flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#64748b]">
          <span>© 2025 FinDash Pro. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link to="#" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link to="#" className="hover:text-white transition-colors">Política de Privacidade</Link>
            <Link to="#" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
