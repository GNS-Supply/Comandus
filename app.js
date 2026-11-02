/* MesaViva — JS Vanilla + Firebase Firestore (opcional).
   Sem FIREBASE_CONFIG o app roda em modo demo (localStorage, sincroniza entre abas).
   URL: index.html?loja=demo&mesa=5&t=token */
const VERSAO = 'v3';
let BOOT_ERRO = null;
const banner = t => { const b = document.createElement('div'); b.className = 'banner-erro'; b.textContent = t; b.onclick = () => b.remove(); document.body.append(b); };
addEventListener('error', e => banner('Erro: ' + e.message));
addEventListener('unhandledrejection', e => banner('Erro: ' + (e.reason?.code || e.reason?.message || e.reason)));

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyALkf1xjwp1dSoHjyTa6VSpRyAB3jzkDZU',
  authDomain: 'restaurante-gns.firebaseapp.com',
  projectId: 'restaurante-gns',
  storageBucket: 'restaurante-gns.firebasestorage.app',
  messagingSenderId: '357612737864',
  appId: '1:357612737864:web:eb58c0168b17cf8a694f7d'
}; // use null para rodar em modo demo (localStorage, login por PIN)

const $ = (s, r = document) => r.querySelector(s);
const R = v => 'R$ ' + v.toFixed(2).replace('.', ',');
const Q = new URLSearchParams(location.search), LOJA = Q.get('loja') || 'demo', KEY = 'mv_' + LOJA;
const cardapio = [
  ['Burrata com tomate assado','Entradas',38,'🍅'],['Croquete de costela','Entradas',32,'🧆'],
  ['Risoto de cogumelos','Pratos',68,'🍄'],['Salmão grelhado','Pratos',84,'🐟'],['Ancho com fritas','Pratos',92,'🥩'],['Massa fresca ao pesto','Pratos',58,'🍝'],
  ['Petit gâteau','Sobremesas',34,'🍫'],['Pudim de leite','Sobremesas',22,'🍮'],
  ['Suco de laranja','Bebidas',14,'🍊'],['Limonada suíça','Bebidas',16,'🍋'],['Cerveja artesanal','Bebidas',24,'🍺']
].map((p, i) => ({ id: 'p' + i, nome: p[0], categoria: p[1], preco: p[2], emoji: p[3], foto: '', disponivel: true,
  adicionais: p[1] === 'Pratos' ? [{ nome: 'Queijo extra', preco: 5 }, { nome: 'Bacon crocante', preco: 7 }] : [] }));
const h0 = Date.now() - 864e5 / 3;
let S = JSON.parse(localStorage.getItem(KEY) || 'null') || {
  mesas: Array.from({ length: 8 }, (_, i) => ({ id: 'm' + (i + 1), numero: i + 1, capacidade: i % 2 ? 2 : 4, status: i == 2 ? 'reservada' : 'livre', token: 'tk' + (i + 1) })),
  comandas: [[212, 12, 'Ana'], [148, 13, 'Caio'], [305, 13, 'Duda'], [96, 19, 'Léo'], [260, 20, 'Bia'], [187, 20, 'Rui']].map((v, i) => ({
    id: 'seed' + i, mesaId: 'm1', status: 'paga', total: v[0], hora: v[1], itens: [{ nome: cardapio[2 + i % 4].nome, preco: v[0], qtd: 1, pessoa: v[2], status: 'servido', t: h0 }] })),
  cardapio
};
S.cardapio = S.cardapio || cardapio;
const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
S.equipe = S.equipe || [
  { id: 'e0', nome: 'Master', email: 'master@demo.com', perfil: 'master', senha: await sha('master123') },
  { id: 'e1', nome: 'Loja Demo', email: 'loja@demo.com', perfil: 'admin', senha: await sha('loja123') }];
S.reservas = S.reservas || [];
S.promocoes = S.promocoes || [{ id: 'pr0', titulo: 'Desconto de boas-vindas', cupom: 'BEMVINDO10', desconto: 10, validoAte: '2099-12-31', ativa: true }];
S.avaliacoes = S.avaliacoes || [];
S.fidelidade = S.fidelidade || { meta: 10, premio: 'Sobremesa grátis' };
S.clientes = S.clientes || [];
S.lojas = S.lojas || [{ id: 'demo', nome: 'Bistrô Demo', status: 'ativa' }];

let db, fs, auth, au;
let SES = JSON.parse(sessionStorage.getItem('mv_ses') || 'null');
const GUEST = () => sessionStorage.getItem('mv_guest') === '1';
if (FIREBASE_CONFIG) try {
  const A = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  fs = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  db = fs.getFirestore(A.initializeApp(FIREBASE_CONFIG));
  au = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'); auth = au.getAuth(A.getApp());
  await auth.authStateReady();
  if (GUEST() && !auth.currentUser) { try { await au.signInAnonymously(auth); } catch (e) { console.error('Ative o provedor Anônimo em Authentication > Sign-in method.', e); } }
  SES = auth.currentUser && !auth.currentUser.isAnonymous ? await perfilDe(auth.currentUser.uid) : null;
  SES ? sessionStorage.setItem('mv_ses', JSON.stringify(SES)) : sessionStorage.removeItem('mv_ses');
  // produção: sem dados de demonstração; mesas iniciais com token aleatório
  Object.assign(S, { comandas: [], equipe: [], reservas: [], promocoes: [], avaliacoes: [], clientes: [] });
  S.mesas.forEach(m => m.token = crypto.randomUUID().slice(0, 8));
  fs.onSnapshot(fs.doc(db, 'tenants', LOJA, 'config', 'tema'), d => { if (d.exists()) { const { id, ...p } = d.data(); Object.assign(PREF, p); aplica(); render(); } }, () => {});
  fs.onSnapshot(fs.doc(db, 'tenants', LOJA, 'config', 'fidelidade'), d => { if (d.exists()) { S.fidelidade = d.data(); render(); } }, () => {});
  fs.onSnapshot(fs.collection(db, 'tenants'), s => { if (!s.empty) { S.lojas = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); } else if (SES?.perfil === 'master') S.lojas.forEach(o => persist('lojas', o)); }, () => {});
  ['mesas', 'comandas', 'cardapio', 'reservas', 'promocoes', 'avaliacoes', 'clientes', 'equipe'].filter(c => c === 'equipe' ? ['master', 'admin'].includes(SES?.perfil) : c === 'clientes' ? !!SES : true).forEach(c => fs.onSnapshot(fs.collection(db, 'tenants', LOJA, c), s => {
    if (s.empty) { if (['master', 'admin'].includes(SES?.perfil) && ['mesas', 'cardapio'].includes(c)) S[c].forEach(o => persist(c, o)); } else S[c] = s.docs.map(d => d.data());
    render();
  }, () => {}));
} catch (e) { BOOT_ERRO = e; SES = null; console.error(e); }
async function perfilDe(uid) {
  if ((await fs.getDoc(fs.doc(db, 'master', uid))).exists()) return { id: uid, nome: 'Master', perfil: 'master' };
  const r = fs.doc(db, 'tenants', LOJA, 'equipe', uid), d = await fs.getDoc(r), u = auth.currentUser;
  if (d.exists()) return { id: uid, nome: d.data().nome, perfil: d.data().perfil };
  const o = { id: uid, nome: u.displayName || u.email.split('@')[0], email: u.email, perfil: 'cliente' };
  await fs.setDoc(r, o); return { id: uid, nome: o.nome, perfil: 'cliente' };
}
function persist(col, o) { if (db) fs.setDoc(col === 'lojas' ? fs.doc(db, 'tenants', o.id) : fs.doc(db, 'tenants', LOJA, col, o.id), o); }
function save(col, o) { localStorage.setItem(KEY, JSON.stringify(S)); if (col) persist(col, o); render(); }
addEventListener('storage', e => { if (e.key === KEY) { S = JSON.parse(e.newValue); render(); } });

