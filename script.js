// ════════════════════════════════════════════════════════════
//  script.js — Clínica WG × Supabase
//  Substitua SUPABASE_URL e SUPABASE_KEY pelos seus valores:
//  Supabase → Settings → API → Project URL e anon public key
// ════════════════════════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://uiymqxqxtqfnmxrkmxpe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AWtSaoqQLAHi50SpWTFrNw_sd3ujEQV';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// ════════════════════════════════════════════════════════════
//  ESTRUTURA ESPERADA NO SUPABASE
//
//  Tabela: clientes
//  ┌─────────────────┬──────────────────────────────────────┐
//  │ id              │ uuid (PK, default: gen_random_uuid()) │
//  │ nome            │ text NOT NULL                         │
//  │ telefone        │ text                                  │
//  │ email           │ text                                  │
//  │ data_nascimento │ date                                  │
//  │ status          │ text ('Ativo' ou 'Inativo')           │
//  │ created_at      │ timestamptz (default: now())          │
//  └─────────────────┴──────────────────────────────────────┘
//
//  Tabela: agendamentos
//  ┌─────────────────┬──────────────────────────────────────┐
//  │ id              │ uuid (PK, default: gen_random_uuid()) │
//  │ cliente_id      │ uuid (FK → clientes.id)              │
//  │ data            │ date NOT NULL                         │
//  │ hora            │ time NOT NULL                         │
//  │ tipo            │ text (ex: 'Retorno', 'Primeira...')  │
//  │ status          │ text ('Confirmado','Aguardando',      │
//  │                 │       'Realizado','Faltou')           │
//  │ observacoes     │ text                                  │
//  │ created_at      │ timestamptz (default: now())          │
//  └─────────────────┴──────────────────────────────────────┘
// ════════════════════════════════════════════════════════════


// ────────────────────────────────────────────────────────────
//  UTILITÁRIOS
// ────────────────────────────────────────────────────────────

function dataHoje() {
  return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function formatarData(dataISO) {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

function iniciaisDe(nome) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
}

function mostrarErro(msg) {
  console.error('[WG]', msg);
  // Troque por um toast/modal se quiser feedback visual
}


// ════════════════════════════════════════════════════════════
//  CLIENTES
// ════════════════════════════════════════════════════════════

/**
 * Busca todos os clientes (ou filtra pelo nome).
 * @param {string} busca — texto livre para filtrar (opcional)
 * @returns {Array} lista de clientes
 */
async function buscarClientes(busca = '') {
  let query = supabase
    .from('clientes')
    .select('*')
    .order('nome', { ascending: true });

  if (busca.trim()) {
    query = query.ilike('nome', `%${busca}%`);
  }

  const { data, error } = await query;

  if (error) { mostrarErro(error.message); return []; }
  return data;
}

/**
 * Busca um único cliente pelo ID.
 * @param {string} id — UUID do cliente
 */
async function buscarClientePorId(id) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) { mostrarErro(error.message); return null; }
  return data;
}

/**
 * Cria um novo cliente.
 * @param {Object} cliente — { nome, telefone, email, data_nascimento, status }
 * @returns {Object|null} cliente criado
 */
async function criarCliente(cliente) {
  const payload = {
    nome:            cliente.nome,
    telefone:        cliente.telefone        || null,
    email:           cliente.email           || null,
    data_nascimento: cliente.data_nascimento || null,
    status:          cliente.status          || 'Ativo',
  };

  const { data, error } = await supabase
    .from('clientes')
    .insert([payload])
    .select()
    .single();

  if (error) { mostrarErro(error.message); return null; }
  return data;
}

/**
 * Atualiza um cliente existente.
 * @param {string} id     — UUID do cliente
 * @param {Object} campos — campos a atualizar
 * @returns {Object|null} cliente atualizado
 */
async function atualizarCliente(id, campos) {
  const { data, error } = await supabase
    .from('clientes')
    .update(campos)
    .eq('id', id)
    .select()
    .single();

  if (error) { mostrarErro(error.message); return null; }
  return data;
}

/**
 * Remove um cliente pelo ID.
 * @param {string} id — UUID do cliente
 * @returns {boolean} true se removido com sucesso
 */
