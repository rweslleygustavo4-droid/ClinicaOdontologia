/* ═══════════════════════════════════════════
   SCRIPT.JS — Lógica do Sistema Principal
   Clínica WG
   
   Usa <script type="module">, então as funções
   do api.js precisam estar disponíveis.
   Como api.js é carregado antes sem módulo,
   suas funções são globais.
═══════════════════════════════════════════ */

// ════════════════════════
//  INIT (chamado pelo auth.js após login)
// ════════════════════════

window.iniciarSistema = async function(usuario) {
  _usuarioAtual = usuario;
  await carregarDashboard();
};

let _usuarioAtual = null;

// ════════════════════════
//  NAVEGAÇÃO
// ════════════════════════

function navegar(id, botao) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('ativo'));

  const tela = document.getElementById('tela-' + id);
  if (tela) tela.classList.add('ativa');
  if (botao) botao.classList.add('ativo');

  // Carrega dados da tela ao navegar
  const loaders = {
    dashboard:    carregarDashboard,
    agendamentos: carregarAgendamentos,
    clientes:     carregarClientes,
    whatsapp:     carregarWhatsapp,
    configuracoes: carregarConfiguracoes,
  };
  if (loaders[id]) loaders[id]();
}

// ════════════════════════
//  DASHBOARD
// ════════════════════════

async function carregarDashboard() {
  // Data no header
  const dateEl = document.getElementById('dash-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('pt-br', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  try {
    const kpis = await getKPIs();

    _setText('kpi-total-clientes', kpis.totalClientes);
    _setText('kpi-consultas-hoje', kpis.consultasHoje);
    _setText('kpi-faltas',         kpis.faltasHoje);

    if (kpis.proximaConsulta) {
      _setText('kpi-proxima', kpis.proximaConsulta.hora);
      _setText('kpi-proxima-nome', kpis.proximaConsulta.clientes?.nome || 'Próxima consulta');
    } else {
      _setText('kpi-proxima', '—');
      _setText('kpi-proxima-nome', 'Sem consultas pendentes');
    }

    // Agenda do dia
    const agendamentos = await getAgendamentos();
    const listaEl = document.getElementById('dash-agenda-lista');
    if (listaEl) {
      listaEl.innerHTML = agendamentos.length
        ? agendamentos.map(a => _renderAgendaItem(a, false)).join('')
        : '<div class="empty-state">Nenhuma consulta hoje 🎉</div>';
    }
  } catch (err) {
    console.error('[Dashboard]', err);
    mostrarToast('Erro ao carregar dashboard', 'error');
  }
}

// ════════════════════════
//  AGENDAMENTOS
// ════════════════════════

async function carregarAgendamentos() {
  // Define data padrão = hoje
  const filtroData = document.getElementById('filtro-data');
  if (filtroData && !filtroData.value) {
    filtroData.value = dataHoje();
  }

  const data   = filtroData?.value || dataHoje();
  const status = document.getElementById('filtro-status')?.value || '';

  const listaEl = document.getElementById('agend-lista');
  if (!listaEl) return;
  listaEl.innerHTML = '<div class="empty-state">Carregando...</div>';

  try {
    let ags = await getAgendamentos(data);
    if (status) ags = ags.filter(a => a.status === status);

    listaEl.innerHTML = ags.length
      ? ags.map(a => _renderAgendaItem(a, true)).join('')
      : '<div class="empty-state">Nenhum agendamento encontrado</div>';
  } catch (err) {
    console.error('[Agendamentos]', err);
    listaEl.innerHTML = '<div class="empty-state">Erro ao carregar agendamentos</div>';
  }
}

function _renderAgendaItem(ag, comAcoes) {
  const cliente = ag.clientes;
  const nome    = cliente?.nome || 'Paciente não encontrado';
  const ini     = iniciaisDe(nome);
  const badgeCls = _statusBadgeCls(ag.status);

  const acoes = comAcoes ? `
    <div class="agenda-acoes">
      <select class="btn-tabela" style="min-width:130px" onchange="mudarStatusAgend('${ag.id}', this.value, this)">
        <option value="Aguardando"  ${ag.status==='Aguardando'  ? 'selected':''}>Aguardando</option>
        <option value="Confirmado"  ${ag.status==='Confirmado'  ? 'selected':''}>Confirmado</option>
        <option value="Realizado"   ${ag.status==='Realizado'   ? 'selected':''}>Realizado</option>
        <option value="Faltou"      ${ag.status==='Faltou'      ? 'selected':''}>Faltou</option>
      </select>
      <button class="btn-tabela btn-tabela--danger" onclick="excluirAgendamento('${ag.id}')">✕</button>
    </div>
  ` : `<span class="badge ${badgeCls}">${ag.status}</span>`;

  return `
    <div class="agenda-item" id="agend-${ag.id}">
      <span class="agenda-hora">${ag.hora}</span>
      <div class="agenda-avatar">${ini}</div>
      <div class="agenda-info">
        <div class="agenda-nome">${nome}</div>
        <div class="agenda-tipo">${ag.tipo || 'Consulta'}${ag.observacoes ? ' · ' + ag.observacoes : ''}</div>
      </div>
      ${acoes}
    </div>
  `;
}

