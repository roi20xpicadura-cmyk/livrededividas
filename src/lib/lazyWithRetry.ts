// src/lib/lazyWithRetry.ts
//
// Wrapper em volta de React.lazy que:
// 1. Tenta novamente o dynamic import quando ele falha (chunk velho após deploy,
//    glitch de rede, HMR esquisito).
// 2. Se mesmo assim falhar, retorna um componente vazio em vez de jogar pro
//    ErrorBoundary — widgets opcionais (push opt-in, promo) NÃO devem derrubar
//    a página inteira.
//
// Uso: const Foo = lazyWithRetry(() => import('./Foo'));
import { ComponentType, lazy } from 'react';

type Importer<T extends ComponentType<any>> = () => Promise<{ default: T }>;

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: Importer<T>,
  { retries = 2, delayMs = 400, fallbackToEmpty = true } = {},
) {
  return lazy(async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await importer();
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        }
      }
    }
    console.warn('[lazyWithRetry] dynamic import falhou após retries:', lastErr);
    if (fallbackToEmpty) {
      // Componente vazio — preserva o fluxo da página.
      return { default: (() => null) as unknown as T };
    }
    throw lastErr;
  });
}
