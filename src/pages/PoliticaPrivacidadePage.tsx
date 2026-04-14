import LegalPageLayout from '@/components/legal/LegalPageLayout';

const sections = [
  { id: 'controlador', title: '1. Controlador dos Dados' },
  { id: 'coleta', title: '2. Dados que Coletamos' },
  { id: 'uso', title: '3. Como Usamos seus Dados' },
  { id: 'base-legal', title: '4. Base Legal (LGPD)' },
  { id: 'compartilhamento', title: '5. Compartilhamento' },
  { id: 'transferencia', title: '6. Transferência Internacional' },
  { id: 'retencao', title: '7. Retenção de Dados' },
  { id: 'direitos', title: '8. Seus Direitos (LGPD)' },
  { id: 'seguranca', title: '9. Segurança' },
  { id: 'criancas', title: '10. Crianças e Adolescentes' },
  { id: 'alteracoes', title: '11. Alterações' },
];

export default function PoliticaPrivacidadePage() {
  return (
    <LegalPageLayout label="PRIVACIDADE" title="Política de Privacidade" updatedAt="14 de abril de 2026" version="1.0" sections={sections}>
      <section id="controlador" className="mb-10">
        <h2 className="legal-h2">1. Controlador dos Dados</h2>
        <p className="legal-p">O controlador dos seus dados pessoais é a empresa responsável pelo FinDash Pro, com sede no Brasil.</p>
        <p className="legal-p">Encarregado de Proteção de Dados (DPO): <a href="mailto:privacidade@findashpro.com.br" className="underline" style={{ color: 'var(--color-green-600)' }}>privacidade@findashpro.com.br</a></p>
      </section>
      <section id="coleta" className="mb-10">
        <h2 className="legal-h2">2. Dados que Coletamos</h2>
        <ul className="legal-ul">
          <li><strong>2.1 Dados de cadastro:</strong> nome completo, e-mail, senha (criptografada), data de criação da conta.</li>
          <li><strong>2.2 Dados de uso:</strong> lançamentos financeiros, metas, dívidas, cartões e investimentos inseridos pelo usuário.</li>
          <li><strong>2.3 Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional, páginas visitadas, tempo de sessão.</li>
          <li><strong>2.4 Dados de pagamento:</strong> processados diretamente pelo Stripe — não armazenamos dados de cartão de crédito.</li>
          <li><strong>2.5 Cookies:</strong> conforme nossa <a href="/politica-de-cookies" className="underline" style={{ color: 'var(--color-green-600)' }}>Política de Cookies</a>.</li>
        </ul>
      </section>
      <section id="uso" className="mb-10">
        <h2 className="legal-h2">3. Como Usamos seus Dados</h2>
        <ul className="legal-ul">
          <li>Fornecer e melhorar o serviço</li>
          <li>Personalizar a experiência (IA financeira)</li>
          <li>Enviar comunicações sobre o serviço e sua conta</li>
          <li>Processar pagamentos</li>
          <li>Cumprir obrigações legais</li>
          <li>Prevenir fraudes e abusos</li>
          <li>Gerar análises agregadas e anônimas de uso</li>
        </ul>
      </section>
      <section id="base-legal" className="mb-10">
        <h2 className="legal-h2">4. Base Legal (LGPD)</h2>
        <p className="legal-p">Tratamos seus dados com base em:</p>
        <ul className="legal-ul">
          <li>Execução de contrato (art. 7º, V)</li>
          <li>Legítimo interesse (art. 7º, IX)</li>
          <li>Consentimento (art. 7º, I) — quando aplicável</li>
          <li>Cumprimento de obrigação legal (art. 7º, II)</li>
        </ul>
      </section>
      <section id="compartilhamento" className="mb-10">
        <h2 className="legal-h2">5. Compartilhamento de Dados</h2>
        <p className="legal-p">Compartilhamos dados apenas com:</p>
        <ul className="legal-ul">
          <li><strong>Supabase</strong> (infraestrutura de banco de dados — EUA)</li>
          <li><strong>Stripe</strong> (processamento de pagamentos — EUA)</li>
          <li><strong>Resend</strong> (envio de e-mails transacionais)</li>
          <li><strong>Anthropic</strong> (análises de IA — dados anonimizados)</li>
        </ul>
        <div className="legal-highlight">NÃO vendemos seus dados para terceiros. NÃO exibimos anúncios baseados em seus dados financeiros.</div>
      </section>
      <section id="transferencia" className="mb-10">
        <h2 className="legal-h2">6. Transferência Internacional</h2>
        <p className="legal-p">Alguns dados podem ser processados fora do Brasil (EUA) por nossos fornecedores. Garantimos que estas transferências seguem as salvaguardas exigidas pela LGPD.</p>
      </section>
      <section id="retencao" className="mb-10">
        <h2 className="legal-h2">7. Retenção de Dados</h2>
        <ul className="legal-ul">
          <li>Mantemos seus dados enquanto sua conta estiver ativa.</li>
          <li>Após exclusão da conta: dados excluídos em até 30 dias, exceto quando exigida retenção legal (até 5 anos).</li>
          <li>Dados de pagamento: retidos pelo Stripe conforme exigências regulatórias.</li>
        </ul>
      </section>
      <section id="direitos" className="mb-10">
        <h2 className="legal-h2">8. Seus Direitos (LGPD — Art. 18)</h2>
        <p className="legal-p">Você tem direito a:</p>
        <ul className="legal-ul">
          <li>Confirmação de tratamento dos seus dados</li>
          <li>Acesso aos seus dados</li>
          <li>Correção de dados incompletos ou incorretos</li>
          <li>Anonimização, bloqueio ou eliminação</li>
          <li>Portabilidade dos dados</li>
          <li>Eliminação dos dados tratados com consentimento</li>
          <li>Informação sobre compartilhamento</li>
          <li>Revogação do consentimento</li>
        </ul>
        <p className="legal-p">Para exercer seus direitos: <a href="mailto:privacidade@findashpro.com.br" className="underline" style={{ color: 'var(--color-green-600)' }}>privacidade@findashpro.com.br</a>. Respondemos em até 15 dias úteis.</p>
      </section>
      <section id="seguranca" className="mb-10">
        <h2 className="legal-h2">9. Segurança</h2>
        <p className="legal-p">Utilizamos: criptografia TLS 1.3, autenticação segura, Row Level Security no banco de dados, backups criptografados diários, monitoramento de acessos suspeitos.</p>
      </section>
      <section id="criancas" className="mb-10">
        <h2 className="legal-h2">10. Crianças e Adolescentes</h2>
        <p className="legal-p">O FinDash Pro não é direcionado a menores de 18 anos. Não coletamos dados de menores intencionalmente.</p>
      </section>
      <section id="alteracoes" className="mb-10">
        <h2 className="legal-h2">11. Alterações nesta Política</h2>
        <p className="legal-p">Avisaremos por e-mail com 15 dias de antecedência sobre mudanças relevantes.</p>
      </section>
    </LegalPageLayout>
  );
}