async function mudarStatusAgend(id, status, select) {
  try {
    await updateStatusAgendamento(id, status);
    mostrarToast(`Status atualizado: ${status}`, 'success');
  } catch (err) {
    mostrarToast('Erro ao atualizar status', 'error');
    console.error(err);
    // Reverte o select visualmente na próxima renderização
    carregarAgendamentos();
  }
}

async function excluirAgendamento(id) {
  if (!confirm('Remover este agendamento?')) return;
  try {
    await deleteAgendamento(id);
    mostrarToast('Agendamento removido', 'success');
    carregarAgendamentos();
    carregarDashboard();
  } catch (err) {
    mostrarToast('Erro ao remover agendamento', 'error');
  }
}

// Modal agendamento
async function abrirModalAgendamento() {
  // Popula select de clientes
  const select = document.getElementById('ag-cliente');
  const clientes = await getClientes();
  select.innerHTML = '<option value="">— Selecione um paciente —</option>' +
    clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

  // Data padrão = hoje
  const dataInput = document.getElementById('ag-data');
  if (!dataInput.value) dataInput.value = dataHoje();

  document.getElementById('modal-agendamento').classList.remove('oculto');
}

function fecharModal(id) {
  document.getElementById(id).classList.add('oculto');
}

function fecharModalSeFora(event, id) {
  if (event.target === event.currentTarget) fecharModal(id);
}

