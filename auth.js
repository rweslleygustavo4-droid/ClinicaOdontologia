/* ═══════════════════════════════════════════
   AUTH.JS — Login, Cadastro e Sessão
   Clínica WG

   Estrutura compatível com Supabase Auth.
   Atualmente usa localStorage como fallback.
   Para migrar para Supabase Auth, substitua
   as funções login(), cadastro() e logout()
   pelas chamadas à API do Supabase.
═══════════════════════════════════════════ */

// ─── Verifica sessão ao carregar ───────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const usuario = await obterSessaoAtual();

  if (usuario) {
    const liberado = await verificarAssinatura(usuario);
    if (liberado) {
      entrarNoSistema(usuario, false);
    } else {
      mostrarPaywall();
    }
  }
});

// ═══════════════════════════════════════════
//  SUPABASE AUTH READY
//  Quando integrar Supabase Auth, substitua
//  o corpo das funções abaixo:
// ═══════════════════════════════════════════

/**
 * Faz login do usuário.
 * Supabase: supabase.auth.signInWithPassword({ email, password })
 */
async function login(email, senha) {
  // ── Fallback localStorage ──
  const usuarios = _getUsuarios();
  const usuario = usuarios.find(u => u.email === email && u.senha === senha);
  if (!usuario) throw new Error('E-mail ou senha incorretos.');
  _setSessao(usuario);
  return usuario;

  // ── Supabase (descomente quando integrar) ──
  // const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  // if (error) throw new Error(error.message);
  // return data.user;
}

/**
 * Cadastra um novo usuário.
 * Supabase: supabase.auth.signUp({ email, password, options: { data: { nome } } })
 */
async function cadastro(nome, email, senha) {
  // ── Fallback localStorage ──
  const usuarios = _getUsuarios();
  if (usuarios.find(u => u.email === email)) {
    throw new Error('Já existe uma conta com este e-mail.');
  }
  const novoUsuario = { nome, email, senha, criadoEm: new Date().toISOString() };
  usuarios.push(novoUsuario);
  _setUsuarios(usuarios);
  _setSessao(novoUsuario);
  return novoUsuario;

  // ── Supabase (descomente quando integrar) ──
  // const { data, error } = await supabase.auth.signUp({
  //   email, password: senha,
  //   options: { data: { nome } }
  // });
  // if (error) throw new Error(error.message);
  // return data.user;
}

/**
 * Faz logout do usuário.
 * Supabase: supabase.auth.signOut()
 */
async function logout() {
  // ── Fallback localStorage ──
  _clearSessao();

  // ── Supabase (descomente quando integrar) ──
  // await supabase.auth.signOut();
}

/**
 * Retorna o usuário logado atualmente.
 * Supabase: supabase.auth.getUser()
 */
async function obterSessaoAtual() {
  // ── Fallback localStorage ──
  return _getSessao();

  // ── Supabase (descomente quando integrar) ──
  // const { data } = await supabase.auth.getUser();
  // return data?.user ?? null;
}

// ═══════════════════════════════════════════
//  STRIPE READY — Verificação de assinatura
// ═══════════════════════════════════════════

/**
 * Verifica se o usuário tem assinatura ativa.
 * Aqui você conectará com o Stripe ou uma tabela
 * "assinaturas" no Supabase.
 *
 * @param {Object} usuario
 * @returns {boolean} true = acesso liberado
 */
async function verificarAssinatura(usuario) {
  // ── Modo desenvolvimento: sempre libera ──
  // Para bloquear, retorne false ou consulte o Stripe/Supabase.
  return true;

  // ── Stripe + Supabase (implemente futuramente) ──
  // const { data } = await supabase
  //   .from('assinaturas')
  //   .select('status, validade')
  //   .eq('usuario_id', usuario.id)
  //   .single();
  // return data?.status === 'ativo' && new Date(data.validade) > new Date();
}

/**
 * Redireciona para a página de pagamento (Stripe Checkout).
 */
function redirecionarParaPagamento() {
  // ── Stripe (substitua pela sua URL de checkout) ──
  // window.location.href = 'https://buy.stripe.com/SEU_LINK_AQUI';
  mostrarToast('Em breve: integração com Stripe!', 'info');
}

// ════════════════════════
//  HANDLERS DA UI
// ════════════════════════

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  _limparErro('erro-login');

  if (!email) { _mostrarErro('erro-login', 'Informe o e-mail.'); return; }
  if (!senha)  { _mostrarErro('erro-login', 'Informe a senha.'); return; }

  const btn = document.querySelector('#form-login .auth-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Entrando...';

  try {
    const usuario = await login(email, senha);
    const liberado = await verificarAssinatura(usuario);
    if (liberado) {
      entrarNoSistema(usuario, true);
    } else {
      entrarNoSistema(usuario, true);
      setTimeout(() => mostrarPaywall(), 400);
    }
  } catch (err) {
    _mostrarErro('erro-login', err.message);
    _shake('.auth-card');
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Entrar';
  }
}

