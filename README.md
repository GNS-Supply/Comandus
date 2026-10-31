# MesaViva

Gestão e autoatendimento para restaurantes. HTML + CSS + JavaScript vanilla + Firebase (Firestore e Authentication).

## Arquivos (todos na raiz)

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Todo o visual (variáveis de tema, texturas, molduras, layouts) |
| `app.js` | Lógica, visões e Firebase (configuração no topo do arquivo) |
| `firestore.rules` | Regras de segurança do Firestore |

## Configuração do Firebase (projeto `restaurante-gns`)

1. **Authentication > Sign-in method:** ative **E-mail/senha** e **Anônimo** (o cliente do QR Code usa o anônimo).
2. **Authentication > Settings > Authorized domains:** adicione o domínio onde o app ficará (ex.: `seu-usuario.github.io`).
3. **Firestore Database > Regras:** cole o conteúdo de `firestore.rules` e publique.
4. **Authentication > Users:** crie seu usuário (e-mail e senha) e copie o **UID**.
5. **Firestore > Iniciar coleção:** crie `master`, com documento de ID = seu UID (pode ficar sem campos).
6. Abra o app, toque em **Equipe**, entre com seu e-mail e senha. No primeiro acesso do Master, o app cria a loja `demo`, as mesas e o cardápio iniciais.
7. Ajuste o cardápio e as mesas na aba **Admin** e imprima os **QR Codes** das mesas.

### Equipe
Crie cada funcionário em Authentication > Users, copie o UID e cadastre na aba **Admin > Equipe** (nome, perfil e UID).

### Outras lojas
Na aba **Master**, crie a loja. Acesse com `?loja=id-da-loja`.

## Publicação no GitHub Pages
Settings > Pages > Deploy from a branch > `main` / root. O app precisa de HTTPS (o Pages já fornece).

## Observações de segurança
- A `apiKey` do Firebase é um identificador público, não uma senha. A proteção real está nas regras do Firestore e no Authentication.
- Opcional: no Google Cloud Console, restrinja a chave a referenciadores HTTP do seu domínio.
- Modo demo: defina `FIREBASE_CONFIG = null` em `app.js` (login por PIN, dados no navegador).
- O telefone usado na fidelidade é dado pessoal (LGPD): mantenha uma política de privacidade.