// ---------- estado de interface ----------
const mesaUrl = +Q.get('mesa') || 5;
const V = { view: Q.get('mesa') ? 'cliente' : 'cliente', mesa: 'm' + mesaUrl, pessoa: '', cat: 'Todos', layout: 'carrossel', idx: 0, cart: [], cupom: null, nota: 0, modoLogin: 'entrar' };
const ROTULO = { master: 'Master', admin: 'Loja (administrador)', balcao: 'Balcão', cozinha: 'Cozinha', cliente: 'Cliente' };
const PERM = { master: ['cliente', 'balcao', 'cozinha', 'admin', 'reservas', 'master'], admin: ['cliente', 'balcao', 'cozinha', 'admin', 'reservas'], balcao: ['cliente', 'balcao', 'reservas'], cozinha: ['cozinha'], cliente: ['cliente'] };
const pode = v => SES ? PERM[SES.perfil].includes(v) : v === 'cliente' && GUEST();
const INICIO = { master: 'master', admin: 'admin', balcao: 'balcao', cozinha: 'cozinha', cliente: 'cliente' };
const ERROS = { 'auth/invalid-credential': 'E-mail ou senha incorretos', 'auth/invalid-email': 'E-mail inválido', 'auth/email-already-in-use': 'Este e-mail já está cadastrado', 'auth/weak-password': 'A senha precisa de 6 ou mais caracteres', 'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco.', 'auth/operation-not-allowed': 'Método de login desativado no Firebase' };
const erroLogin = t => { const e = $('#lgErro'); if (e) e.textContent = t; };
function login() {
  const cria = V.modoLogin === 'criar', qr = !!Q.get('t');
  return `<section class="login entra"><div class="login-card card"><div class="marca" style="justify-content:center;font-size:28px"><i></i><b>MesaViva</b></div>
  <h1>${cria ? 'Criar conta' : 'Bem-vindo'}</h1><p class="sub">${cria ? 'Cadastre-se para ver o cardápio.' : 'Entre para continuar.'}</p>
  <div class="chips" style="justify-content:center"><button class="chip ${cria ? '' : 'on'}" data-act="modo" data-v="entrar">Entrar</button><button class="chip ${cria ? 'on' : ''}" data-act="modo" data-v="criar">Criar conta</button></div>
  <div class="form" style="grid-template-columns:1fr">${cria ? '<input class="txt" id="lgNome" placeholder="Seu nome" autocomplete="name">' : ''}
  <input class="txt" id="lgEmail" type="email" placeholder="E-mail" autocomplete="email"><input class="txt" id="lgSenha" type="password" placeholder="Senha" autocomplete="${cria ? 'new-password' : 'current-password'}"></div>
  <p id="lgErro" class="erro" role="alert"></p><button class="btn" style="width:100%" data-act="acessar">${cria ? 'Criar conta e entrar' : 'Entrar'}</button>
  ${qr ? '<button class="btn fantasma" style="width:100%" data-act="convidado">Continuar sem cadastro</button>' : ''}<small class="sub">${VERSAO}</small></div></section>`;
}
async function acessar(modo) {
  const email = $('#lgEmail').value.trim().toLowerCase(), senha = $('#lgSenha').value, nome = $('#lgNome')?.value.trim();
  if (!email || senha.length < 6) return erroLogin('Informe e-mail e senha (mínimo 6 caracteres)');
  if (modo === 'criar' && !nome) return erroLogin('Informe seu nome');
  try {
    if (db) {
      if (modo === 'criar') { const c = await au.createUserWithEmailAndPassword(auth, email, senha); await au.updateProfile(c.user, { displayName: nome }); }
      else await au.signInWithEmailAndPassword(auth, email, senha);
      sessionStorage.removeItem('mv_guest'); return location.reload();
    }
    const sen = await sha(senha); let e;
    if (modo === 'criar') {
      if (S.equipe.some(x => x.email === email)) return erroLogin(ERROS['auth/email-already-in-use']);
      S.equipe.push(e = { id: 'e' + Date.now(), nome, email, perfil: 'cliente', senha: sen }); localStorage.setItem(KEY, JSON.stringify(S));
    } else e = S.equipe.find(x => x.email === email && x.senha === sen);
    if (!e) return erroLogin(ERROS['auth/invalid-credential']);
    SES = { id: e.id, nome: e.nome, perfil: e.perfil }; sessionStorage.setItem('mv_ses', JSON.stringify(SES)); sessionStorage.removeItem('mv_guest');
    V.view = INICIO[e.perfil]; render(); toast('Olá, ' + e.nome);
  } catch (e) { erroLogin(ERROS[e.code] || 'Não foi possível entrar. Tente novamente.'); }
}
async function convidado() {
  try { if (db) await au.signInAnonymously(auth); } catch { return erroLogin('Ative o login Anônimo no Firebase.'); }
  sessionStorage.setItem('mv_guest', '1'); db ? location.reload() : render();
}
async function addEquipe() {
  const nome = $('#eNome').value.trim(), email = $('#eEmail').value.trim().toLowerCase(), senha = $('#eSenha').value, perfil = $('#ePerfil').value;
  if (!nome || !email || senha.length < 6) return toast('Informe nome, e-mail e senha (mín. 6)');
  if (perfil === 'master') return;
  try {
    let id;
    if (db) { // app secundário: cria o usuário sem deslogar quem está administrando
      const A = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'), sec = A.initializeApp(FIREBASE_CONFIG, 'sec' + Date.now()), a2 = au.getAuth(sec);
      id = (await au.createUserWithEmailAndPassword(a2, email, senha)).user.uid; await au.signOut(a2); await A.deleteApp(sec);
    } else { if (S.equipe.some(x => x.email === email)) return toast(ERROS['auth/email-already-in-use']); id = 'e' + Date.now(); }
    const o = { id, nome, email, perfil }; if (!db) o.senha = await sha(senha);
    S.equipe.push(o); save('equipe', o); toast('Acesso criado');
  } catch (e) { toast(ERROS[e.code] || 'Não foi possível criar o acesso'); }
}
function mudaPerfil(uid, perfil) {
  const e = S.equipe.find(x => x.id === uid); if (!e || e.perfil === 'master' || perfil === 'master') return;
  e.perfil = perfil; save('equipe', e); toast('Perfil atualizado');
}
const VIEWS = { cliente: 'Cliente', balcao: 'Balcão', cozinha: 'Cozinha', admin: 'Admin', reservas: 'Reservas', master: 'Master' };
const mesaDe = id => S.mesas.find(m => m.id === id);
const aberta = id => S.comandas.find(c => c.mesaId === id && c.status === 'aberta');
const totalC = c => c.itens.reduce((a, i) => a + i.preco * i.qtd, 0) * (1 - (c.desconto || 0) / 100);
const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2200); };

