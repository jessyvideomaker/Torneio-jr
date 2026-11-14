
import { supabase } from './supabase.js';

let usuarioAtual = null;

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

  usuarioAtual = user;
  abrirPainelDirigente(user, perfil);
}

async function abrirPainelDirigente(user, perfil) {
  const painel = document.getElementById('login-box');
  if (!painel) return;

  painel.innerHTML = `
    <div style="background:#080b09;color:white;padding:22px;border:1px solid #b5ff38;border-radius:14px;font-family:Arial,sans-serif">

      <h2 style="color:#b5ff38">ÁREA DO DIRIGENTE</h2>
      <p>Olá, ${escapar(perfil.full_name || 'Dirigente')}!</p>

      <h3 style="color:#b5ff38">Cadastrar minha equipe</h3>

      <form id="form-equipe">
        <label>Campeonato</label>
        <select id="competicao-escolhida" required style="${estiloCampo()}">
          <option value="">Carregando...</option>
        </select>

        <label>Nome da equipe</label>
        <input id="nome-equipe" required maxlength="100"
          placeholder="Nome da equipe" style="${estiloCampo()}">

        <button type="submit" style="${estiloBotao()}">
          ENVIAR INSCRIÇÃO
        </button>
      </form>

      <p id="mensagem-equipe"></p>

      <hr style="border-color:#333;margin:25px 0">

      <h3 style="color:#b5ff38">Minhas equipes</h3>

      <div id="minhas-equipes">Carregando...</div>

      <hr style="border-color:#333;margin:25px 0">

      <h3 style="color:#b5ff38">Cadastrar atletas</h3>

      <form id="form-atleta">
        <label>Escolha a equipe</label>
        <select id="equipe-atleta" required style="${estiloCampo()}">
          <option value="">Carregando equipes...</option>
        </select>

        <label>Nome completo do atleta</label>
        <input id="nome-atleta" required maxlength="120"
          placeholder="Nome do atleta" style="${estiloCampo()}">

        <label>Número da camisa</label>
        <input id="numero-atleta" type="number" min="0" max="99"
          required placeholder="Ex.: 10" style="${estiloCampo()}">

        <label>Posição em campo</label>
        <select id="posicao-atleta" required style="${estiloCampo()}">
          <option value="">Selecione</option>
          <option value="Goleiro">Goleiro</option>
          <option value="Fixo">Fixo</option>
          <option value="Ala">Ala</option>
          <option value="Pivô">Pivô</option>
          <option value="Outro">Outro</option>
        </select>

        <button type="submit" style="${estiloBotao()}">
          CADASTRAR ATLETA
        </button>
      </form>

      <p id="mensagem-atleta"></p>

      <h3 style="color:#b5ff38">Elenco da equipe</h3>
      <div id="lista-atletas">Selecione uma equipe.</div>

      <button id="sair-dirigente" style="
        margin-top:25px;padding:12px;width:100%;
        background:transparent;border:1px solid #777;
        color:white;border-radius:8px">
        SAIR DA CONTA
      </button>
    </div>
  `;

  document.getElementById('sair-dirigente').onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  await carregarCompeticoes();
  await carregarMinhasEquipes(user.id);

  document.getElementById('form-equipe').onsubmit = cadastrarEquipe;
  document.getElementById('form-atleta').onsubmit = cadastrarAtleta;

  document.getElementById('equipe-atleta').onchange = (event) => {
    carregarAtletas(event.target.value);
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

  select.innerHTML = '<option value="">Selecione um campeonato</option>';

  (data || []).forEach(campeonato => {
    const option = document.createElement('option');
    option.value = campeonato.id;
    option.textContent = campeonato.name +
      (campeonato.season ? ' - ' + campeonato.season : '');
    select.appendChild(option);
  });
}

async function cadastrarEquipe(event) {
  event.preventDefault();

  const mensagem = document.getElementById('mensagem-equipe');
  const nome = document.getElementById('nome-equipe').value.trim();
  const competicao = document.getElementById('competicao-escolhida').value;

  mensagem.textContent = 'Enviando inscrição...';

  const { error } = await supabase.rpc('register_team', {
    p_name: nome,
    p_competition_id: competicao
  });

  if (error) {
    mensagem.textContent = 'Erro: ' + error.message;
    return;
  }

  mensagem.textContent = 'Equipe cadastrada! Aguardando aprovação.';
  document.getElementById('form-equipe').reset();

  await carregarMinhasEquipes(usuarioAtual.id);
}

async function carregarMinhasEquipes(userId) {
  const area = document.getElementById('minhas-equipes');
  const select = document.getElementById('equipe-atleta');

  const { data, error } = await supabase
    .from('teams')
    .select('id, name, status')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    area.textContent = 'Não foi possível carregar as equipes: ' + error.message;
    select.innerHTML = '<option value="">Erro ao carregar</option>';
    return;
  }

  area.innerHTML = '';
  select.innerHTML = '<option value="">Selecione sua equipe</option>';

  if (!data || data.length === 0) {
    area.textContent = 'Você ainda não cadastrou uma equipe.';
    return;
  }

  data.forEach(equipe => {
    const item = document.createElement('div');
    item.style.cssText = 'background:#151b15;padding:13px;margin-bottom:9px;border-radius:8px';

    const nome = document.createElement('strong');
    nome.textContent = equipe.name;

    const status = document.createElement('p');
    status.textContent = 'Inscrição: ' + equipe.status;

    item.append(nome, status);
    area.appendChild(item);

    const option = document.createElement('option');
    option.value = equipe.id;
    option.textContent = equipe.name;
    select.appendChild(option);
  });
}

