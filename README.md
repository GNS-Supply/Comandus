# MesaViva

Gestão e autoatendimento para restaurantes. HTML + CSS + JavaScript vanilla + Firebase (Firestore e Authentication).

## Arquivos (todos na raiz)

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Todo o visual (variáveis de tema, texturas, molduras, layouts) |
| `app.js` | Lógica, visões e Firebase (configuração no topo do arquivo) |
| `firestore.rules` | Regras de segurança do Firestore |

## Perfis e acesso

O app abre sempre na **tela de login** (entrar ou criar conta).

| Perfil | Entra em | Vê |
|---|---|---|
| **Master** | Lojas e configuração | Todas as telas, incluindo **Aparência** (personalização visual da loja). Invisível para os demais usuários |
| **Loja (administrador)** | Admin | Cliente, Balcão, Cozinha, Admin e Reservas. Cria acessos e altera perfis (nunca para Master) |
| **Balcão** | Balcão | Cliente, Balcão, Reservas |
| **Cozinha** | Cozinha | Só a Cozinha |
| **Cliente** | Cardápio | Só o cardápio. Quem cria conta nova entra como Cliente |

- O cliente só consegue **fazer pedidos** lendo o QR Code da mesa (URL com `mesa` e `t`). Sem QR, vê apenas o cardápio.
- Com um QR Code válido aparece também **Continuar sem cadastro** (acesso anônimo, sem conta).
- A Loja cria acessos e muda perfis em **Admin > Acessos**.
- O Master não tem registro na lista de acessos (fica em uma coleção própria, `master`), então ninguém o vê.

## Aparência (somente Master)
Aba **Aparência**: tema (4 prontos + personalizado), cores, fontes, formato de botões e cartões, moldura das fotos, textura do fundo (com intensidade), layout do cardápio (carrossel 3D, grade, lista) e aurora animada. Tudo aparece ao vivo, com pré-visualização do cardápio. **Publicar na loja** grava a aparência no Firestore (`tenants/{loja}/config/tema`) e todos os clientes passam a ver o visual escolhido. Cada loja tem a sua.

## Configuração do Firebase (projeto `restaurante-gns`)

1. **Authentication > Sign-in method:** ative **E-mail/senha** e **Anônimo**.
2. **Authentication > Settings > Authorized domains:** adicione o domínio de hospedagem (ex.: `seu-usuario.github.io`).
3. **Firestore Database > Regras:** cole o conteúdo de `firestore.rules` e publique.
4. **Authentication > Users:** crie seu usuário Master (e-mail e senha) e copie o **UID**.
5. **Firestore > Iniciar coleção:** crie `master` com um documento de ID = seu UID (sem campos).
6. Abra o app e entre com esse e-mail. No primeiro acesso, o Master cria a loja `demo`, as mesas e o cardápio iniciais.
7. Na aba **Admin > Acessos**, crie o usuário da Loja (perfil *Loja (administrador)*). Ele passa a gerir o restante.

### Outras lojas
Na aba **Master**, crie a loja e acesse com `?loja=id-da-loja`. Os acessos são por loja.

## Publicação no GitHub Pages
Settings > Pages > Deploy from a branch > `main` / root. O app precisa de HTTPS (o Pages já fornece).

## Modo demo (sem Firebase)
Em `app.js`, defina `FIREBASE_CONFIG = null`. Dados ficam no navegador.
Acessos de teste: `master@demo.com` / `master123` e `loja@demo.com` / `loja123`.

## Segurança
- A `apiKey` do Firebase é um identificador público. A proteção real está nas regras do Firestore e no Authentication.
- Opcional: no Google Cloud Console, restrinja a chave a referenciadores HTTP do seu domínio.
- Telefones usados na fidelidade são dados pessoais (LGPD): mantenha uma política de privacidade.
