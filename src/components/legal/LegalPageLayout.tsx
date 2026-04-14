import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

interface Section {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  label: string;
  title: string;
  updatedAt: string;
  version: string;
  sections: Section[];
  children: React.ReactNode;
}

export default function LegalPageLayout({ label, title, updatedAt, version, sections, children }: LegalPageLayoutProps) {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );
    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-base)' }}>
      <Navbar />
      <div className="max-w-[760px] mx-auto px-6 pt-[60px] pb-[80px]">
        {/* Header */}
        <p className="text-[11px] font-extrabold tracking-[1.5px] uppercase mb-3" style={{ color: 'var(--color-green-600)' }}>{label}</p>
        <h1 className="font-black tracking-[-0.8px] mb-3" style={{ fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--color-text-strong)' }}>{title}</h1>
        <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
          Última atualização: {updatedAt} · Versão {version}
        </p>
        <div className="my-6" style={{ height: 1, background: 'var(--color-border-base)' }} />

        {/* TOC - mobile accordion */}
        <details className="md:hidden mb-8 rounded-xl border p-4" style={{ borderColor: 'var(--color-border-base)', background: 'var(--color-bg-surface)' }}>
          <summary className="text-[13px] font-bold cursor-pointer" style={{ color: 'var(--color-text-base)' }}>Índice</summary>
          <nav className="mt-3 space-y-2">
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`} className="block text-[13px] transition-colors" style={{ color: activeSection === s.id ? 'var(--color-green-600)' : 'var(--color-text-muted)' }}>{s.title}</a>
            ))}
          </nav>
        </details>

        {/* Desktop: TOC sidebar + content */}
        <div className="md:flex md:gap-12">
          <nav className="hidden md:block w-[180px] flex-shrink-0 sticky top-[80px] self-start space-y-2">
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`} className="block text-[13px] transition-colors hover:text-[var(--color-green-600)]"
                style={{ color: activeSection === s.id ? 'var(--color-green-600)' : 'var(--color-text-muted)', fontWeight: activeSection === s.id ? 700 : 400 }}>
                {s.title}
              </a>
            ))}
          </nav>
          <div className="flex-1 legal-content">{children}</div>
        </div>

        {/* Contact box */}
        <div className="mt-10 p-6 rounded-xl" style={{ background: 'var(--color-bg-sunken)' }}>
          <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--color-text-base)' }}>Dúvidas sobre este documento?</p>
          <p className="text-[14px]" style={{ color: 'var(--color-text-muted)' }}>
            Entre em contato: <a href="mailto:privacidade@findashpro.com.br" className="underline" style={{ color: 'var(--color-green-600)' }}>privacidade@findashpro.com.br</a>
          </p>
          <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-subtle)' }}>Resposta em até 5 dias úteis.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
