import LegalPageLayout from '@/components/legal/LegalPageLayout';
import SEO from '@/components/SEO';

const sections = [
  { id: 'sobre', title: 'Sobre' },
  { id: 'no-app', title: 'Excluir pelo app' },
  { id: 'por-email', title: 'Excluir por e-mail' },
  { id: 'dados', title: 'O que é apagado' },
  { id: 'retencao', title: 'Dados retidos' },
];

export default function ExcluirContaPage() {
  return (
    <>
      <SEO
        title="Excluir conta"
        description="Como solicitar a exclusão da sua conta Kora Finance e de todos os seus dados financeiros."
        url="https://korafinance.app/excluir-conta"
      />
      <LegalPageLayout
        label="CONTA E DADOS"
        title="Excluir minha conta"
        updatedAt="28 de abril de 2026"
        version="1.0"
        sections={sections}
      >
        <section id="sobre" className="mb-10">
          <h2>Sobre esta página</h2>
          <p>
            O <strong>Kora Finance</strong> (desenvolvido por Kora Finance) permite que você
            solicite a qualquer momento a exclusão da sua conta e de todos os dados associados.
            Há duas formas de fazer isso: diretamente pelo app ou enviando um e-mail.
          </p>
        </section>

        <section id="no-app" className="mb-10">
          <h2>1. Pelo app (recomendado)</h2>
          <ol>
            <li>Abra o app Kora Finance e faça login.</li>
            <li>Vá em <strong>Configurações</strong> (ícone de engrenagem no menu).</li>
            <li>Toque em <strong>Segurança</strong>.</li>
            <li>Role até o final e toque em <strong>Excluir minha conta</strong>.</li>
            <li>Confirme a exclusão digitando seu e-mail.</li>
          </ol>
          <p>A exclusão é processada em até <strong>72 horas</strong>.</p>
        </section>

        <section id="por-email" className="mb-10">
          <h2>2. Por e-mail</h2>
          <p>
            Se você não consegue acessar sua conta, envie um e-mail para{' '}
            <a href="mailto:privacidade@korafinance.com.br">privacidade@korafinance.com.br</a> com:
          </p>
          <ul>
            <li>Assunto: <strong>Solicitação de exclusão de conta</strong></li>
            <li>O e-mail cadastrado no Kora</li>
            <li>Confirmação de que você é o titular da conta</li>
          </ul>
          <p>Respondemos em até <strong>5 dias úteis</strong> e processamos em até <strong>30 dias</strong>.</p>
        </section>

        <section id="dados" className="mb-10">
          <h2>O que é apagado</h2>
          <p>Ao confirmar a exclusão, removemos permanentemente:</p>
          <ul>
            <li>Dados do perfil (nome, e-mail, telefone, foto)</li>
            <li>Transações financeiras (receitas, despesas, transferências)</li>
            <li>Cartões cadastrados, contas bancárias e conexões Open Finance</li>
            <li>Metas, orçamentos, dívidas e investimentos</li>
            <li>Histórico de conversas com a Kora (assistente de IA)</li>
            <li>Conquistas, configurações e preferências</li>
            <li>Assinatura Premium (cancelada automaticamente)</li>
          </ul>
        </section>

        <section id="retencao" className="mb-10">
          <h2>Dados retidos por obrigação legal</h2>
          <p>
            Alguns dados são mantidos por período limitado, conforme exigido por lei
            (LGPD, legislação fiscal e tributária brasileira):
          </p>
          <ul>
            <li><strong>Registros de pagamento e nota fiscal:</strong> 5 anos (Receita Federal)</li>
            <li><strong>Logs de acesso:</strong> 6 meses (Marco Civil da Internet, Lei 12.965/14)</li>
            <li><strong>Dados anonimizados</strong> usados em estatísticas agregadas (não permitem te identificar)</li>
          </ul>
          <p>
            Após esses prazos, todos os dados restantes são eliminados definitivamente dos nossos servidores e backups.
          </p>
        </section>
      </LegalPageLayout>
    </>
  );
}
