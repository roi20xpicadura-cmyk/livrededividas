import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LogoLoader from '@/components/app/LogoLoader';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LogoLoader fullScreen label="Carregando sua sessão..." />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Páginas públicas (landing/login) não devem ficar bloqueadas esperando auth.
  // Se a sessão ainda estiver restaurando, renderizamos a página e só redirecionamos
  // quando soubermos com certeza que há usuário autenticado.
  if (!loading && user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
