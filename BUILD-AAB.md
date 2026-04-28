# 📦 Gerar `app-release.aab` via GitHub Actions

Fluxo automatizado — você só precisa configurar **uma vez**. Depois é 1 clique pra gerar novas versões.

---

## 🔑 Passo 1 — Gerar o keystore (UMA VEZ NA VIDA)

O keystore é a chave que assina o app. **Sem ele, você nunca mais consegue atualizar o app na Play Store.** Guarde com a vida.

### Opção A — Você tem Java instalado (Mac/Linux/Win)

```bash
keytool -genkey -v \
  -keystore kora-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias kora
```

Vai pedir:
- Senha do keystore (anote!)
- Nome, organização, cidade, país (pode botar qualquer coisa, ex: `Kora Finance / BR`)
- Senha da key (use a mesma do keystore pra simplificar)

### Opção B — Não tem Java

Instale o **Temurin JDK 21**: https://adoptium.net/ → next-next-finish → reabra o terminal → roda o comando acima.

### Opção C — Online (menos seguro, evite)

Só use se nada acima funcionar. Procure "android keystore generator online".

---

## 🔐 Passo 2 — Converter keystore pra base64

O GitHub Secrets só aceita texto, então convertemos o arquivo `.jks` em string:

**Mac/Linux:**
```bash
base64 -i kora-release.jks | pbcopy        # Mac (já copia pro clipboard)
base64 kora-release.jks > keystore.b64.txt # Linux
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("kora-release.jks")) | Set-Clipboard
```

---

## 🔒 Passo 3 — Adicionar 4 secrets no GitHub

1. Abra seu repositório no GitHub
2. **Settings → Secrets and variables → Actions → New repository secret**
3. Crie estes 4 secrets:

| Nome do secret | Valor |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | A string base64 que você gerou no passo 2 |
| `ANDROID_KEYSTORE_PASSWORD` | Senha do keystore |
| `ANDROID_KEY_ALIAS` | `kora` (ou o alias que você usou) |
| `ANDROID_KEY_PASSWORD` | Senha da key (geralmente igual à do keystore) |

---

## 🚀 Passo 4 — Rodar o build

1. No GitHub, vá em **Actions**
2. Sidebar esquerda: **Build Android Release (.aab)**
3. Botão **Run workflow** (canto direito) → deixe os campos vazios → **Run workflow**
4. Aguarde ~5–8 min ⏳
5. Quando terminar (✅ verde), clique no run → role pro fim → seção **Artifacts**
6. Baixe **`app-release-aab`** → descompacte → você tem o `app-release.aab` 🎉

---

## 📤 Passo 5 — Upload na Play Console

1. https://play.google.com/console → seu app
2. **Produção → Criar nova versão**
3. Faça upload do `app-release.aab`
4. Preencha as notas da versão → Salvar → Revisar → Implantar

---

## 🔄 Próximas versões

Sempre que quiser publicar uma atualização:

1. Edite `android/app/build.gradle` no GitHub e incremente:
   - `versionCode` (numero inteiro, ex: 1 → 2)
   - `versionName` (texto, ex: "1.0.0" → "1.0.1")
2. Vá em **Actions → Build Android Release → Run workflow**
3. Baixe o novo `.aab` → upload na Play Console

> ⚠️ A Play Store **rejeita** versões com `versionCode` igual ou menor que o anterior.

---

## 🆘 Troubleshooting

**"keystore was tampered with, or password was incorrect"**
→ Senha errada nos secrets. Confira `ANDROID_KEYSTORE_PASSWORD` e `ANDROID_KEY_PASSWORD`.

**"Could not find a build of Capacitor Android"**
→ Roda primeiro localmente `npx cap add android` e dá commit da pasta `android/`. Depois roda o workflow.

**Build falha em `npm ci`**
→ Faça `npm install` localmente, commit do `package-lock.json` atualizado.

**AAB rejeitado pela Play: "versionCode duplicado"**
→ Edite `android/app/build.gradle` e aumente o `versionCode`.

---

## 💾 Backup do keystore

**SEM o keystore + senhas você perde acesso ao app na Play Store pra sempre.** Backup obrigatório:

- ✅ Salve `kora-release.jks` em pelo menos 2 locais (Google Drive privado + pendrive físico)
- ✅ Anote as 2 senhas num gerenciador de senhas (1Password, Bitwarden, etc.)
- ❌ NUNCA commite o `.jks` no Git