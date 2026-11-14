
import { supabase } from './supabase.js';

let usuarioAtual = null;

const estilo = document.createElement('style');
estilo.textContent = `
#painel-dirigente {
  color: white;
  margin-top: 20px;
}
.manager-card {
  background: #151a16;
  border: 1px solid #354234;
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
}
.manager-card h3 {
  color: #b5ff38;
}
.manager-card button {
  background: #b5ff38;
  color: #080b09;
  border: 0;
  border-radius: 8px;
  padding: 11px 15px;
  font-weight: 900;
  cursor: pointer;
  margin-top: 8px;
}
.manager-status {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 6px;
  background: #303a30;
  margin: 4px 0;
}
.manager-section {
  margin-top: 18px;
}
.manager-section input,
.manager-section select {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  margin: 8px 0;
  border-radius: 7px;
  border: 1px solid #555;
}
`;

document.head.appendChild(estilo);

function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function nomeStatus(status) {
  const nomes = {
    pending: 'Aguardando aprovação',
    approved: 'Aprovado',
    rejected: 'Recusado'
  };

  return nomes[status] || status || 'Não informado';
}

async function obterUsuario() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function carregarPainel() {
  const painel = document.getElementById('painel-dirigente');
  if (!painel || !usuarioAtual) return;

  painel.innerHTML = `
    <h2>ÁREA DO DIRIGENTE</h2>
    <p>Bem-vindo à gestão da sua equipe.</p>
    <div id="minhas-equipes"></div>
  `;

  await carregarMinhasEquipes();
}

async function carregarMinhasEquipes() {
  const area = document.getElementById('minhas-equipes');
  if (!area) return;

  area.innerHTML = '<p>Carregando suas equipes...</p>';

  const { data: equipes, error } = await supabase
    .from('teams')
    .select('id, name, status, competition_id')
    .eq('owner_id', usuarioAtual.id)
    .order('created_at', { ascending: false });

  if (error) {
    area.innerHTML = `<p>Erro: ${escapar(error.message)}</p>`;
    return;
  }

  if (!equipes || equipes.length === 0) {
    area.innerHTML = `
      <div class="manager-card">
        <h3>Nenhuma equipe cadastrada</h3>
        <p>Cadastre sua equipe para começar.</p>
        <button id="btn-abrir-cadastro-equipe">CADASTRAR EQUIPE</button>
      </div>
    `;
    document.getElementById('btn-abrir-cadastro-equipe')
      ?.addEventListener('click', abrirCadastroEquipe);
    return;
  }

  area.innerHTML = `
    <div class="manager-card">
      <h3>MINHAS EQUIPES</h3>
      ${equipes.map(equipe => `
        <div class="manager-card">
          <h3>${escapar(equipe.name)}</h3>
          <p>Status:
            <span class="manager-status">
              ${escapar(nomeStatus(equipe.status))}
            </span>
          </p>
          <button data-ver-minha-equipe="${escapar(equipe.id)}">
            ACOMPANHAR EQUIPE
          </button>
        </div>
      `).join('')}
      <button id="btn-abrir-cadastro-equipe">CADASTRAR OUTRA EQUIPE</button>
    </div>
  `;

  document.getElementById('btn-abrir-cadastro-equipe')
    ?.addEventListener('click', abrirCadastroEquipe);

  area.querySelectorAll('[data-ver-minha-equipe]').forEach(botao => {
    botao.addEventListener('click', () => {
      abrirDetalhesEquipe(botao.dataset.verMinhaEquipe);
    });
  });
}