async function removerCliente(id) {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) { mostrarErro(error.message); return false; }
  return true;
}


// ════════════════════════════════════════════════════════════
//  AGENDAMENTOS
// ════════════════════════════════════════════════════════════

/**
 * Busca todos os agendamentos de uma data específica,
 * trazendo junto os dados do cliente (join).
 * @param {string} data — 'YYYY-MM-DD' (padrão: hoje)
 * @returns {Array} lista de agendamentos com dados do cliente
 */
async function buscarAgendamentosDodia(data = dataHoje()) {
  const { data: rows, error } = await supabase
    .from('agendamentos')
    .select(`
      *,
      clientes ( id, nome, telefone )
    `)
    .eq('data', data)
    .order('hora', { ascending: true });

  if (error) { mostrarErro(error.message); return []; }
  return rows;
}

/**
 * Busca agendamentos dentro de um intervalo de datas.
 * @param {string} de  — 'YYYY-MM-DD'
 * @param {string} ate — 'YYYY-MM-DD'
 */
async function buscarAgendamentosPorPeriodo(de, ate) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select(`
      *,
      clientes ( id, nome, telefone )
    `)
    .gte('data', de)
    .lte('data', ate)
    .order('data', { ascending: true })
    .order('hora', { ascending: true });

  if (error) { mostrarErro(error.message); return []; }
  return data;
}

/**
 * Cria um novo agendamento.
 * @param {Object} ag — { cliente_id, data, hora, tipo, status, observacoes }
 * @returns {Object|null} agendamento criado
 */
async function criarAgendamento(ag) {
  const payload = {
    cliente_id:  ag.cliente_id,
    data:        ag.data,
    hora:        ag.hora,
    tipo:        ag.tipo        || 'Consulta',
    status:      ag.status      || 'Aguardando',
    observacoes: ag.observacoes || null,
  };

  const { data, error } = await supabase
    .from('agendamentos')
    .insert([payload])
    .select()
    .single();

  if (error) { mostrarErro(error.message); return null; }
  return data;
}

/**
 * Atualiza o status de um agendamento.
 * @param {string} id     — UUID do agendamento
 * @param {string} status — 'Confirmado' | 'Aguardando' | 'Realizado' | 'Faltou'
 */
async function atualizarStatusAgendamento(id, status) {
  const { data, error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) { mostrarErro(error.message); return null; }
  return data;
}

/**
 * Atualiza qualquer campo de um agendamento.
 * @param {string} id     — UUID
 * @param {Object} campos — campos a atualizar
 */
async function atualizarAgendamento(id, campos) {
  const { data, error } = await supabase
    .from('agendamentos')
    .update(campos)
    .eq('id', id)
    .select()
    .single();

  if (error) { mostrarErro(error.message); return null; }
  return data;
}

/**
 * Remove um agendamento pelo ID.
 * @param {string} id — UUID
 * @returns {boolean}
 */
async function removerAgendamento(id) {
  const { error } = await supabase
    .from('agendamentos')
    .delete()
    .eq('id', id);

  if (error) { mostrarErro(error.message); return false; }
  return true;
}


// ════════════════════════════════════════════════════════════
//  DASHBOARD — métricas calculadas
// ════════════════════════════════════════════════════════════

/**
 * Retorna os KPIs principais para o Dashboard.
 * @returns {Object} { totalClientes, consultasHoje, faltasHoje, proximaConsulta }
 */
async function buscarKPIs() {
  const hoje = dataHoje();

  const [
    { count: totalClientes },
    agendamentosHoje,
  ] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }),
    buscarAgendamentosDodia(hoje),
  ]);

  const consultasHoje = agendamentosHoje.length;
  const faltasHoje    = agendamentosHoje.filter(a => a.status === 'Faltou').length;

  const agora = new Date().toTimeString().slice(0, 5); // 'HH:MM'
  const proxima = agendamentosHoje.find(a =>
    a.hora > agora && ['Confirmado', 'Aguardando'].includes(a.status)
  );

  return {
    totalClientes:   totalClientes ?? 0,
    consultasHoje,
    faltasHoje,
    proximaConsulta: proxima ?? null,
  };
}

