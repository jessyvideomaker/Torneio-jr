
import { supabase } from './supabase.js';

let usuarioAtual = null;
let equipesDoDirigente = [];

function estiloCampo() {
  return `
    width:100%;box-sizing:border-box;padding:14px;
    margin:7px 0 14px;border:1px solid #303a32;
    border-radius:9px;background:#111713;color:#fff;
    font-size:15px;
  `;
}

function estiloBotao() {
  return `
    width:100%;padding:15px;border:0;border-radius:9px;
    background:#b5ff38;color:#080b09;font-weight:800;
    font-size:15px;cursor:pointer;margin-top:8px;
  `;
}

function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[c]);
}

function iniciarPainelDirigente() {
  supabase.auth.getSession().then(({ data, error }) => {
    if (!error && data.session) verificarDirigente(data.session.user);
  });

  supabase.auth.onAuthStateChange((evento, session) => {
    if (evento === 'SIGNED_IN' && session) {
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

  if (error || !perfil || perfil.role !== 'manager') return;

  usuarioAtual = user;
  abrirPainelDirigente(perfil);
}

function abrirPainelDirigente(perfil) {
  const loginBox = document.getElementById('login-box');
  if (!loginBox) return;

  loginBox.innerHTML = `
    <div style="background:#080b09;color:#fff;padding:22px;
      border-radius:16px;width:100%;box-sizing:border-box;font-family:Arial,sans-serif;">

      <div style="margin-bottom:25px;">
        <div style="color:#b5ff38;font-size:12px;font-weight:bold;letter-spacing:2px;">
          TORNEIO JR
        </div>
        <h2 style="margin:8px 0;">Área do dirigente</h2>
        <p style="color:#aab3aa;">Olá, ${escapar(perfil.full_name || 'Dirigente')}!</p>
      </div>

      <section style="background:#111713;padding:17px;border-radius:12px;margin-bottom:20px;">
        <h3 style="color:#b5ff38;margin-top:0;">Cadastrar equipe</h3>
        <label>Nome da equipe</label>
        <input id="nome-equipe" placeholder="Nome completo da equipe" style="${estiloCampo()}">
        <label>Campeonato</label>
        <select id="competicao-escolhida" style="${estiloCampo()}">
          <option value="">Carregando campeonatos...</option>
        </select>
        <button id="botao-equipe" style="${estiloBotao()}">CADASTRAR EQUIPE</button>
        <p id="mensagem-equipe" style="font-size:13px;"></p>
      </section>

      <section style="background:#111713;padding:17px;border-radius:12px;margin-bottom:20px;">
        <h3 style="color:#b5ff38;margin-top:0;">Minhas equipes</h3>
        <div id="minhas-equipes">Carregando equipes...</div>
      </section>

      <section style="background:#111713;padding:17px;border-radius:12px;margin-bottom:20px;">
        <h3 style="color:#b5ff38;margin-top:0;">Cadastrar atleta</h3>

        <label>Equipe do atleta</label>
        <select id="equipe-atleta" style="${estiloCampo()}">
          <option value="">Selecione uma equipe</option>
        </select>

        <label>Nome completo</label>
        <input id="nome-atleta" placeholder="Nome completo do atleta"
          autocomplete="name" style="${estiloCampo()}">

        <label>CPF</label>
        <input id="cpf-atleta" placeholder="000.000.000-00"
          inputmode="numeric" maxlength="14" style="${estiloCampo()}">

        <label>Data de nascimento</label>
        <input id="nascimento-atleta" type="date" style="${estiloCampo()}">

        <label>WhatsApp</label>
        <input id="whatsapp-atleta" placeholder="(31) 99999-9999"
          type="tel" inputmode="tel" style="${estiloCampo()}">

        <button id="botao-atleta" style="${estiloBotao()}">CADASTRAR ATLETA</button>
        <p id="mensagem-atleta" style="font-size:13px;"></p>
      </section>

      <section style="background:#111713;padding:17px;border-radius:12px;margin-bottom:20px;">
        <h3 style="color:#b5ff38;margin-top:0;">Atletas cadastrados</h3>
        <div id="lista-atletas">Selecione uma equipe para visualizar os atletas.</div>
      </section>

      <section style="background:#111713;padding:17px;border-radius:12px;margin-bottom:20px;">
        <h3 style="color:#b5ff38;margin-top:0;">Comissão técnica</h3>
        <p style="color:#aaa;font-size:13px;">Cada equipe pode cadastrar até 3 integrantes.</p>

        <label>Equipe</label>
        <select id="equipe-comissao" style="${estiloCampo()}">
          <option value="">Selecione uma equipe</option>
        </select>

        <label>Nome completo do integrante</label>
        <input id="nome-comissao" placeholder="Nome completo" style="${estiloCampo()}">

        <label>Função na comissão</label>
        <select id="funcao-comissao" style="${estiloCampo()}">
          <option value="">Selecione a função</option>
          <option value="Treinador">Treinador</option>
          <option value="Auxiliar técnico">Auxiliar técnico</option>
          <option value="Preparador físico">Preparador físico</option>
          <option value="Preparador de goleiros">Preparador de goleiros</option>
          <option value="Fisioterapeuta">Fisioterapeuta</option>
          <option value="Massagista">Massagista</option>
          <option value="Outro">Outro</option>
        </select>

        <button id="botao-comissao" style="${estiloBotao()}">
          CADASTRAR INTEGRANTE
        </button>
        <p id="mensagem-comissao" style="font-size:13px;"></p>

        <div style="border-top:1px solid #303a32;margin-top:18px;padding-top:12px;">
          <h4 style="color:#b5ff38;">Integrantes cadastrados</h4>
          <div id="lista-comissao">Selecione uma equipe para visualizar.</div>
        </div>
      </section>

      <button id="sair-dirigente" style="
        width:100%;padding:13px;border:1px solid #586258;
        border-radius:9px;background:transparent;color:#fff;
        font-weight:bold;cursor:pointer;
      ">SAIR DA CONTA</button>
    </div>
  `;

  document.getElementById('botao-equipe').onclick = cadastrarEquipe;
  document.getElementById('botao-atleta').onclick = cadastrarAtleta;
  document.getElementById('botao-comissao').onclick = cadastrarIntegrante;

  document.getElementById('equipe-atleta').onchange = carregarAtletas;
  document.getElementById('equipe-comissao').onchange = carregarComissao;

  document.getElementById('sair-dirigente').onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  document.getElementById('cpf-atleta').addEventListener('input', evento => {
    let valor = evento.target.value.replace(/\D/g, '').slice(0, 11);
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    evento.target.value = valor;
  });

  carregarCompeticoes();
  carregarMinhasEquipes();
}

async function carregarCompeticoes() {
  const campo = document.getElementById('competicao-escolhida');

  const { data, error } = await supabase
    .from('competitions')
    .select('id, name')
    .in('status', ['Inscrições abertas', 'Open'])
    .order('created_at', { ascending: false });

  if (error) {
    campo.innerHTML = '<option value="">Erro ao carregar campeonatos</option>';
    return;
  }

  campo.innerHTML = '<option value="">Selecione um campeonato</option>';

  (data || []).forEach(competicao => {
    campo.innerHTML += `
      <option value="${escapar(competicao.id)}">${escapar(competicao.name)}</option>
    `;
  });
}

async function cadastrarEquipe() {
  const nome = document.getElementById('nome-equipe').value.trim();
  const competicao = document.getElementById('competicao-escolhida').value;
  const mensagem = document.getElementById('mensagem-equipe');
  const botao = document.getElementById('botao-equipe');

  if (!nome || !competicao) {
    mensagem.textContent = 'Preencha o nome e selecione o campeonato.';
    return;
  }

  botao.disabled = true;
  mensagem.textContent = 'Cadastrando...';

  const { error } = await supabase.rpc('register_team', {
    p_name: nome,
    p_competition_id: competicao
  });

  botao.disabled = false;

  if (error) {
    mensagem.textContent = 'Não foi possível cadastrar: ' + error.message;
    return;
  }

  mensagem.textContent = 'Equipe cadastrada! Aguardando aprovação.';
  document.getElementById('nome-equipe').value = '';
  await carregarMinhasEquipes();
}

async function carregarMinhasEquipes() {
  const lista = document.getElementById('minhas-equipes');
  const seletorAtleta = document.getElementById('equipe-atleta');
  const seletorComissao = document.getElementById('equipe-comissao');

  const { data, error } = await supabase
    .from('teams')
    .select('id, name, status')
    .eq('owner_id', usuarioAtual.id)
    .order('created_at', { ascending: false });

  if (error) {
    lista.textContent = 'Não foi possível carregar as equipes: ' + error.message;
    return;
  }

  equipesDoDirigente = data || [];

  lista.innerHTML = equipesDoDirigente.length
    ? equipesDoDirigente.map(equipe => `
        <div style="padding:12px;border-bottom:1px solid #303a32;">
          <strong>${escapar(equipe.name)}</strong>
          <div style="color:#b5ff38;font-size:12px;margin-top:5px;">
            ${escapar(equipe.status)}
          </div>
        </div>
      `).join('')
    : '<p style="color:#aaa;">Nenhuma equipe cadastrada ainda.</p>';

  const opcoes = '<option value="">Selecione uma equipe</option>' +
    equipesDoDirigente.map(equipe => `
      <option value="${escapar(equipe.id)}">${escapar(equipe.name)}</option>
    `).join('');

  seletorAtleta.innerHTML = opcoes;
  seletorComissao.innerHTML = opcoes;
}

async function cadastrarAtleta() {
  const equipe = document.getElementById('equipe-atleta').value;
  const nome = document.getElementById('nome-atleta').value.trim();
  const cpf = document.getElementById('cpf-atleta').value.replace(/\D/g, '');
  const nascimento = document.getElementById('nascimento-atleta').value;
  const whatsapp = document.getElementById('whatsapp-atleta').value.trim();
  const mensagem = document.getElementById('mensagem-atleta');
  const botao = document.getElementById('botao-atleta');

  if (!equipe || !nome || !cpf || !nascimento || !whatsapp) {
    mensagem.textContent = 'Preencha todos os campos.';
    return;
  }

  if (cpf.length !== 11) {
    mensagem.textContent = 'Digite um CPF com 11 números.';
    return;
  }

  if (!equipesDoDirigente.some(item => item.id === equipe)) {
    mensagem.textContent = 'Selecione uma equipe válida.';
    return;
  }

  botao.disabled = true;
  mensagem.textContent = 'Cadastrando atleta...';

  const { error } = await supabase.rpc('register_player', {
    p_team_id: equipe,
    p_full_name: nome,
    p_cpf: cpf,
    p_birth_date: nascimento,
    p_whatsapp: whatsapp
  });

  botao.disabled = false;

  if (error) {
    mensagem.textContent = 'Não foi possível cadastrar: ' + error.message;
    return;
  }

  mensagem.textContent = 'Atleta cadastrado com sucesso!';
  document.getElementById('nome-atleta').value = '';
  document.getElementById('cpf-atleta').value = '';
  document.getElementById('nascimento-atleta').value = '';
  document.getElementById('whatsapp-atleta').value = '';

  await carregarAtletas();
}

async function carregarAtletas() {
  const equipe = document.getElementById('equipe-atleta').value;
  const lista = document.getElementById('lista-atletas');

  if (!equipe) {
    lista.textContent = 'Selecione uma equipe para visualizar os atletas.';
    return;
  }

  const { data, error } = await supabase
    .from('players')
    .select('id, full_name, status')
    .eq('team_id', equipe)
    .order('created_at', { ascending: false });

  if (error) {
    lista.textContent = 'Não foi possível carregar os atletas: ' + error.message;
    return;
  }

  lista.innerHTML = data && data.length
    ? data.map(atleta => `
        <div style="padding:12px;border-bottom:1px solid #303a32;">
          <strong>${escapar(atleta.full_name)}</strong>
          <div style="color:#b5ff38;font-size:12px;margin-top:5px;">
            ${escapar(atleta.status)}
          </div>
        </div>
      `).join('')
    : '<p style="color:#aaa;">Nenhum atleta cadastrado nesta equipe.</p>';
}

async function cadastrarIntegrante() {
  const equipe = document.getElementById('equipe-comissao').value;
  const nome = document.getElementById('nome-comissao').value.trim();
  const funcao = document.getElementById('funcao-comissao').value;
  const mensagem = document.getElementById('mensagem-comissao');
  const botao = document.getElementById('botao-comissao');

  if (!equipe || !nome || !funcao) {
    mensagem.textContent = 'Selecione a equipe e preencha o nome e a função.';
    return;
  }

  if (!equipesDoDirigente.some(item => item.id === equipe)) {
    mensagem.textContent = 'Selecione uma equipe válida.';
    return;
  }

  botao.disabled = true;
  mensagem.textContent = 'Cadastrando integrante...';

  const { error } = await supabase.rpc('register_team_staff', {
    p_team_id: equipe,
    p_full_name: nome,
    p_role: funcao
  });

  botao.disabled = false;

  if (error) {
    mensagem.textContent = 'Não foi possível cadastrar: ' + error.message;
    return;
  }

  mensagem.textContent = 'Integrante cadastrado com sucesso!';
  document.getElementById('nome-comissao').value = '';
  document.getElementById('funcao-comissao').value = '';

  await carregarComissao();
}

async function carregarComissao() {
  const equipe = document.getElementById('equipe-comissao').value;
  const lista = document.getElementById('lista-comissao');
  const botao = document.getElementById('botao-comissao');

  if (!equipe) {
    lista.textContent = 'Selecione uma equipe para visualizar.';
    botao.disabled = false;
    return;
  }

  const { data, error } = await supabase
    .from('team_staff')
    .select('id, full_name, role')
    .eq('team_id', equipe)
    .order('created_at', { ascending: true });

  if (error) {
    lista.textContent = 'Não foi possível carregar a comissão: ' + error.message;
    return;
  }

  const integrantes = data || [];

  lista.innerHTML = integrantes.length
    ? integrantes.map((integrante, indice) => `
        <div style="padding:12px;border-bottom:1px solid #303a32;">
          <strong>${indice + 1}. ${escapar(integrante.full_name)}</strong>
          <div style="color:#b5ff38;font-size:13px;margin-top:5px;">
            ${escapar(integrante.role)}
          </div>
        </div>
      `).join('')
    : '<p style="color:#aaa;">Nenhum integrante cadastrado.</p>';

  botao.disabled = integrantes.length >= 3;

  if (integrantes.length >= 3) {
    document.getElementById('mensagem-comissao').textContent =
      'Limite de 3 integrantes atingido para esta equipe.';
  } else {
    document.getElementById('mensagem-comissao').textContent =
      `${integrantes.length} de 3 integrantes cadastrados.`;
  }
}

iniciarPainelDirigente();