async function salvarAgendamento() {
  const clienteId = document.getElementById('ag-cliente').value;
  const data      = document.getElementById('ag-data').value;
  const hora      = document.getElementById('ag-hora').value;
  const tipo      = document.getElementById('ag-tipo').value;
  const status    = document.getElementById('ag-status').value;
  const obs       = document.getElementById('ag-obs').value;

  if (!clienteId) { mostrarToast('Selecione um paciente', 'error'); return; }
  if (!data)      { mostrarToast('Informe a data', 'error'); return; }
  if (!hora)      { mostrarToast('Informe a hora', 'error'); return; }

  try {
    await createAgendamento({ cliente_id: clienteId, data, hora, tipo, status, observacoes: obs });
    fecharModal('modal-agendamento');
    mostrarToast('Agendamento criado!', 'success');
    // Limpa campos
    ['ag-cliente','ag-obs'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('ag-hora').value = '';
    carregarAgendamentos();
    carregarDashboard();
  } catch (err) {
    mostrarToast('Erro ao salvar agendamento', 'error');
    console.error(err);
  }
}

// ════════════════════════
//  CLIENTES
// ════════════════════════

async function carregarClientes() {
  const busca = document.getElementById('busca-cliente')?.value || '';
  const tbody = document.getElementById('clientes-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Carregando...</td></tr>';

  try {
    const clientes = await getClientes(busca);
    if (!clientes.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum cliente encontrado</td></tr>';
      return;
    }

    tbody.innerHTML = clientes.map(c => `
      <tr>
        <td>
          <div class="td-nome">
            <div class="td-avatar">${iniciaisDe(c.nome)}</div>
            <span class="td-nome-text">${c.nome}</span>
          </div>
        </td>
        <td>${c.telefone || '—'}</td>
        <td>${c.email || '—'}</td>
        <td><span class="badge ${c.status === 'Ativo' ? 'badge--ok' : 'badge--muted'}">${c.status || 'Ativo'}</span></td>
        <td>
          <div class="tabela-acoes">
            <button class="btn-tabela" onclick="abrirModalCliente('${c.id}')">Editar</button>
            <button class="btn-tabela btn-tabela--danger" onclick="excluirCliente('${c.id}')">Excluir</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Erro ao carregar clientes</td></tr>';
    console.error(err);
  }
}

let _clienteEditandoId = null;

async function abrirModalCliente(id = null) {
  _clienteEditandoId = id;

  // Limpa campos
  ['cli-nome','cli-tel','cli-email','cli-nasc'].forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = '';
  });
  document.getElementById('cli-status').value = 'Ativo';

  const titulo = document.querySelector('#modal-cliente .modal-header h3');

  if (id) {
    titulo.textContent = 'Editar cliente';
    try {
      const c = await getClienteById(id);
      if (c) {
        document.getElementById('cli-nome').value  = c.nome || '';
        document.getElementById('cli-tel').value   = c.telefone || '';
        document.getElementById('cli-email').value = c.email || '';
        document.getElementById('cli-nasc').value  = c.data_nascimento || '';
        document.getElementById('cli-status').value = c.status || 'Ativo';
      }
    } catch (err) { console.error(err); }
  } else {
    titulo.textContent = 'Novo cliente';
  }

  document.getElementById('modal-cliente').classList.remove('oculto');
}

async function salvarCliente() {
  const nome   = document.getElementById('cli-nome').value.trim();
  const tel    = document.getElementById('cli-tel').value.trim();
  const email  = document.getElementById('cli-email').value.trim();
  const nasc   = document.getElementById('cli-nasc').value;
  const status = document.getElementById('cli-status').value;

  if (!nome) { mostrarToast('Informe o nome do paciente', 'error'); return; }

  const dados = { nome, telefone: tel, email, data_nascimento: nasc, status };

  try {
    if (_clienteEditandoId) {
      await updateCliente(_clienteEditandoId, dados);
      mostrarToast('Cliente atualizado!', 'success');
    } else {
      await createCliente(dados);
      mostrarToast('Cliente cadastrado!', 'success');
    }
    fecharModal('modal-cliente');
    carregarClientes();
    // Atualiza select de WhatsApp também
    _preencherSelectClientes();
  } catch (err) {
    mostrarToast('Erro ao salvar cliente', 'error');
    console.error(err);
  }
}

async function excluirCliente(id) {
  if (!confirm('Excluir este cliente? Esta ação não pode ser desfeita.')) return;
  try {
    await deleteCliente(id);
    mostrarToast('Cliente excluído', 'success');
    carregarClientes();
  } catch (err) {
    mostrarToast('Erro ao excluir cliente', 'error');
  }
}

// ════════════════════════
//  WHATSAPP
// ════════════════════════

async function carregarWhatsapp() {
  await _preencherSelectClientes();
}

async function _preencherSelectClientes() {
  const select = document.getElementById('wp-cliente-select');
  if (!select) return;
  const clientes = await getClientes();
  select.innerHTML = '<option value="">— Escolha um paciente —</option>' +
    clientes.map(c => `<option value="${c.id}" data-tel="${c.telefone || ''}">${c.nome}</option>`).join('');
}

async function wpSelecionarCliente(select) {
  const option = select.options[select.selectedIndex];
  const tel    = option?.dataset?.tel || '';
  const id     = select.value;

  document.getElementById('wp-numero').value = tel;

  // Carrega histórico
  const historicoEl = document.getElementById('wp-historico-lista');
  if (!historicoEl) return;

  if (!id) {
    historicoEl.innerHTML = '<div class="empty-state">Selecione um paciente para ver o histórico</div>';
    return;
  }

  historicoEl.innerHTML = '<div class="empty-state">Carregando histórico...</div>';
  try {
    const msgs = await getHistoricoMensagens(id);
    if (!msgs.length) {
      historicoEl.innerHTML = '<div class="empty-state">Nenhuma mensagem enviada ainda</div>';
    } else {
      historicoEl.innerHTML = msgs.map(m => `
        <div>
          <div class="historico-msg historico-msg--saida">
            ${m.texto}
          </div>
          <div class="historico-msg-meta" style="text-align:right">
            ${new Date(m.timestamp).toLocaleString('pt-br', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    historicoEl.innerHTML = '<div class="empty-state">Erro ao carregar histórico</div>';
  }
}

const _mensagensRapidas = {
  confirmar: (nome) =>
    `Olá${nome ? ', ' + nome.split(' ')[0] : ''}! 👋\nPassando para confirmar sua consulta amanhã. Você poderá comparecer?\nPor favor, responda SIM para confirmar ou NÃO para cancelar.\n\nClínica WG`,
  lembrete: (nome) =>
    `Olá${nome ? ', ' + nome.split(' ')[0] : ''}! ⏰\nLembramos que você tem consulta agendada conosco. Não esqueça!\n\nQualquer dúvida, estamos à disposição.\nClínica WG`,
  reagendar: (nome) =>
    `Olá${nome ? ', ' + nome.split(' ')[0] : ''}! 📅\nGostaríamos de reagendar sua consulta. Qual dia e horário é melhor para você?\n\nAguardamos seu retorno.\nClínica WG`,
};

function wpMensagemRapida(tipo) {
  const select  = document.getElementById('wp-cliente-select');
  const nomeOpt = select?.options[select.selectedIndex]?.text || '';
  const nome    = nomeOpt === '— Escolha um paciente —' ? '' : nomeOpt;
  const fn      = _mensagensRapidas[tipo];
  if (fn) document.getElementById('wp-mensagem').value = fn(nome);
}

async function wpEnviar() {
  const select  = document.getElementById('wp-cliente-select');
  const numero  = document.getElementById('wp-numero').value.trim();
  const msg     = document.getElementById('wp-mensagem').value.trim();
  const clienteId = select?.value || null;

  if (!numero) { mostrarToast('Informe o número do WhatsApp', 'error'); return; }
  if (!msg)    { mostrarToast('Escreva uma mensagem', 'error'); return; }

  const btn = document.querySelector('#tela-whatsapp .btn-full');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    const numLimpo = numero.replace(/\D/g, '');
    const resultado = await sendWhatsAppMessage(numLimpo, msg, clienteId);

    if (resultado.sucesso) {
      mostrarToast('Mensagem enviada! ✓', 'success');
      document.getElementById('wp-mensagem').value = '';
      // Recarrega histórico
      if (clienteId) await wpSelecionarCliente(select);
    }
  } catch (err) {
    mostrarToast('Erro ao enviar mensagem', 'error');
    console.error(err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar mensagem`;
    }
  }
}

// ════════════════════════
//  CONFIGURAÇÕES
// ════════════════════════

async function carregarConfiguracoes() {
  // Dados do usuário
  const u = _usuarioAtual;
  const nome  = u?.nome  || u?.user_metadata?.nome || '—';
  const email = u?.email || '—';

  _setText('config-nome',   nome);
  _setText('config-email',  email);

  const avatarEl = document.getElementById('config-avatar');
  if (avatarEl) avatarEl.textContent = iniciaisDe(nome) || '—';

  // Stats
  try {
    const kpis = await getKPIs();
    _setText('config-total-clientes', kpis.totalClientes);
    _setText('config-total-agend',    kpis.consultasHoje);
  } catch (e) { /* silencioso */ }

  // Assinatura
  const statusEl = document.getElementById('assinatura-status');
  const descEl   = document.getElementById('assinatura-desc');
  const ativo    = await verificarAssinatura(u);

  if (statusEl) statusEl.textContent = ativo ? '✓ Plano ativo' : '✕ Sem assinatura';
  if (statusEl) statusEl.style.color = ativo ? 'var(--success)' : 'var(--danger)';
  if (descEl)   descEl.textContent   = ativo
    ? 'Você tem acesso completo ao sistema.'
    : 'Assine um plano para continuar usando o sistema.';
}

// ════════════════════════
//  HELPERS
// ════════════════════════

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}

function _statusBadgeCls(status) {
  const map = {
    'Confirmado': 'badge--ok',
    'Realizado':  'badge--blue',
    'Aguardando': 'badge--pending',
    'Faltou':     'badge--danger',
  };
  return map[status] || 'badge--muted';
}

// ════════════════════════
//  EXPÕE GLOBAIS
//  (necessário pois o módulo isola o escopo)
// ════════════════════════

window.navegar               = navegar;
window.mostrarToast          = mostrarToast;
window.carregarAgendamentos  = carregarAgendamentos;
window.carregarClientes      = carregarClientes;
window.carregarWhatsapp      = carregarWhatsapp;
window.carregarConfiguracoes = carregarConfiguracoes;
window.carregarDashboard     = carregarDashboard;

window.abrirModalAgendamento = abrirModalAgendamento;
window.fecharModal           = fecharModal;
window.fecharModalSeFora     = fecharModalSeFora;
window.salvarAgendamento     = salvarAgendamento;
window.mudarStatusAgend      = mudarStatusAgend;
window.excluirAgendamento    = excluirAgendamento;

window.abrirModalCliente     = abrirModalCliente;
window.salvarCliente         = salvarCliente;
window.excluirCliente        = excluirCliente;

window.wpSelecionarCliente   = wpSelecionarCliente;
window.wpMensagemRapida      = wpMensagemRapida;
window.wpEnviar              = wpEnviar;

window.redirecionarParaPagamento = redirecionarParaPagamento;