/**
 * Retorna dias do mês/ano que têm pelo menos 1 agendamento.
 * Útil para pintar o calendário.
 * @param {number} ano
 * @param {number} mes — 0-indexado (igual ao JS Date)
 * @returns {Array<number>} lista de dias (ex: [3, 7, 14, 22])
 */
async function buscarDiasComAgendamento(ano, mes) {
  const de  = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
  const ate = `${ano}-${String(mes + 1).padStart(2, '0')}-${new Date(ano, mes + 1, 0).getDate()}`;

  const { data, error } = await supabase
    .from('agendamentos')
    .select('data')
    .gte('data', de)
    .lte('data', ate);

  if (error) { mostrarErro(error.message); return []; }

  const dias = [...new Set(data.map(a => parseInt(a.data.split('-')[2])))];
  return dias;
}


// ════════════════════════════════════════════════════════════
//  TEMPO REAL (Realtime)
//  Descomente o bloco abaixo se quiser atualização automática
//  na tela quando outro usuário fizer uma alteração.
// ════════════════════════════════════════════════════════════

/*
supabase
  .channel('agendamentos-realtime')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'agendamentos' },
    (payload) => {
      console.log('[Realtime] agendamentos:', payload);
      // Chame aqui a função que re-renderiza a tela, ex:
      // carregarAgenda();
    }
  )
  .subscribe();

supabase
  .channel('clientes-realtime')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'clientes' },
    (payload) => {
      console.log('[Realtime] clientes:', payload);
      // carregarClientes();
    }
  )
  .subscribe();
*/


// ════════════════════════════════════════════════════════════
//  EXEMPLOS DE USO (como chamar as funções no seu HTML)
// ════════════════════════════════════════════════════════════

/*

// ── Carregar agenda do dia no Dashboard ──
const agenda = await buscarAgendamentosDodia();
agenda.forEach(a => {
  console.log(a.hora, a.clientes.nome, a.status);
});

// ── KPIs do Dashboard ──
const kpis = await buscarKPIs();
document.getElementById('total-clientes').textContent  = kpis.totalClientes;
document.getElementById('consultas-hoje').textContent  = kpis.consultasHoje;
document.getElementById('faltas').textContent          = kpis.faltasHoje;
document.getElementById('proxima-hora').textContent    = kpis.proximaConsulta?.hora ?? '—';
document.getElementById('proxima-nome').textContent    = kpis.proximaConsulta?.clientes?.nome ?? '—';

// ── Buscar clientes (com filtro de busca) ──
const clientes = await buscarClientes('Ana');
renderClientes(clientes);   // sua função de renderização

// ── Criar novo cliente ──
const novo = await criarCliente({
  nome: 'Maria Silva',
  telefone: '(99) 99999-9999',
  email: 'maria@email.com',
  status: 'Ativo',
});

// ── Criar agendamento ──
const ag = await criarAgendamento({
  cliente_id: novo.id,
  data: '2026-05-10',
  hora: '14:30',
  tipo: 'Primeira consulta',
  status: 'Aguardando',
});

// ── Confirmar agendamento ──
await atualizarStatusAgendamento(ag.id, 'Confirmado');

// ── Remover cliente ──
await removerCliente(novo.id);

// ── Dias com consulta para o calendário ──
const dias = await buscarDiasComAgendamento(2026, 4); // maio de 2026
console.log('Dias com consulta:', dias); // [3, 7, 14, ...]

*/


// ════════════════════════════════════════════════════════════
//  EXPORTAÇÕES
//  Se estiver usando <script type="module"> no seu HTML,
//  importe assim:
//    import { buscarClientes, criarAgendamento, ... } from './script.js'
// ════════════════════════════════════════════════════════════

export {
  supabase,
  // Utilitários
  dataHoje,
  formatarData,
  iniciaisDe,
  // Clientes
  buscarClientes,
  buscarClientePorId,
  criarCliente,
  atualizarCliente,
  removerCliente,
  // Agendamentos
  buscarAgendamentosDodia,
  buscarAgendamentosPorPeriodo,
  criarAgendamento,
  atualizarStatusAgendamento,
  atualizarAgendamento,
  removerAgendamento,
  // Dashboard
  buscarKPIs,
  buscarDiasComAgendamento,
};

