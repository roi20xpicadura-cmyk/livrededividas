import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

const columns = [
  { title: 'Produto', links: [{ label: 'Recursos', href: '#recursos' }, { label: 'Preços', href: '#precos' }, { label: 'Integrações', href: '#integracoes' }, { label: 'Changelog', href: '#' }, { label: 'Roadmap', href: '#' }, { label: 'App Mobile', href: '#' }] },
  { title: 'Legal', links: [{ label: 'Termos de Uso', to: '/termos-de-uso' }, { label: 'Privacidade', to: '/politica-privacidade' }, { label: 'Cookies', to: '/politica-cookies' }, { label: 'LGPD', to: '/lgpd' }, { label: 'Segurança', to: '/seguranca' }, { label: 'Sobre', to: '/sobre' }] },
  { title: 'Suporte', links: [{ label: 'Central de Ajuda', href: '#' }, { label: 'Contato', href: '#' }, { label: 'Status', href: '#' }, { label: 'Comunidade', href: '#' }, { label: 'Blog', href: '#' }] },
];

export default function Footer() {
  return (
    <footer className="bg-[#0a0f0a] border-t border-white/[0.06] pt-16 pb-10 px-4">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 md:gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#16a34a] flex items-center justify-center"><BarChart3 className="w-4 h-4 text-white" /></div>
              <span className="text-[15px] font-[900] text-white">KoraFinance</span>
            </div>
            <p className="text-[12px] text-white/40 leading-[1.8] max-w-[240px] mb-5">O painel financeiro mais completo do Brasil. Para quem quer organizar, crescer e realizar.</p>
            <div className="flex gap-2">
              {['I', 'L', 'X'].map(s => (
                <a key={s} href="#" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 hover:text-white/80 transition-all text-[11px] font-bold">{s}</a>
              ))}
            </div>
          </div>
          {columns.map(col => (
            <div key={col.title}>
              <h4 className="text-[11px] font-bold text-white/25 uppercase tracking-[1px] mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link: any) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className="text-[13px] text-white/45 hover:text-white/80 transition-colors duration-150">{link.label}</Link>
                    ) : (
                      <a href={link.href} className="text-[13px] text-white/45 hover:text-white/80 transition-colors duration-150">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="text-[11px] text-white/25 text-center md:text-left">
            <div>© 2026 KoraFinance. Todos os direitos reservados.</div>
            <div>CNPJ: XX.XXX.XXX/0001-XX</div>
          </div>
          <div className="text-[11px] text-white/25">Feito com 💚 no Brasil</div>
        </div>
      </div>
    </footer>
  );
}
