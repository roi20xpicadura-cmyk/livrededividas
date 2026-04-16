import LegalPageLayout from '@/components/legal/LegalPageLayout';

const sections = [
  { id: 'aceitacao', title: '1. Aceitação dos Termos' },
  { id: 'descricao', title: '2. Descrição do Serviço' },
  { id: 'cadastro', title: '3. Cadastro e Conta' },
  { id: 'planos', title: '4. Planos e Pagamentos' },
  { id: 'uso', title: '5. Uso Aceitável' },
  { id: 'dados', title: '6. Dados Financeiros' },
  { id: 'propriedade', title: '7. Propriedade Intelectual' },
  { id: 'limitacao', title: '8. Limitação de Responsabilidade' },
  { id: 'rescisao', title: '9. Rescisão' },
  { id: 'alteracoes', title: '10. Alterações nos Termos' },
  { id: 'lei', title: '11. Lei Aplicável' },
  { id: 'contato', title: '12. Contato' },
];

export default function TermosDeUsoPage() {
  return (
    <LegalPageLayout label="LEGAL" title="Termos de Uso" updatedAt="14 de abril de 2026" version="1.0" sections={sections}>
      <section id="aceitacao" className="mb-10">
        <h2 className="legal-h2">1. Aceitação dos Termos</h2>
        <p className="legal-p">Ao criar uma conta no KoraFinance, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço. Estes termos se aplicam a todos os usuários da plataforma.</p>
      </section>
      <section id="descricao" className="mb-10">
        <h2 className="legal-h2">2. Descrição do Serviço</h2>
        <p className="legal-p">O KoraFinance é uma plataforma de gestão financeira pessoal e empresarial que permite ao usuário registrar receitas, despesas, metas financeiras, dívidas, cartões de crédito e investimentos. O serviço é oferecido via web e aplicativo móvel (PWA).</p>
      </section>
      <section id="cadastro" className="mb-10">
        <h2 className="legal-h2">3. Cadastro e Conta</h2>
        <ul className="legal-ul">
          <li>3.1 Para usar o KoraFinance, você deve criar uma conta com e-mail válido e senha segura (mínimo 8 caracteres).</li>
          <li>3.2 Você é responsável por manter a confidencialidade da sua senha.</li>
          <li>3.3 É proibido criar contas falsas ou compartilhar credenciais de acesso.</li>
          <li>3.4 Cada pessoa pode ter apenas uma conta gratuita.</li>
          <li>3.5 Nos reservamos o direito de suspender contas que violem estes termos.</li>
        </ul>
      </section>
      <section id="planos" className="mb-10">
        <h2 className="legal-h2">4. Planos e Pagamentos</h2>
        <ul className="legal-ul">
          <li>4.1 O KoraFinance oferece planos gratuito (Free), Pro e Business.</li>
          <li>4.2 Os planos pagos são cobrados mensalmente ou anualmente via Stripe.</li>
          <li>4.3 O cancelamento pode ser feito a qualquer momento sem multa, com acesso mantido até o fim do período pago.</li>
          <li>4.4 Não realizamos reembolsos parciais de períodos já pagos, exceto quando exigido por lei.</li>
          <li>4.5 Os preços podem ser alterados com aviso prévio de 30 dias por e-mail.</li>
        </ul>
      </section>
      <section id="uso" className="mb-10">
        <h2 className="legal-h2">5. Uso Aceitável</h2>
        <p className="legal-p">É proibido usar o KoraFinance para:</p>
        <ul className="legal-ul">
          <li>Atividades ilegais ou fraudulentas</li>
          <li>Lavagem de dinheiro ou evasão fiscal</li>
          <li>Compartilhar acesso com terceiros não autorizados</li>
          <li>Tentar acessar dados de outros usuários</li>
          <li>Realizar engenharia reversa da plataforma</li>
          <li>Sobrecarregar os servidores com requisições automatizadas</li>
        </ul>
      </section>
      <section id="dados" className="mb-10">
        <h2 className="legal-h2">6. Dados Financeiros</h2>
        <ul className="legal-ul">
          <li>6.1 Os dados financeiros inseridos são de sua exclusiva responsabilidade.</li>
          <li>6.2 O KoraFinance não verifica a veracidade dos dados inseridos.</li>
          <li>6.3 As informações fornecidas pela plataforma (projeções, análises de IA) são educativas e não constituem consultoria financeira profissional.</li>
          <li>6.4 Recomendamos consultar um profissional habilitado para decisões financeiras importantes.</li>
        </ul>
        <div className="legal-highlight">⚠️ As análises e projeções do KoraFinance são meramente informativas e não substituem consultoria financeira profissional.</div>
      </section>
      <section id="propriedade" className="mb-10">
        <h2 className="legal-h2">7. Propriedade Intelectual</h2>
        <ul className="legal-ul">
          <li>7.1 O KoraFinance e todo seu conteúdo (software, design, textos, logotipos) são protegidos por direitos autorais.</li>
          <li>7.2 Os dados inseridos pelo usuário permanecem propriedade do usuário.</li>
          <li>7.3 Concedemos ao usuário uma licença limitada, não exclusiva e intransferível de uso da plataforma.</li>
        </ul>
      </section>
      <section id="limitacao" className="mb-10">
        <h2 className="legal-h2">8. Limitação de Responsabilidade</h2>
        <ul className="legal-ul">
          <li>8.1 O KoraFinance é fornecido "como está", sem garantias de disponibilidade ininterrupta.</li>
          <li>8.2 Não somos responsáveis por perdas financeiras decorrentes do uso das informações da plataforma.</li>
          <li>8.3 Nossa responsabilidade máxima é limitada ao valor pago pelo usuário nos últimos 3 meses.</li>
        </ul>
      </section>
      <section id="rescisao" className="mb-10">
        <h2 className="legal-h2">9. Rescisão</h2>
        <p className="legal-p">Podemos encerrar ou suspender sua conta caso você viole estes Termos. Você pode excluir sua conta a qualquer momento nas Configurações.</p>
      </section>
      <section id="alteracoes" className="mb-10">
        <h2 className="legal-h2">10. Alterações nos Termos</h2>
        <p className="legal-p">Podemos atualizar estes Termos com aviso prévio de 15 dias por e-mail. O uso continuado após a vigência das alterações implica aceitação.</p>
      </section>
      <section id="lei" className="mb-10">
        <h2 className="legal-h2">11. Lei Aplicável</h2>
        <p className="legal-p">Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de São Paulo/SP para resolução de conflitos.</p>
      </section>
      <section id="contato" className="mb-10">
        <h2 className="legal-h2">12. Contato</h2>
        <p className="legal-p">Para dúvidas: <a href="mailto:juridico@korafinance.com.br" className="underline" style={{ color: 'var(--color-green-600)' }}>juridico@korafinance.com.br</a></p>
      </section>
    </LegalPageLayout>
  );
}