async function abrirDetalhesEquipe(equipeId) {
  const area = document.getElementById('minhas-equipes');
  if (!area) return;

  area.innerHTML = '<p>Carregando informações...</p>';

  const { data: equipe, error } = await supabase
    .from('teams')
    .select('id, name, status')
    .eq('id', equipeId)
    .eq('owner_id', usuarioAtual.id)
    .single();

  if (error || !equipe) {
    area.innerHTML = '<p>Não foi possível localizar sua equipe.</p>';
    return;
  }

  const [atletasResultado, comissaoResultado] = await Promise.all([
    supabase
      .from('players')
      .select('id, full_name, shirt_number, position, status')
      .eq('team_id', equipeId)
      .order('full_name'),

    supabase
      .from('team_staff')
      .select('id, full_name, role')
      .eq('team_id', equipeId)
      .order('created_at')
  ]);

  if (atletasResultado.error || comissaoResultado.error) {
    area.innerHTML = `
      <p>Erro ao carregar os dados:
      ${escapar(atletasResultado.error?.message ||
        comissaoResultado.error?.message)}</p>
    `;
    return;
  }

  const atletas = atletasResultado.data || [];
  const comissao = comissaoResultado.data || [];

  area.innerHTML = `
    <div class="manager-card">
      <button id="voltar-equipes">VOLTAR</button>
      <h2>${escapar(equipe.name)}</h2>
      <p>Status da equipe:
        <span class="manager-status">
          ${escapar(nomeStatus(equipe.status))}
        </span>
      </p>

      <div class="manager-section">
        <h3>ATLETAS (${atletas.length})</h3>
        ${
          atletas.length
            ? atletas.map(atleta => `
              <div class="manager-card">
                <strong>${escapar(atleta.full_name)}</strong>
                <p>Camisa: ${escapar(atleta.shirt_number || 'Não informada')}</p>
                <p>Posição: ${escapar(atleta.position || 'Não informada')}</p>
                <p>Status:
                  <span class="manager-status">
                    ${escapar(nomeStatus(atleta.status))}
                  </span>
                </p>
              </div>
            `).join('')
            : '<p>Nenhum atleta cadastrado.</p>'
        }
      </div>

      <div class="manager-section">
        <h3>COMISSÃO TÉCNICA (${comissao.length}/3)</h3>
        ${
          comissao.length
            ? comissao.map(pessoa => `
              <div class="manager-card">
                <strong>${escapar(pessoa.full_name)}</strong>
                <p>${escapar(pessoa.role)}</p>
              </div>
            `).join('')
            : '<p>Nenhum integrante cadastrado.</p>'
        }
      </div>
    </div>
  `;

  document.getElementById('voltar-equipes')
    ?.addEventListener('click', carregarMinhasEquipes);
}

async function abrirCadastroEquipe() {
  const area = document.getElementById('minhas-equipes');
  if (!area) return;

  const { data: campeonatos, error } = await supabase
    .from('competitions')
    .select('id, name, season')
    .in('status', ['Open', 'Planejamento', 'Inscrições abertas'])
    .order('name');

  if (error) {
    alert('Erro ao carregar campeonatos: ' + error.message);
    return;
  }

  if (!campeonatos || campeonatos.length === 0) {
    alert('Não existem campeonatos disponíveis para inscrição.');
    return;
  }

  area.innerHTML = `
    <div class="manager-card">
      <button id="voltar-equipes">VOLTAR</button>
      <h3>CADASTRAR EQUIPE</h3>
      <form id="form-nova-equipe">
        <input id="nome-nova-equipe"
          placeholder="Nome da equipe" required>
        <select id="campeonato-nova-equipe" required>
          <option value="">Selecione o campeonato</option>
          ${campeonatos.map(c => `
            <option value="${escapar(c.id)}">
              ${escapar(c.name)} ${escapar(c.season || '')}
            </option>
          `).join('')}
        </select>
        <button type="submit">ENVIAR CADASTRO</button>
      </form>
    </div>
  `;

  document.getElementById('voltar-equipes')
    ?.addEventListener('click', carregarMinhasEquipes);

  document.getElementById('form-nova-equipe')
    .addEventListener('submit', async event => {
      event.preventDefault();

      const nome = document.getElementById('nome-nova-equipe').value.trim();
      const campeonato = document.getElementById('campeonato-nova-equipe').value;

      const { error } = await supabase.rpc('register_team', {
        p_name: nome,
        p_competition_id: campeonato
      });

      if (error) {
        alert('Erro ao cadastrar equipe: ' + error.message);
        return;
      }

      alert('Equipe enviada para aprovação!');
      carregarMinhasEquipes();
    });
}

async function instalarPainelDirigente() {
  usuarioAtual = await obterUsuario();
  if (!usuarioAtual) return;

  const { data: perfil, error } = await supabase
    .from('profiles')
    .select('role, full_name, is_active')
    .eq('id', usuarioAtual.id)
    .single();

  if (error || !perfil || perfil.role !== 'manager' ||
      perfil.is_active === false) return;

  if (document.getElementById('painel-dirigente')) return;

  const painel = document.createElement('section');
  painel.id = 'painel-dirigente';
  painel.style.cssText = `
    background:#080b09;
    border:1px solid #354234;
    border-radius:14px;
    padding:20px;
    margin:20px 0;
    color:white;
  `;

  const login = document.getElementById('login-box') ||
    document.getElementById('login-form');

  if (login) {
    login.insertAdjacentElement('afterend', painel);
  } else {
    document.body.appendChild(painel);
  }

  await carregarPainel();
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    setTimeout(instalarPainelDirigente, 0);
  }

  if (event === 'SIGNED_OUT') {
    usuarioAtual = null;
    document.getElementById('painel-dirigente')?.remove();
  }
});

document.addEventListener('DOMContentLoaded', instalarPainelDirigente);