// ---------- visões ----------
function cliente() {
  const m = mesaDe(V.mesa) || S.mesas[0], tk = Q.get('t'), lj = S.lojas.find(l => l.id === LOJA);
  if (lj && lj.status === 'suspensa') return `<div class="card entra"><h2>Loja indisponível</h2><p class="sub">Este estabelecimento está temporariamente suspenso.</p></div>`;
  if (tk && tk !== m.token) return `<div class="card entra"><h2>Mesa não validada</h2><p class="sub">Leia novamente o QR Code da sua mesa.</p></div>`;
  const cats = ['Todos', ...new Set(S.cardapio.map(p => p.categoria))];
  const lista = S.cardapio.filter(p => V.cat === 'Todos' || p.categoria === V.cat);
  V.idx = Math.min(V.idx, lista.length - 1);
  const podePedir = (SES && SES.perfil !== 'cliente') || (!!tk && tk === m.token);
  const card = (p, i) => `<article class="prato card ${p.disponivel ? '' : 'esg'}" tabindex="0" data-act="${podePedir ? 'add' : 'foco'}" data-id="${p.id}" style="--o:${i - V.idx};--a:${Math.abs(i - V.idx)}">
    <div class="foto">${p.foto ? `<img src="${p.foto}" alt="">` : p.emoji}</div><h3>${p.nome}</h3><span class="preco">${p.disponivel ? R(p.preco) : 'Esgotado'}</span>${p.adicionais?.length ? '<br><small class="sub">personalizável</small>' : ''}${podePedir ? '<span class="mais">+</span>' : ''}</article>`;
  const n = V.cart.reduce((a, i) => a + i.qtd, 0), tot = V.cart.reduce((a, i) => a + i.qtd * i.preco, 0);
  return `<section class="hero entra"><h1>${podePedir ? `Mesa ${m.numero}.<br>O que vai pedir?` : 'Nosso cardápio'}</h1>
    ${podePedir ? `<input class="txt" id="pessoa" placeholder="Seu nome (para dividir a conta)" value="${V.pessoa}" style="max-width:340px">` : '<p class="sub">Para fazer pedidos, leia o QR Code da sua mesa.</p>'}</section>
    <div class="chips">${cats.map(c => `<button class="chip ${c === V.cat ? 'on' : ''}" data-act="cat" data-v="${c}">${c}</button>`).join('')}</div>
    <div class="chips">${['carrossel', 'grade', 'lista'].map(l => `<button class="chip ${l === V.layout ? 'on' : ''}" data-act="layout" data-v="${l}">${l}</button>`).join('')}</div>
    <div class="entra ${V.layout}" id="vitrine" style="margin-top:14px">${lista.map(card).join('')}</div>
    ${V.layout === 'carrossel' ? `<div class="carrossel-nav"><button class="btn fantasma" data-act="prev" aria-label="Anterior">←</button><button class="btn fantasma" data-act="next" aria-label="Próximo">→</button></div>` : ''}
    ${podePedir ? `<div class="barra"><button class="btn sac" data-act="garcom">Chamar garçom</button><button class="btn sac" data-act="conta">Pedir conta</button>
    <button class="btn" data-act="carrinho" ${n ? '' : 'disabled style="opacity:.5"'}>Pedido <span class="badge">${n}</span> ${n ? R(tot) : ''}</button></div>` : ''}`;
}
const porPessoa = itens => itens.reduce((o, i) => ((o[i.pessoa] = o[i.pessoa] || []).push(i), o), {});
function blocoPessoas(itens) {
  return Object.entries(porPessoa(itens)).map(([p, its]) => `<div class="pessoa">${p} — ${R(its.reduce((a, i) => a + i.preco * i.qtd, 0))}</div>` +
    its.map(i => `<div class="linha"><span>${i.qtd}× ${i.nome}</span><span>${R(i.preco * i.qtd)}</span></div>`).join('')).join('');
}
function balcao() {
  const rot = { livre: 'Livre', ocupada: 'Ocupada', reservada: 'Reservada', conta: 'Pediu conta' };
  return `<section class="hero entra"><h1>Salão ao vivo</h1><p class="sub">Toque em uma mesa para abrir a comanda.</p></section>
  <div class="leg">${Object.entries(rot).map(([k, v]) => `<span><i style="background:var(--${k == 'conta' ? 'conta' : k})"></i>${v}</span>`).join('')}</div>
  <div class="mapa">${S.mesas.map((m, i) => { const c = aberta(m.id); return `<button class="mesa card ${m.status} entra" style="animation-delay:${i * 50}ms;font:inherit;color:inherit" data-act="mesa" data-id="${m.id}">
    <b>${m.numero}</b><div class="sub">${m.capacidade} lugares</div><div>${m.chamado ? '🔔 ' : ''}${c ? R(totalC(c)) : rot[m.status]}</div></button>`; }).join('')}</div>`;
}
let prevPend = -1;
function bip() {
  try { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880;
    g.gain.setValueAtTime(.15, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .5); o.start(); o.stop(a.currentTime + .5); } catch {}
}
function cozinha() {
  const itens = S.comandas.filter(c => c.status === 'aberta').flatMap(c => c.itens.map((i, k) => ({ ...i, c, k, mesa: mesaDe(c.mesaId).numero }))).filter(i => i.status !== 'servido');
  const np = itens.filter(i => i.status === 'pendente').length; if (prevPend >= 0 && np > prevPend) bip(); prevPend = np;
  const col = (s, t) => `<div class="col"><h2>${t}</h2>${itens.filter(i => i.status === s).sort((a, b) => a.t - b.t).map(i => {
    const min = Math.floor((Date.now() - i.t) / 6e4);
    return `<div class="card ficha entra ${min > 15 ? 'atraso' : ''}" data-act="avanca" data-c="${i.c.id}" data-k="${i.k}"><b>Mesa ${i.mesa} · ${i.qtd}× ${i.nome}</b><br><small>${i.pessoa} · há ${min} min</small></div>`; }).join('') || '<p class="sub">Nada aqui.</p>'}</div>`;
  return `<section class="hero entra"><h1>Cozinha</h1><p class="sub">Toque na ficha para avançar o status.</p></section>
  <div class="kds">${col('pendente', 'Pendente')}${col('preparo', 'Em preparo')}${col('pronto', 'Pronto para servir')}</div>`;
}
function admin() {
  const pg = S.comandas.filter(c => c.status === 'paga'), fat = pg.reduce((a, c) => a + c.total, 0), tm = pg.length ? fat / pg.length : 0;
  const horas = {}; pg.forEach(c => horas[c.hora] = (horas[c.hora] || 0) + c.total);
  const hs = Object.keys(horas).sort((a, b) => a - b), mx = Math.max(1, ...Object.values(horas));
  const rank = {}; pg.forEach(c => c.itens.forEach(i => rank[i.base || i.nome] = (rank[i.base || i.nome] || 0) + i.qtd));
  const top = Object.entries(rank).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `<section class="hero entra"><h1>Painel da loja</h1></section>
  <div class="kpis entra"><div class="card kpi"><span class="sub">Faturamento</span><b data-n="${fat}" data-m="1">0</b></div>
  <div class="card kpi"><span class="sub">Ticket médio</span><b data-n="${tm}" data-m="1">0</b></div><div class="card kpi"><span class="sub">Contas pagas</span><b data-n="${pg.length}">0</b></div></div>
  <h2>Horários de pico</h2><div class="card graf">${hs.map(h => `<i style="height:${horas[h] / mx * 100}%" title="${h}h"></i>`).join('')}</div>
  <h2>Mais vendidos (ABC)</h2><div class="card">${top.map(([n, q]) => `<div class="linha"><span>${n}</span><b>${q}</b></div>`).join('') || '<span class="sub">Sem vendas ainda.</span>'}</div>
  <h2>Disponibilidade do cardápio</h2><div class="chips" style="flex-wrap:wrap">${S.cardapio.map(p => `<button class="chip ${p.disponivel ? 'on' : ''}" data-act="disp" data-id="${p.id}">${p.nome}</button>`).join('')}</div>
  <h2>Novo produto</h2><div class="card form"><input class="txt" id="nNome" placeholder="Nome do prato"><input class="txt" id="nCat" list="cats" placeholder="Categoria">
  <datalist id="cats">${[...new Set(S.cardapio.map(p => p.categoria))].map(c => `<option value="${c}">`).join('')}</datalist>
  <input class="txt" id="nPreco" type="number" min="0" step="0.01" placeholder="Preço"><input class="txt" id="nEmoji" placeholder="Emoji (opcional)" maxlength="4">
  <input class="txt" id="nAd" placeholder="Adicionais: Queijo:5, Bacon:7"><input class="txt" id="pFoto" type="file" accept="image/*"><button class="btn" data-act="prodAdd">Adicionar ao cardápio</button></div>
  ${S.cardapio.map(p => `<div class="card linha"><span>${p.foto ? `<img src="${p.foto}" alt="" style="width:36px;height:36px;border-radius:8px;object-fit:cover;vertical-align:middle">` : p.emoji} <b>${p.nome}</b> · ${R(p.preco)}</span><button class="btn fantasma" data-act="prodDel" data-id="${p.id}">Remover</button></div>`).join('')}
  <h2>Acessos</h2><div class="card form"><input class="txt" id="eNome" placeholder="Nome"><input class="txt" id="eEmail" type="email" placeholder="E-mail"><input class="txt" id="eSenha" type="password" placeholder="Senha (mín. 6)">
  <select class="txt" id="ePerfil">${Object.entries(ROTULO).filter(([k]) => k !== 'master').map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><button class="btn" data-act="equipeAdd">Criar acesso</button></div>
  ${S.equipe.filter(e => e.perfil !== 'master').map(e => `<div class="card linha"><span><b>${e.nome}</b><br><small class="sub">${e.email || ''}</small></span><span style="display:flex;gap:8px;align-items:center">
  <select class="txt" data-uid="${e.id}" ${e.id === SES?.id ? 'disabled' : ''}>${Object.entries(ROTULO).filter(([k]) => k !== 'master').map(([k, v]) => `<option value="${k}" ${e.perfil === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
  ${e.id === SES?.id ? '' : `<button class="btn fantasma" data-act="equipeDel" data-id="${e.id}">Remover</button>`}</span></div>`).join('')}
  <h2>Promoções</h2><div class="card form"><input class="txt" id="pTit" placeholder="Título"><input class="txt" id="pCup" placeholder="CUPOM"><input class="txt" id="pDes" type="number" min="1" max="100" placeholder="% desconto"><input class="txt" id="pVal" type="date"><button class="btn" data-act="promoAdd">Criar promoção</button></div>
  ${S.promocoes.map(p => `<div class="card linha"><span><b>${p.titulo}</b> · ${p.cupom} · ${p.desconto}% · até ${p.validoAte}</span><button class="btn fantasma" data-act="promoDel" data-id="${p.id}">Remover</button></div>`).join('')}
  <h2>Avaliações ${S.avaliacoes.length ? '· média ' + (S.avaliacoes.reduce((a, x) => a + x.nota, 0) / S.avaliacoes.length).toFixed(1) + ' ★' : ''}</h2>
  ${S.avaliacoes.slice(-5).reverse().map(a => `<div class="card linha"><span>${'★'.repeat(a.nota)} <b>${a.cliente}</b><br><small class="sub">${a.comentario || 'Sem comentário'}</small></span></div>`).join('') || '<p class="sub">Nenhuma avaliação ainda.</p>'}
  <h2>Salão e QR Codes</h2><div class="card form"><input class="txt" id="mCap" type="number" min="1" placeholder="Lugares"><button class="btn" data-act="mesaAdd">Adicionar mesa</button></div>
  <div class="chips" style="flex-wrap:wrap;margin-top:10px">${S.mesas.map(m => `<button class="chip" data-act="qr" data-id="${m.id}">QR · Mesa ${m.numero}</button>`).join('')}</div>
  <h2>Clube de carimbos</h2><div class="card form"><input class="txt" id="fMeta" type="number" min="1" value="${S.fidelidade.meta}"><input class="txt" id="fPremio" value="${S.fidelidade.premio}"><button class="btn" data-act="fidSalvar">Salvar regra</button></div>
  ${[...S.clientes].sort((a, b) => b.carimbos - a.carimbos).slice(0, 5).map(c => `<div class="card linha"><span>•••• ${c.id.slice(-4)}</span><b>${c.carimbos}/${S.fidelidade.meta} · ${c.resgates} resgates</b></div>`).join('') || '<p class="sub">Nenhum cliente no clube ainda.</p>'}`;
}
function reservas() {
  const livres = S.mesas.filter(m => m.status === 'livre'), ativas = S.reservas.filter(r => r.status === 'confirmada').sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  return `<section class="hero entra"><h1>Reservas</h1><p class="sub">Reserve uma mesa livre por data e horário.</p></section>
  <div class="card form entra"><input class="txt" id="rNome" placeholder="Nome do cliente"><input class="txt" id="rPes" type="number" min="1" placeholder="Pessoas">
  <input class="txt" id="rData" type="datetime-local"><select class="txt" id="rMesa">${livres.map(m => `<option value="${m.id}">Mesa ${m.numero} (${m.capacidade})</option>`).join('') || '<option value="">Sem mesas livres</option>'}</select>
  <button class="btn" data-act="reservar">Reservar mesa</button></div>
  <h2>Confirmadas</h2>${ativas.map(r => `<div class="card linha entra"><span><b>${r.clienteNome}</b> · ${r.pessoas} pessoas · Mesa ${mesaDe(r.mesaId)?.numero}<br><small class="sub">${new Date(r.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></span>
  <button class="btn fantasma" data-act="cancelaRes" data-id="${r.id}">Cancelar</button></div>`).join('') || '<p class="sub">Nenhuma reserva ainda.</p>'}`;
}
function master() {
  return `<section class="hero entra"><h1>Lojas</h1><p class="sub">Crie, suspenda ou reative estabelecimentos.</p><div><button class="btn" data-act="estudio">Abrir estúdio visual</button></div></section>
  <div class="card form entra"><input class="txt" id="lNome" placeholder="Nome da nova loja"><button class="btn" data-act="lojaNova">Criar loja</button></div>
  <div class="kds" style="margin-top:16px">${S.lojas.map(l => `<div class="card entra"><h2 style="margin:0">${l.nome}</h2>
  <p class="sub">${l.status === 'ativa' ? '● Ativa' : '○ Suspensa'} · <a style="color:var(--brand)" href="?loja=${l.id}&mesa=5">abrir cardápio</a></p>
  <button class="btn ${l.status === 'ativa' ? 'fantasma' : ''}" data-act="lojaStatus" data-id="${l.id}">${l.status === 'ativa' ? 'Suspender' : 'Reativar'}</button></div>`).join('')}</div>`;
}
const VIEW_FN = { cliente, balcao, cozinha, admin, reservas, master };

// ---------- render ----------
function render() {
  if (BOOT_ERRO) {
    $('#nav').style.display = 'none'; $('#btnEstudio').style.display = 'none'; $('#btnLogin').style.display = ''; $('#btnLogin').textContent = 'Sair';
    const perm = BOOT_ERRO.code === 'permission-denied';
    $('#app').innerHTML = `<section class="login"><div class="login-card card"><h1>Não foi possível entrar</h1>
    <p class="sub">${perm ? 'O Firestore negou a leitura do seu perfil. Publique o arquivo <b>firestore.rules</b> na aba Regras do projeto <b>restaurante-gns</b> e confirme que o documento <b>master/SEU-UID</b> existe.' : 'Falha ao iniciar o Firebase.'}</p>
    <p class="erro">${BOOT_ERRO.code || BOOT_ERRO.message}</p><button class="btn" data-act="recarregar">Tentar novamente</button><button class="btn fantasma" data-act="sairErro">Sair</button></div></section>`;
    return;
  }
  const fora = !SES && !GUEST();
  $('#btnLogin').style.display = fora ? 'none' : ''; $('#btnLogin').textContent = SES ? 'Sair (' + SES.nome + ')' : 'Sair';
  $('#btnEstudio').style.display = !fora && SES && ['master', 'admin'].includes(SES.perfil) ? '' : 'none';
  if (fora) {
    $('#nav').style.display = 'none';
    if ($('#app').dataset.tela !== 'login' + V.modoLogin) { $('#app').dataset.tela = 'login' + V.modoLogin; $('#app').innerHTML = login(); }
    return;
  }
  $('#app').dataset.tela = '';
  if (!pode(V.view)) V.view = INICIO[SES?.perfil] || 'cliente';
  $('#nav').style.display = Object.keys(VIEWS).filter(pode).length > 1 ? '' : 'none';
  $('#nav').innerHTML = Object.entries(VIEWS).filter(([k]) => pode(k)).map(([k, v]) => `<button class="${k === V.view ? 'on' : ''}" data-act="view" data-v="${k}">${v}</button>`).join('');
  const foco = document.activeElement?.id, val = $('#pessoa')?.value;
  const rolagem = scrollY;
  $('#app').innerHTML = VIEW_FN[V.view]();
  if (V.view === 'cliente' && V.layout === 'carrossel') pos();
  scrollTo(0, rolagem);
  if (foco === 'pessoa') { const e = $('#pessoa'); e.focus(); e.setSelectionRange(val.length, val.length); }
  document.querySelectorAll('[data-n]').forEach(el => {
    const f = +el.dataset.n, t0 = performance.now(); (function p(t) { const k = Math.min(1, (t - t0) / 900), v = f * (1 - Math.pow(1 - k, 3));
      el.textContent = el.dataset.m ? R(v) : Math.round(v); if (k < 1) requestAnimationFrame(p); })(t0);
  });
}
function folha(html) { $('#folha').innerHTML = html; $('#folha').classList.add('on'); $('#veu').classList.add('on'); }
function fecha() { $('#folha').classList.remove('on'); $('#veu').classList.remove('on'); }
document.body.insertAdjacentHTML('beforeend', '<div id="veu" class="veu"></div><div id="folha" class="folha"></div>');
$('#veu').onclick = fecha;

function pagar(id, forma) {
  const c = aberta(id), m = mesaDe(id);
  c.status = 'paga'; c.total = totalC(c); c.forma = forma; c.hora = new Date().getHours();
  m.status = 'livre'; m.chamado = false; persist('mesas', m); fecha();
  let msg = 'Pago via ' + forma + '. Mesa livre.';
  if (c.telefone) {
    let cl = S.clientes.find(x => x.id === c.telefone); if (!cl) S.clientes.push(cl = { id: c.telefone, carimbos: 0, resgates: 0 });
    cl.carimbos++;
    if (cl.carimbos >= S.fidelidade.meta) { cl.carimbos = 0; cl.resgates++; msg = '🎁 Cliente ganhou: ' + S.fidelidade.premio; } else msg += ` Carimbo ${cl.carimbos}/${S.fidelidade.meta}`;
    persist('clientes', cl);
  }
  save('comandas', c); toast(msg);
}
function abrirCarrinho() {
  const sub = V.cart.reduce((a, i) => a + i.qtd * i.preco, 0), d = V.cupom ? V.cupom.desconto : 0;
  folha(`<h2>Seu pedido</h2>${blocoPessoas(V.cart)}<div class="form" style="margin:14px 0"><input class="txt" id="cupom" placeholder="Cupom" value="${V.cupom?.cupom || ''}"><button class="btn fantasma" data-act="cupom">Aplicar</button></div>
  <input class="txt" id="tel" type="tel" inputmode="numeric" placeholder="Telefone (opcional) para ganhar carimbos" value="${V.tel || ''}" style="width:100%"><small class="sub">Ao informar o telefone, você aceita participar do clube de fidelidade da casa.</small>
  ${d ? `<div class="linha"><span>Desconto ${d}%</span><b>− ${R(sub * d / 100)}</b></div>` : ''}<div class="linha"><b>Total</b><b>${R(sub * (1 - d / 100))}</b></div><br><button class="btn" style="width:100%" data-act="envia">Enviar para a cozinha</button>`);
}
function avaliar() {
  const cm = $('#comentario')?.value || '';
  folha(`<h2>Como foi a experiência?</h2><div class="chips" style="justify-content:center">${[1, 2, 3, 4, 5].map(n => `<button class="chip ${n <= V.nota ? 'on' : ''}" style="font-size:22px" data-act="nota" data-v="${n}">★</button>`).join('')}</div>
  <input class="txt" id="comentario" placeholder="Comentário (opcional)" value="${cm}" style="width:100%;margin:12px 0"><button class="btn" style="width:100%" data-act="avalia">Enviar avaliação</button>`);
}
async function mostrarQr(id) {
  const m = mesaDe(id), url = `${location.origin}${location.pathname}?loja=${LOJA}&mesa=${m.numero}&t=${m.token}`;
  folha('<h2>Gerando QR Code…</h2>');
  try {
    const QR = (await import('https://esm.sh/qrcode@1.5.3')).default, img = await QR.toDataURL(url, { width: 360, margin: 2, color: { dark: '#17101f', light: '#ffffff' } });
    folha(`<h2>Mesa ${m.numero}</h2><div style="text-align:center"><img src="${img}" alt="QR Code da mesa ${m.numero}" style="width:min(100%,300px);border-radius:var(--r)"><p class="sub" style="word-break:break-all;font-size:12px">${url}</p></div><br><button class="btn" style="width:100%" onclick="print()">Imprimir</button>`);
  } catch { folha('<h2>Não foi possível gerar o QR</h2><p class="sub">Verifique a conexão e tente novamente.</p>'); }
}
function confete() {
  const cores = ['var(--brand)', 'var(--brand2)', '#6a5cff', '#3ddc97'];
  for (let i = 0; i < 36; i++) {
    const e = document.createElement('i'); e.className = 'conf';
    e.style.cssText = `left:${40 + Math.random() * 20}%;background:${cores[i % 4]};--x:${(Math.random() - .5) * 90}vw;--y:${-30 - Math.random() * 40}vh;--g:${360 * Math.random()}deg;animation-delay:${Math.random() * .15}s`;
    document.body.append(e); setTimeout(() => e.remove(), 1800);
  }
}
function reduzir(file, max = 640) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', .78));
    };
    img.src = URL.createObjectURL(file);
  });
}
function colocar(p, extras = [], obs = '') {
  const pessoa = ($('#pessoa')?.value || '').trim() || 'Mesa'; V.pessoa = $('#pessoa')?.value || '';
  const nome = p.nome + (extras.length ? ' + ' + extras.map(e => e.nome).join(', ') : '') + (obs ? ` (${obs})` : ''), preco = p.preco + extras.reduce((a, e) => a + e.preco, 0);
  const ex = V.cart.find(i => i.nome === nome && i.pessoa === pessoa);
  ex ? ex.qtd++ : V.cart.push({ id: p.id, base: p.nome, nome, preco, qtd: 1, pessoa }); toast('+ ' + p.nome); render();
}
function abrirOpcoes(p) {
  folha(`<h2>${p.nome}</h2><p class="sub">Personalize do seu jeito.</p>${p.adicionais.map((a, i) => `<label class="linha"><span><input type="checkbox" class="ad" value="${i}"> ${a.nome}</span><b>+ ${R(a.preco)}</b></label>`).join('')}
  <input class="txt" id="obs" placeholder="Observação (ex.: sem cebola)" style="width:100%;margin:14px 0"><button class="btn" style="width:100%" data-act="confirmaOp" data-id="${p.id}">Adicionar ao pedido</button>`);
}
// ---------- ações ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const { act, id, v } = b.dataset, m = mesaDe(V.mesa);
  if (act === 'view') { V.view = v; prevPend = -1; render(); }
  else if (act === 'cat') { V.cat = v; V.idx = 0; render(); }
  else if (act === 'layout') { V.layout = v; render(); }
  else if (act === 'prev' || act === 'next') { V.idx += act === 'next' ? 1 : -1; V.idx = Math.max(0, Math.min(document.querySelectorAll('#vitrine .prato').length - 1, V.idx)); pos(); }
  else if (act === 'add') {
    const els = [...document.querySelectorAll('#vitrine .prato')];
    if (V.layout === 'carrossel' && els.indexOf(b) !== V.idx) { V.idx = els.indexOf(b); return pos(); }
    const p = S.cardapio.find(x => x.id === id); p.adicionais?.length ? abrirOpcoes(p) : colocar(p);
  }
  else if (act === 'carrinho') abrirCarrinho();
  else if (act === 'envia') {
    let c = aberta(m.id); if (!c) S.comandas.push(c = { id: 'c' + Date.now(), mesaId: m.id, status: 'aberta', itens: [] });
    if (V.cupom) { c.desconto = V.cupom.desconto; c.cupom = V.cupom.cupom; }
    const tel = ($('#tel')?.value || V.tel || '').replace(/\D/g, ''); if (tel.length >= 10) c.telefone = tel; V.tel = '';
    V.cart.forEach(i => c.itens.push({ nome: i.nome, preco: i.preco, qtd: i.qtd, pessoa: i.pessoa, status: 'pendente', t: Date.now(), base: i.base }));
    V.cart = []; m.status = 'ocupada'; persist('mesas', m); fecha(); save('comandas', c); toast('Pedido enviado!'); confete();
  }
  else if (act === 'garcom') { m.chamado = true; save('mesas', m); toast('Garçom chamado'); }
  else if (act === 'conta') { m.status = 'conta'; save('mesas', m); toast('Conta solicitada'); avaliar(); }
  else if (act === 'mesa') {
    const mm = mesaDe(id), c = aberta(id);
    folha(`<h2>Mesa ${mm.numero}</h2>` + (c ? `${blocoPessoas(c.itens)}${c.telefone ? `<p class="sub">Clube: ${S.clientes.find(x => x.id === c.telefone)?.carimbos || 0}/${S.fidelidade.meta} carimbos</p>` : ''}<div class="linha"><b>Total</b><b>${R(totalC(c))}</b></div><br>
      <div class="chips">${['Pix', 'Cartão', 'Dinheiro'].map(f => `<button class="btn" data-act="paga" data-id="${id}" data-v="${f}">${f}</button>`).join('')}</div>`
      : `<p class="sub">Sem pedidos. Defina o status:</p><div class="chips">${['livre', 'ocupada', 'reservada'].map(s => `<button class="btn fantasma" data-act="status" data-id="${id}" data-v="${s}">${s}</button>`).join('')}</div>`));
  }
  else if (act === 'paga') pagar(id, v);
  else if (act === 'status') { const mm = mesaDe(id); mm.status = v; mm.chamado = false; fecha(); save('mesas', mm); }
  else if (act === 'avanca') {
    const c = S.comandas.find(x => x.id === b.dataset.c), i = c.itens[+b.dataset.k];
    i.status = { pendente: 'preparo', preparo: 'pronto', pronto: 'servido' }[i.status]; save('comandas', c);
  }
  else if (act === 'reservar') {
    const nome = $('#rNome').value.trim(), data = $('#rData').value, mid = $('#rMesa').value, pes = +$('#rPes').value;
    if (!nome || !data || !mid || !pes) return toast('Preencha todos os campos');
    const r = { id: 'r' + Date.now(), clienteNome: nome, dataHora: data, mesaId: mid, pessoas: pes, status: 'confirmada' }, mm = mesaDe(mid);
    S.reservas.push(r); mm.status = 'reservada'; persist('mesas', mm); save('reservas', r); toast('Reserva confirmada');
  }
  else if (act === 'cancelaRes') {
    const r = S.reservas.find(x => x.id === id), mm = mesaDe(r.mesaId); r.status = 'cancelada';
    if (mm.status === 'reservada') { mm.status = 'livre'; persist('mesas', mm); } save('reservas', r); toast('Reserva cancelada');
  }
  else if (act === 'lojaNova') {
    const nome = $('#lNome').value.trim(); if (!nome) return toast('Informe o nome');
    const l = { id: nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), nome, status: 'ativa' };
    S.lojas.push(l); save('lojas', l); toast('Loja criada');
  }
  else if (act === 'lojaStatus') { const l = S.lojas.find(x => x.id === id); l.status = l.status === 'ativa' ? 'suspensa' : 'ativa'; save('lojas', l); }
  else if (act === 'fidSalvar') {
    S.fidelidade = { meta: Math.max(1, +$('#fMeta').value || 10), premio: $('#fPremio').value.trim() || 'Brinde' };
    persist('config', { id: 'fidelidade', ...S.fidelidade }); save(); toast('Regra salva');
  }
  else if (act === 'confirmaOp') {
    const p = S.cardapio.find(x => x.id === id), extras = [...document.querySelectorAll('.ad:checked')].map(x => p.adicionais[+x.value]), obs = $('#obs').value.trim();
    fecha(); colocar(p, extras, obs);
  }
  else if (act === 'prodAdd') {
    const nome = $('#nNome').value.trim(), preco = parseFloat($('#nPreco').value);
    if (!nome || isNaN(preco)) return toast('Informe nome e preço');
    const o = { id: 'p' + Date.now(), nome, categoria: $('#nCat').value.trim() || 'Pratos', preco, emoji: $('#nEmoji').value.trim() || '🍽️', foto: V.fotoTmp || '', disponivel: true,
      adicionais: $('#nAd').value.split(',').map(t => t.split(':')).map(([n, v]) => ({ nome: (n || '').trim(), preco: parseFloat(v) || 0 })).filter(a => a.nome) };
    V.fotoTmp = ''; S.cardapio.push(o); save('cardapio', o); toast('Produto adicionado');
  }
  else if (act === 'prodDel') { S.cardapio = S.cardapio.filter(x => x.id !== id); if (db) fs.deleteDoc(fs.doc(db, 'tenants', LOJA, 'cardapio', id)); save(); toast('Produto removido'); }
  else if (act === 'mesaAdd') {
    const cap = +$('#mCap').value; if (!cap) return toast('Informe os lugares');
    const n = Math.max(0, ...S.mesas.map(x => x.numero)) + 1, o = { id: 'm' + n, numero: n, capacidade: cap, status: 'livre', token: crypto.randomUUID().slice(0, 8) };
    S.mesas.push(o); save('mesas', o); toast('Mesa ' + n + ' criada');
  }
  else if (act === 'qr') mostrarQr(id);
  else if (act === 'cupom') {
    V.tel = $('#tel')?.value || ''; const cod = $('#cupom').value.trim().toUpperCase(), hoje = new Date().toISOString().slice(0, 10);
    V.cupom = S.promocoes.find(x => x.cupom === cod && x.ativa !== false && x.validoAte >= hoje) || null;
    abrirCarrinho(); toast(V.cupom ? 'Cupom aplicado: ' + V.cupom.desconto + '%' : 'Cupom inválido ou vencido');
  }
  else if (act === 'nota') { V.nota = +v; avaliar(); }
  else if (act === 'avalia') {
    if (!V.nota) return toast('Escolha uma nota');
    const o = { id: 'a' + Date.now(), nota: V.nota, comentario: $('#comentario').value.trim(), cliente: V.pessoa || 'Mesa ' + m.numero, data: new Date().toISOString() };
    S.avaliacoes.push(o); V.nota = 0; fecha(); save('avaliacoes', o); toast('Obrigado pela avaliação!');
  }
  else if (act === 'promoAdd') {
    const t = $('#pTit').value.trim(), c = $('#pCup').value.trim().toUpperCase(), d = +$('#pDes').value, val = $('#pVal').value;
    if (!t || !c || !d || !val) return toast('Preencha todos os campos');
    const o = { id: 'pr' + Date.now(), titulo: t, cupom: c, desconto: d, validoAte: val, ativa: true }; S.promocoes.push(o); save('promocoes', o); toast('Promoção criada');
  }
  else if (act === 'promoDel') { S.promocoes = S.promocoes.filter(x => x.id !== id); if (db) fs.deleteDoc(fs.doc(db, 'tenants', LOJA, 'promocoes', id)); save(); toast('Removida'); }
  else if (act === 'recarregar') location.reload();
  else if (act === 'sairErro') $('#btnLogin').click();
  else if (act === 'modo') { V.modoLogin = v; render(); }
  else if (act === 'acessar') acessar(V.modoLogin);
  else if (act === 'convidado') convidado();
  else if (act === 'foco') { V.idx = [...document.querySelectorAll('#vitrine .prato')].indexOf(b); pos(); }
  else if (act === 'estudio') $('#estudio').classList.add('on');
  else if (act === 'equipeAdd') addEquipe();
  else if (act === 'equipeDel') { S.equipe = S.equipe.filter(x => x.id !== id); if (db) fs.deleteDoc(fs.doc(db, 'tenants', LOJA, 'equipe', id)); save(); toast('Removido'); }
  else if (act === 'disp') { const p = S.cardapio.find(x => x.id === id); p.disponivel = !p.disponivel; save('cardapio', p); }
  const r = e.target.closest('.btn');
  if (r) { const s = document.createElement('span'), bx = r.getBoundingClientRect(); s.className = 'rip'; s.style.cssText = `width:40px;height:40px;left:${e.clientX - bx.left - 20}px;top:${e.clientY - bx.top - 20}px`; r.append(s); setTimeout(() => s.remove(), 600); }
});
function pos() {
  document.querySelectorAll('#vitrine .prato').forEach((c, i) => {
    const a = Math.abs(i - V.idx); c.style.setProperty('--o', i - V.idx); c.style.setProperty('--a', a);
    c.style.visibility = a > 2 ? 'hidden' : 'visible'; c.style.pointerEvents = a > 2 ? 'none' : '';
  });
}
// deslizar no carrossel
let x0 = null;
document.addEventListener('pointerdown', e => { if (e.target.closest('.carrossel')) x0 = e.clientX; });
document.addEventListener('pointerup', e => {
  if (x0 === null) return; const d = e.clientX - x0; x0 = null;
  if (Math.abs(d) > 50) { V.idx = Math.max(0, Math.min(document.querySelectorAll('#vitrine .prato').length - 1, V.idx + (d < 0 ? 1 : -1))); pos(); }
});
// inclinação 3D nos cartões (mouse)
document.addEventListener('pointermove', e => {
  const c = e.target.closest('.grade .prato,.lista .prato'); if (!c || e.pointerType !== 'mouse') return;
  const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
  c.style.transform = `perspective(700px) rotateY(${px * 14}deg) rotateX(${-py * 14}deg) translateY(-4px)`;
});
document.addEventListener('pointerout', e => { const c = e.target.closest('.prato'); if (c && !c.closest('.carrossel')) c.style.transform = ''; });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id?.startsWith('lg')) acessar(V.modoLogin); if (e.key === 'Enter' && e.target.classList.contains('prato')) e.target.click(); if (e.key === 'Escape') { fecha(); $('#estudio').classList.remove('on'); } });

document.addEventListener('change', async e => {
  if (e.target.matches?.('select[data-uid]')) return mudaPerfil(e.target.dataset.uid, e.target.value);
  if (e.target.id === 'pFoto' && e.target.files[0]) { V.fotoTmp = await reduzir(e.target.files[0]); toast('Foto pronta'); }
});
// ---------- estúdio de tema ----------
const OPTS = { Tema: ['noite', 'claro', 'argila', 'nevoa'], Forma: ['reta', 'suave', 'redonda', 'capsula'], Moldura: ['arco', 'circulo', 'retrato', 'polaroid'], Textura: ['grade', 'pontos', 'linhas', 'losangos', 'hachura', 'nenhuma'], Layout: ['carrossel', 'grade', 'lista'] };
const PREF = JSON.parse(localStorage.getItem('mv_tema') || '{}'), H = document.documentElement;
const ATTR = { Tema: 'tema', Forma: 'forma', Moldura: 'moldura', Textura: 'textura' };
const salvaTema = () => {
  localStorage.setItem('mv_tema', JSON.stringify(PREF));
  if (db && SES && ['master', 'admin'].includes(SES.perfil)) persist('config', { id: 'tema', ...PREF });
};
function aplica() {
  Object.entries(ATTR).forEach(([k, a]) => PREF[k] && H.setAttribute('data-' + a, PREF[k]));
  if (PREF.marca) H.style.setProperty('--brand', PREF.marca);
  if (PREF.Layout) V.layout = PREF.Layout;
  Object.entries(OPTS).forEach(([k, vs]) => { const el = $('#opt' + k); if (el) el.innerHTML = vs.map(v => `<button class="${(PREF[k] || H.getAttribute('data-' + ATTR[k]) || V.layout) === v ? 'on' : ''}" data-k="${k}" data-v="${v}">${v}</button>`).join(''); });
}
$('#estudio').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; PREF[b.dataset.k] = b.dataset.v; salvaTema(); aplica(); render(); });
$('#corMarca').addEventListener('input', e => { PREF.marca = e.target.value; salvaTema(); aplica(); });
$('#btnLogin').onclick = async () => {
  sessionStorage.removeItem('mv_ses'); sessionStorage.removeItem('mv_guest');
  if (db && auth) { try { await au.signOut(auth); } catch {} return location.reload(); }
  SES = null; V.view = 'cliente'; render();
};
$('#btnEstudio').onclick = () => $('#estudio').classList.toggle('on');
if (SES) V.view = INICIO[SES.perfil];
aplica(); render();
setInterval(() => V.view === 'cozinha' && render(), 30000);