async function cadastrarAtleta(event) {
  event.preventDefault();

  const mensagem = document.getElementById('mensagem-atleta');
  const equipe = document.getElementById('equipe-atleta').value;
  const nome = document.getElementById('nome-atleta').value.trim();
  const numero = Number(document.getElementById('numero-atleta').value);
  const posicao = document.getElementById('posicao-atleta').value;

  if (!equipe) {
    mensagem.textContent = 'Selecione uma equipe.';
    return;
  }

  mensagem.textContent = 'Cadastrando atleta...';

  const { error } = await supabase.rpc('register_player', {
    p_team_id: equipe,
    p_full_name: nome,
    p_shirt_number: numero,
    p_position: posicao
  });

  if (error) {
    mensagem.textContent = 'Erro: ' + error.message;
    return;
  }

  mensagem.textContent = 'Atleta cadastrado com sucesso!';

  document.getElementById('nome-atleta').value = '';
  document.getElementById('numero-atleta').value = '';
  document.getElementById('posicao-atleta').value = '';

  await carregarAtletas(equipe);
}

async function carregarAtletas(teamId) {
  const area = document.getElementById('lista-atletas');

  if (!teamId) {
    area.textContent = 'Selecione uma equipe.';
    return;
  }

  area.textContent = 'Carregando atletas...';

  const { data, error } = await supabase
    .from('players')
    .select('id, full_name, shirt_number, position, status')
    .eq('team_id', teamId)
    .order('shirt_number', { ascending: true });

  if (error) {
    area.textContent = 'Não foi possível carregar os atletas: ' + error.message;
    return;
  }

  area.innerHTML = '';

  if (!data || data.length === 0) {
    area.textContent = 'Nenhum atleta cadastrado nesta equipe.';
    return;
  }

  data.forEach(atleta => {
    const item = document.createElement('div');
    item.style.cssText = 'background:#151b15;padding:13px;margin-bottom:8px;border-radius:8px';

    const nome = document.createElement('strong');
    nome.textContent = '#' + atleta.shirt_number + ' ' + atleta.full_name;

    const detalhe = document.createElement('p');
    detalhe.style.marginBottom = '0';
    detalhe.textContent = (atleta.position || 'Sem posição') +
      ' | Status: ' + atleta.status;

    item.append(nome, detalhe);
    area.appendChild(item);
  });
}

function estiloCampo() {
  return `
    display:block;width:100%;box-sizing:border-box;
    padding:13px;margin:8px 0 16px;
    background:#151b15;color:white;
    border:1px solid #444;border-radius:7px;
  `;
}

function estiloBotao() {
  return `
    width:100%;padding:15px;background:#b5ff38;
    color:#080b09;border:0;border-radius:8px;
    font-weight:900;cursor:pointer;margin-top:10px;
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
