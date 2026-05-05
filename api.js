/* ═══════════════════════════════════════════
   API.JS — Camada de dados
   Clínica WG

   Todas as funções estão prontas para
   conectar com Supabase. Atualmente usam
   localStorage como mock/fallback.

   Para ativar Supabase:
   1. Descomente o import e configure as vars
   2. Substitua os blocos "Fallback" pelos
      blocos "Supabase" em cada função
═══════════════════════════════════════════ */

// ── Supabase (descomente quando integrar) ──
// import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
// const SUPABASE_URL = 'SUA_URL_AQUI';
// const SUPABASE_KEY = 'SUA_KEY_AQUI';
// const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ════════════════════════
//  UTILITÁRIOS
// ════════════════════════

function dataHoje() {
  return new Date().toISOString().split('T')[0];
}

function formatarData(dataISO) {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

function iniciaisDe(nome = '') {
  return nome
    .trim()
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('');
}

function gerarId() {
  return 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

// ════════════════════════
//  MOCK — localStorage
// ════════════════════════

function _getMockClientes() {
  return JSON.parse(localStorage.getItem('wg_clientes') || '[]');
}
function _setMockClientes(data) {
  localStorage.setItem('wg_clientes', JSON.stringify(data));
}
function _getMockAgendamentos() {
  return JSON.parse(localStorage.getItem('wg_agendamentos') || '[]');
}
function _setMockAgendamentos(data) {
  localStorage.setItem('wg_agendamentos', JSON.stringify(data));
}
function _getMockMensagens() {
  return JSON.parse(localStorage.getItem('wg_mensagens') || '{}');
}
function _setMockMensagens(data) {
  localStorage.setItem('wg_mensagens', JSON.stringify(data));
}

// ════════════════════════
//  CLIENTES
// ════════════════════════

/**
 * Busca todos os clientes (com filtro opcional por nome).
 * @param {string} busca — texto livre
 * @returns {Promise<Array>}
 */
async function getClientes(busca = '') {
  // ── Fallback localStorage ──
  let lista = _getMockClientes();
  if (busca.trim()) {
    const q = busca.toLowerCase();
    lista = lista.filter(c => c.nome.toLowerCase().includes(q));
  }
  return lista.sort((a, b) => a.nome.localeCompare(b.nome));

  // ── Supabase (descomente) ──
  // let q = supabase.from('clientes').select('*').order('nome');
  // if (busca.trim()) q = q.ilike('nome', `%${busca}%`);
  // const { data, error } = await q;
  // if (error) throw error;
  // return data;
}

/**
 * Busca cliente por ID.
 * @param {string} id
 */
async function getClienteById(id) {
  // ── Fallback ──
  const lista = _getMockClientes();
  return lista.find(c => c.id === id) || null;

  // ── Supabase ──
  // const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
  // if (error) throw error;
  // return data;
}

/**
 * Cria um novo cliente.
 * @param {Object} cliente — { nome, telefone, email, data_nascimento, status }
 */
async function createCliente(cliente) {
  // ── Fallback ──
  const lista = _getMockClientes();
  const novo = {
    id: gerarId(),
    nome:            cliente.nome,
    telefone:        cliente.telefone        || '',
    email:           cliente.email           || '',
    data_nascimento: cliente.data_nascimento || null,
    status:          cliente.status          || 'Ativo',
    created_at: new Date().toISOString(),
  };
  lista.push(novo);
  _setMockClientes(lista);
  return novo;

  // ── Supabase ──
  // const { data, error } = await supabase.from('clientes').insert([cliente]).select().single();
  // if (error) throw error;
  // return data;
}

/**
 * Atualiza um cliente.
 * @param {string} id
 * @param {Object} campos
 */
async function updateCliente(id, campos) {
  // ── Fallback ──
  const lista = _getMockClientes();
  const idx = lista.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Cliente não encontrado.');
  lista[idx] = { ...lista[idx], ...campos };
  _setMockClientes(lista);
  return lista[idx];

  // ── Supabase ──
  // const { data, error } = await supabase.from('clientes').update(campos).eq('id', id).select().single();
  // if (error) throw error;
  // return data;
}

/**
 * Remove um cliente.
 * @param {string} id
 */
async function deleteCliente(id) {
  // ── Fallback ──
  const lista = _getMockClientes().filter(c => c.id !== id);
  _setMockClientes(lista);
  return true;

  // ── Supabase ──
  // const { error } = await supabase.from('clientes').delete().eq('id', id);
  // if (error) throw error;
  // return true;
}

// ════════════════════════
//  AGENDAMENTOS
// ════════════════════════

/**
 * Busca agendamentos de uma data (padrão: hoje), com join de clientes.
 * @param {string} data — 'YYYY-MM-DD'
 */
async function getAgendamentos(data = dataHoje()) {
  // ── Fallback ──
  const ags      = _getMockAgendamentos();
  const clientes = _getMockClientes();
  return ags
    .filter(a => a.data === data)
    .map(a => ({
      ...a,
      clientes: clientes.find(c => c.id === a.cliente_id) || null
    }))
    .sort((a, b) => a.hora.localeCompare(b.hora));

  // ── Supabase ──
  // const { data: rows, error } = await supabase
  //   .from('agendamentos')
  //   .select('*, clientes(id, nome, telefone)')
  //   .eq('data', data)
  //   .order('hora');
  // if (error) throw error;
  // return rows;
}

/**
 * Busca agendamentos por período.
 * @param {string} de  — 'YYYY-MM-DD'
 * @param {string} ate — 'YYYY-MM-DD'
 */
async function getAgendamentosPorPeriodo(de, ate) {
  // ── Fallback ──
  const ags      = _getMockAgendamentos();
  const clientes = _getMockClientes();
  return ags
    .filter(a => a.data >= de && a.data <= ate)
    .map(a => ({ ...a, clientes: clientes.find(c => c.id === a.cliente_id) || null }))
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  // ── Supabase ──
  // const { data, error } = await supabase
  //   .from('agendamentos')
  //   .select('*, clientes(id, nome, telefone)')
  //   .gte('data', de).lte('data', ate)
  //   .order('data').order('hora');
  // if (error) throw error;
  // return data;
}

/**
 * Cria um agendamento.
 * @param {Object} ag — { cliente_id, data, hora, tipo, status, observacoes }
 */
async function createAgendamento(ag) {
  // ── Fallback ──
  const lista = _getMockAgendamentos();
  const novo = {
    id: gerarId(),
    cliente_id:  ag.cliente_id,
    data:        ag.data,
    hora:        ag.hora,
    tipo:        ag.tipo        || 'Consulta',
    status:      ag.status      || 'Aguardando',
    observacoes: ag.observacoes || '',
    created_at: new Date().toISOString(),
  };
  lista.push(novo);
  _setMockAgendamentos(lista);
  return novo;

  // ── Supabase ──
  // const { data, error } = await supabase.from('agendamentos').insert([ag]).select().single();
  // if (error) throw error;
  // return data;
}

/**
 * Atualiza status de agendamento.
 * @param {string} id
 * @param {string} status
 */
async function updateStatusAgendamento(id, status) {
  // ── Fallback ──
  const lista = _getMockAgendamentos();
  const idx = lista.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Agendamento não encontrado.');
  lista[idx].status = status;
  _setMockAgendamentos(lista);
  return lista[idx];

  // ── Supabase ──
  // const { data, error } = await supabase.from('agendamentos').update({ status }).eq('id', id).select().single();
  // if (error) throw error;
  // return data;
}

/**
 * Remove agendamento.
 * @param {string} id
 */
async function deleteAgendamento(id) {
  // ── Fallback ──
  const lista = _getMockAgendamentos().filter(a => a.id !== id);
  _setMockAgendamentos(lista);
  return true;

  // ── Supabase ──
  // const { error } = await supabase.from('agendamentos').delete().eq('id', id);
  // if (error) throw error;
  // return true;
}

// ════════════════════════
//  DASHBOARD — KPIs
// ════════════════════════

/**
 * Retorna os KPIs principais.
 * @returns {Promise<Object>} { totalClientes, consultasHoje, faltasHoje, proximaConsulta }
 */
async function getKPIs() {
  const hoje = dataHoje();
  const [clientes, agendamentosHoje] = await Promise.all([
    getClientes(),
    getAgendamentos(hoje),
  ]);

  const agora    = new Date().toTimeString().slice(0, 5);
  const proxima  = agendamentosHoje.find(
    a => a.hora > agora && ['Confirmado','Aguardando'].includes(a.status)
  );

  return {
    totalClientes:   clientes.length,
    consultasHoje:   agendamentosHoje.length,
    faltasHoje:      agendamentosHoje.filter(a => a.status === 'Faltou').length,
    proximaConsulta: proxima || null,
  };
}

// ════════════════════════
//  WHATSAPP
// ════════════════════════

/**
 * Envia mensagem via WhatsApp.
 * Pronto para integrar com Z-API, Twilio ou WhatsApp Business API.
 *
 * @param {string} numero   — ex: '5511999999999'
 * @param {string} mensagem — texto da mensagem
 * @param {string} clienteId
 * @returns {Promise<Object>} { sucesso, mensagemId }
 */
async function sendWhatsAppMessage(numero, mensagem, clienteId = null) {
  // ── Mock: salva no histórico local ──
  if (clienteId) {
    const historico = _getMockMensagens();
    if (!historico[clienteId]) historico[clienteId] = [];
    historico[clienteId].unshift({
      id: gerarId(),
      direcao: 'saida',
      texto: mensagem,
      numero,
      timestamp: new Date().toISOString(),
    });
    _setMockMensagens(historico);
  }

  console.log('[WhatsApp Mock] Enviando para:', numero, '→', mensagem);
  // Simula latência de API
  await new Promise(r => setTimeout(r, 600));
  return { sucesso: true, mensagemId: gerarId() };

  // ── Z-API (descomente e configure) ──
  // const response = await fetch('https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ phone: numero, message: mensagem }),
  // });
  // if (!response.ok) throw new Error('Falha ao enviar mensagem.');
  // return await response.json();

  // ── Twilio (descomente e configure) ──
  // const response = await fetch('/api/whatsapp/send', { // sua rota backend
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ to: numero, body: mensagem }),
  // });
  // if (!response.ok) throw new Error('Falha ao enviar.');
  // return await response.json();
}

/**
 * Retorna o histórico de mensagens de um cliente.
 * @param {string} clienteId
 * @returns {Promise<Array>}
 */
async function getHistoricoMensagens(clienteId) {
  // ── Mock ──
  const historico = _getMockMensagens();
  return historico[clienteId] || [];

  // ── Supabase (descomente) ──
  // const { data, error } = await supabase
  //   .from('mensagens_whatsapp')
  //   .select('*')
  //   .eq('cliente_id', clienteId)
  //   .order('created_at', { ascending: false });
  // if (error) throw error;
  // return data;
}

// ════════════════════════
//  EXPORTA (módulo ES)
// ════════════════════════
// Se usar <script type="module">, importe assim:
// import { getClientes, createAgendamento, ... } from './api.js'

// Como este arquivo é carregado antes do script.js com type=module,
// as funções ficam disponíveis globalmente quando não há módulos.
// Se precisar, adicione: window.API = { getClientes, ... }