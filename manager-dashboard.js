import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', iniciarPainelDirigente);

async function iniciarPainelDirigente() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    await verificarDirigente(session.user);
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      setTimeout(() => verificarDirigente(session.user), 300);
    }
  });
}

async function verificarDirigente(user) {
  const { data: perfil, error } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (error || perfil?.role !== 'manager') return;

  abrirPainelDirigente(user, perfil);
}

async function abrirPainelDirigente(user, perfil) {
  const painel = document.getElementById('login-box');
  if (!painel) return;

  painel.innerHTML = `
    <div style="
      background:#080b09;
      color:white;
      padding:24px;
      border:1px solid #b5ff38;
      border-radius:14px;
      font-family:Arial,sans-serif;
    ">
      <h2 style="color:#b5ff38;margin-top:0">
        ÁREA DO DIRIGENTE
      </h2>

      <p>Olá, ${escapar(perfil.full_name || 'Dirigente')}!</p>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin:22px 0;
      ">
        <div style="background:#151b15;padding:16px;border-radius:9px">
          <strong style="color:#b5ff38">01</strong>
          <p>Minha equipe</p>
        </div>

        <div style="background:#151b15;padding:16px;border-radius:9px">
          <strong style="color:#b5ff38">02</strong>
          <p>Meus atletas</p>
        </div>

        <div style="background:#151b15;padding:16px;border-radius:9px">
          <strong style="color:#b5ff38">03</strong>
          <p>Comissão técnica</p>
        </div>

        <div style="background:#151b15;padding:16px;border-radius:9px">
          <strong style="color:#b5ff38">04</strong>
          <p>Inscrição</p>
        </div>
      </div>

      <h3 style="color:#b5ff38">Cadastrar minha equipe</h3>

      <form id="form-equipe">
        <label>Escolha o campeonato</label>
        <select id="competicao-escolhida" required style="${estiloCampo()}">
          <option value="">Carregando campeonatos...</option>
        </select>

        <label>Nome da equipe</label>
        <input id="nome-equipe" required maxlength="100"
          placeholder="Digite o nome da equipe"
          style="${estiloCampo()}">

        <button type="submit" style="${estiloBotao()}">
          ENVIAR INSCRIÇÃO
        </button>
      </form>

      <p id="mensagem-equipe" style="margin-top:15px"></p>

      <hr style="border-color:#333;margin:25px 0">

      <h3 style="color:#b5ff38">Minhas equipes</h3>
      <div id="minhas-equipes">Carregando...</div>

      <button id="sair-dirigente" style="
        margin-top:25px;
        padding:12px;
        width:100%;
        background:transparent;
        border:1px solid #777;
        color:white;
        border-radius:8px;
      ">SAIR DA CONTA</button>
    </div>
  `;

  document.getElementById('sair-dirigente').onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  await carregarCompeticoes();
  await carregarMinhasEquipes(user.id);

  document.getElementById('form-equipe').onsubmit = async (event) => {
    event.preventDefault();

    const mensagem = document.getElementById('mensagem-equipe');
    const nome = document.getElementById('nome-equipe').value.trim();
    const competicao = document.getElementById('competicao-escolhida').value;

    if (!nome || !competicao) {
      mensagem.textContent = 'Preencha todos os campos.';
      return;
    }

    mensagem.textContent = 'Enviando inscrição...';

    const { error } = await supabase
      .from('teams')
      .insert({
        name: nome,
        short_name: nome,
        owner_id: user.id,
        competition_id: competicao,
        status: 'Pending'
      });

    if (error) {
      mensagem.textContent = 'Não foi possível cadastrar: ' + error.message;
      return;
    }

    mensagem.textContent = 'Equipe cadastrada! Aguardando aprovação da organização.';
    document.getElementById('form-equipe').reset();

    await carregarMinhasEquipes(user.id);
  };
}

async function carregarCompeticoes() {
  const select = document.getElementById('competicao-escolhida');

  const { data, error } = await supabase
    .from('competitions')
    .select('id, name, season, status')
    .in('status', ['Inscrições abertas', 'Open'])
    .order('created_at', { ascending: false });

  if (error) {
    select.innerHTML = '<option value="">Erro ao carregar campeonatos</option>';
    return;
  }

  if (!data || data.length === 0) {
    select.innerHTML = '<option value="">Nenhum campeonato com inscrições abertas</option>';
    return;
  }

  select.innerHTML = '<option value="">Selecione um campeonato</option>';

  data.forEach(campeonato => {
    const option = document.createElement('option');
    option.value = campeonato.id;
    option.textContent = campeonato.name + (campeonato.season ? ' - ' + campeonato.season : '');
    select.appendChild(option);
  });
}

async function carregarMinhasEquipes(userId) {
  const area = document.getElementById('minhas-equipes');

  const { data, error } = await supabase
    .from('teams')
    .select('id, name, status, competition_id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    area.textContent = 'Não foi possível carregar suas equipes.';
    return;
  }

  if (!data || data.length === 0) {
    area.innerHTML = '<p>Você ainda não cadastrou uma equipe.</p>';
    return;
  }

  area.innerHTML = '';

  data.forEach(equipe => {
    const item = document.createElement('div');
    item.style.cssText = `
      background:#151b15;
      padding:15px;
      margin-bottom:10px;
      border-radius:8px;
      border-left:3px solid #b5ff38;
    `;

    const nome = document.createElement('strong');
    nome.textContent = equipe.name;

    const status = document.createElement('p');
    status.style.marginBottom = '0';
    status.textContent = 'Status: ' + equipe.status;

    item.append(nome, status);
    area.appendChild(item);
  });
}

function estiloCampo() {
  return `
    display:block;
    width:100%;
    box-sizing:border-box;
    padding:13px;
    margin:8px 0 16px;
    background:#151b15;
    color:white;
    border:1px solid #444;
    border-radius:7px;
  `;
}

function estiloBotao() {
  return `
    width:100%;
    padding:15px;
    background:#b5ff38;
    color:#080b09;
    border:0;
    border-radius:8px;
    font-weight:900;
    cursor:pointer;
    margin-top:10px;
  `;
}

function escapar(valor) {
  return String(valor).replace(/[&<>"']/g, caractere => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  })[caractere]);
}