async function fazerCadastro() {
  const nome  = document.getElementById('cad-nome').value.trim();
  const email = document.getElementById('cad-email').value.trim();
  const senha = document.getElementById('cad-senha').value;
  _limparErro('erro-cadastro');

  if (!nome)               { _mostrarErro('erro-cadastro', 'Informe seu nome.'); return; }
  if (!email)              { _mostrarErro('erro-cadastro', 'Informe o e-mail.'); return; }
  if (!_emailValido(email)){ _mostrarErro('erro-cadastro', 'E-mail inválido.'); return; }
  if (senha.length < 6)    { _mostrarErro('erro-cadastro', 'Senha deve ter mínimo 6 caracteres.'); return; }

  const btn = document.querySelector('#form-cadastro .auth-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Criando conta...';

  try {
    const usuario = await cadastro(nome, email, senha);
    mostrarToast('Conta criada com sucesso!', 'success');
    setTimeout(() => entrarNoSistema(usuario, true), 700);
  } catch (err) {
    _mostrarErro('erro-cadastro', err.message);
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Criar conta';
  }
}

async function fazerLogout() {
  await logout();

  const overlay = document.getElementById('auth-overlay');
  const sistema = document.getElementById('sistema');
  const paywall = document.getElementById('paywall-overlay');

  overlay.classList.remove('oculto', 'saindo');
  sistema.classList.add('oculto');
  sistema.classList.remove('entrando');
  paywall.classList.add('oculto');

  // Limpa campos
  ['login-email','login-senha','cad-nome','cad-email','cad-senha'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  _limparErro('erro-login');
  _limparErro('erro-cadastro');
  trocarAba('login');
}

function mostrarPaywall() {
  document.getElementById('paywall-overlay').classList.remove('oculto');
}

// ════════════════════════
//  ENTRAR NO SISTEMA
// ════════════════════════

function entrarNoSistema(usuario, animado) {
  // Atualiza sidebar
  const nomeEl   = document.getElementById('user-nome');
  const avatarEl = document.getElementById('user-avatar');
  const emailEl  = document.getElementById('user-email-display');

  const nome = usuario.nome || usuario.user_metadata?.nome || '';
  const email = usuario.email || '';

  if (nomeEl)   nomeEl.textContent   = nome || email;
  if (avatarEl) avatarEl.textContent = _iniciais(nome || email);
  if (emailEl)  emailEl.textContent  = email;

  const overlay = document.getElementById('auth-overlay');
  const sistema = document.getElementById('sistema');

  if (animado) {
    overlay.classList.add('saindo');
    setTimeout(() => {
      overlay.classList.add('oculto');
      sistema.classList.remove('oculto');
      sistema.classList.add('entrando');
      // Dispara init do sistema
      if (typeof iniciarSistema === 'function') iniciarSistema(usuario);
    }, 350);
  } else {
    overlay.classList.add('oculto');
    sistema.classList.remove('oculto');
    if (typeof iniciarSistema === 'function') iniciarSistema(usuario);
  }
}

// ════════════════════════
//  ABAS
// ════════════════════════

function trocarAba(aba) {
  const slider = document.getElementById('tab-slider');
  const tLogin = document.getElementById('tab-login');
  const tCad   = document.getElementById('tab-cadastro');
  const fLogin = document.getElementById('form-login');
  const fCad   = document.getElementById('form-cadastro');

  _limparErro('erro-login');
  _limparErro('erro-cadastro');

  if (aba === 'login') {
    tLogin.classList.add('ativo'); tCad.classList.remove('ativo');
    slider.classList.remove('direita');
    fLogin.classList.remove('oculto'); fCad.classList.add('oculto');
  } else {
    tCad.classList.add('ativo'); tLogin.classList.remove('ativo');
    slider.classList.add('direita');
    fCad.classList.remove('oculto'); fLogin.classList.add('oculto');
  }
}

function toggleSenha(inputId, btn) {
  const input = document.getElementById(inputId);
  const visivel = input.type === 'text';
  input.type = visivel ? 'password' : 'text';
  btn.innerHTML = visivel
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

// ════════════════════════
//  HELPERS PRIVADOS
// ════════════════════════

function _getUsuarios() {
  return JSON.parse(localStorage.getItem('clinica_wg_usuarios') || '[]');
}
function _setUsuarios(u) {
  localStorage.setItem('clinica_wg_usuarios', JSON.stringify(u));
}
function _getSessao() {
  const s = localStorage.getItem('clinica_wg_sessao');
  return s ? JSON.parse(s) : null;
}
function _setSessao(u) {
  localStorage.setItem('clinica_wg_sessao', JSON.stringify(u));
}
function _clearSessao() {
  localStorage.removeItem('clinica_wg_sessao');
}
function _mostrarErro(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg ? '⚠ ' + msg : '';
}
function _limparErro(id) {
  _mostrarErro(id, '');
}
function _emailValido(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
function _iniciais(nome) {
  if (!nome) return '--';
  const p = nome.trim().split(' ');
  return p.length === 1
    ? p[0].substring(0, 2).toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function _shake(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.style.animation = 'none';
  requestAnimationFrame(() => { el.style.animation = 'shake 0.4s ease'; });
}

// Shake keyframes
const _shakeStyle = document.createElement('style');
_shakeStyle.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-6px); }
    40%      { transform: translateX(6px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
  }
`;
document.head.appendChild(_shakeStyle);

// Enter para submeter
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const overlay = document.getElementById('auth-overlay');
  if (!overlay || overlay.classList.contains('oculto')) return;
  const loginVisivel = !document.getElementById('form-login').classList.contains('oculto');
  loginVisivel ? fazerLogin() : fazerCadastro();
});