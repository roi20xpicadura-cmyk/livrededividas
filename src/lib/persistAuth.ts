// Mantém o login salvo entre sessões.
//
// O client do Supabase (src/integrations/supabase/client.ts) é auto-gerado e
// usa sessionStorage por padrão — o que faz o usuário ter que logar de novo
// toda vez que fecha a aba. Este helper cria uma ponte:
//
// 1) No boot, copia qualquer token salvo em localStorage para sessionStorage,
//    para que o client encontre a sessão e restaure o login automaticamente.
// 2) Observa mudanças nas chaves de auth do sessionStorage (login/logout/refresh)
//    e espelha em localStorage, para que a sessão sobreviva ao fechar a aba.
//
// Importante: respeita a regra de NÃO editar o client.ts gerado.

const AUTH_KEY_PREFIX = 'sb-';
const AUTH_KEY_SUFFIX = '-auth-token';

function isAuthKey(key: string | null): key is string {
  return !!key && key.startsWith(AUTH_KEY_PREFIX) && key.endsWith(AUTH_KEY_SUFFIX);
}

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    /* storage cheio ou bloqueado — ignora */
  }
}

function safeRemove(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    /* ignora */
  }
}

export function bootstrapPersistentAuth() {
  if (typeof window === 'undefined') return;

  let local: Storage;
  let session: Storage;
  try {
    local = window.localStorage;
    session = window.sessionStorage;
  } catch {
    return; // modo privado/bloqueado
  }

  // 1) Restaura tokens salvos em localStorage para sessionStorage,
  //    de modo que o client (que lê sessionStorage) reconheça o login.
  try {
    for (let i = 0; i < local.length; i++) {
      const key = local.key(i);
      if (!isAuthKey(key)) continue;
      const value = safeGet(local, key);
      if (value && !safeGet(session, key)) {
        safeSet(session, key, value);
      }
    }
  } catch {
    /* ignora */
  }

  // 2) Faz o sessionStorage espelhar para o localStorage. Como o
  //    evento `storage` do navegador não dispara para a própria aba que
  //    escreveu, fazemos um patch nos métodos do sessionStorage.
  const proto = window.sessionStorage;
  const originalSetItem = proto.setItem.bind(proto);
  const originalRemoveItem = proto.removeItem.bind(proto);
  const originalClear = proto.clear.bind(proto);

  proto.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if (isAuthKey(key)) safeSet(local, key, value);
  };

  proto.removeItem = (key: string) => {
    originalRemoveItem(key);
    if (isAuthKey(key)) safeRemove(local, key);
  };

  proto.clear = () => {
    // Antes de limpar, registra quais chaves de auth precisam ser removidas
    const keys: string[] = [];
    for (let i = 0; i < proto.length; i++) {
      const k = proto.key(i);
      if (isAuthKey(k)) keys.push(k);
    }
    originalClear();
    keys.forEach((k) => safeRemove(local, k));
  };
}

// Executa imediatamente quando o módulo é importado, garantindo que o
// sessionStorage já contenha o token salvo antes do client do Supabase
// ler sua chave de auth na inicialização.
bootstrapPersistentAuth();