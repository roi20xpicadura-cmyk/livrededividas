import LegalPageLayout from '@/components/legal/LegalPageLayout';

const sections = [
  { id: 'oque', title: '1. O que são cookies' },
  { id: 'usamos', title: '2. Cookies que usamos' },
  { id: 'gerenciar', title: '3. Como gerenciar cookies' },
];

export default function PoliticaCookiesPage() {
  return (
    <LegalPageLayout label="COOKIES" title="Política de Cookies" updatedAt="14 de abril de 2026" version="1.0" sections={sections}>
      <section id="oque" className="mb-10">
        <h2 className="legal-h2">1. O que são cookies</h2>
        <p className="legal-p">Cookies são pequenos arquivos armazenados no seu navegador para melhorar sua experiência.</p>
      </section>
      <section id="usamos" className="mb-10">
        <h2 className="legal-h2">2. Cookies que usamos</h2>
        <h3 className="legal-h3">Essenciais (não podem ser desativados)</h3>
        <ul className="legal-ul">
          <li>Sessão de autenticação</li>
          <li>Preferências de tema (claro/escuro)</li>
          <li>CSRF protection tokens</li>
        </ul>
        <h3 className="legal-h3">Funcionais (melhoram a experiência)</h3>
        <ul className="legal-ul">
          <li>Idioma preferido</li>
          <li>Último período selecionado</li>
          <li>Estado de filtros e ordenações</li>
        </ul>
        <h3 className="legal-h3">Analíticos (com consentimento)</h3>
        <ul className="legal-ul">
          <li>Páginas visitadas (sem identificação pessoal)</li>
          <li>Tempo de uso de funcionalidades</li>
          <li>Erros de interface (para melhoria do produto)</li>
        </ul>
        <div className="legal-highlight">NÃO utilizamos cookies de publicidade, rastreamento entre sites ou fingerprinting.</div>
      </section>
      <section id="gerenciar" className="mb-10">
        <h2 className="legal-h2">3. Como gerenciar cookies</h2>
        <p className="legal-p">Você pode desativar cookies nas configurações do navegador. Cookies essenciais não podem ser desativados sem comprometer o funcionamento do serviço.</p>
      </section>
    </LegalPageLayout>
  );
}
