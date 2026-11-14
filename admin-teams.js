
import { supabase } from './supabase.js';

const estilo = document.createElement('style');
estilo.textContent = `
#gestao-equipes {
  color: #fff;
  margin-top: 20px;
}
#gestao-equipes button {
  cursor: pointer;
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  margin: 4px;
  font-weight: 800;
}
.btn-ver-equipe { background: #b5ff38; color: #080b09; }
.btn-aprovar-equipe { background: #b5ff38; color: #080b09; }
.btn-recusar-equipe { background: #555; color: #fff; }
.btn-excluir-equipe { background: #c62828; color: #fff; }
.equipe-admin-card {
  background: #151a16;
  border: 1px solid #303a30;
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
}
.equipe-admin-detalhes {
  background: #0b100c;
  border: 1px solid #354234;
  border-radius: 10px;
  padding: 14px;
  margin-top: 12px;
}
.equipe-admin-detalhes h4 { color: #b5ff38; }
.equipe-admin-detalhes p { margin: 7px 0; }
`;

document.head.appendChild(estilo);

const escapeHTML = (valor) => String(valor ?? '')
  .replace(/[&<>"']/g, caractere => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caractere]);

async function carregarEquipes() {
  const lista = document.getElementById('lista-equipes-admin');
  if (!lista) return;

  lista.innerHTML = '<p>Carregando equipes...</p>';

  const { data, error } = await supabase.rpc('admin_list_teams');

  if (error) {
    lista.innerHTML = `<p>Erro ao carregar equipes: ${escapeHTML(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    lista.innerHTML = '<p>Nenhuma equipe cadastrada.</p>';
    return;
  }

  lista.innerHTML = data.map(equipe => {
    const status = equipe.status || 'Não informado';
    const pendente = status === 'pending';

    return `
      <div class="equipe-admin-card">
        <h3>${escapeHTML(equipe.name)}</h3>
        <p><strong>Dirigente:</strong> ${escapeHTML(equipe.manager_name || 'Não informado')}</p>
        <p><strong>Campeonato:</strong> ${escapeHTML(equipe.competition_name || 'Não informado')}</p>
        <p><strong>Status:</strong> ${escapeHTML(status)}</p>

        <button class="btn-ver-equipe"
          data-ver-equipe="${escapeHTML(equipe.id)}">
          VER EQUIPE
        </button>

        ${pendente ? `
          <button class="btn-aprovar-equipe"
            data-aprovar-equipe="${escapeHTML(equipe.id)}">
            APROVAR
          </button>
          <button class="btn-recusar-equipe"
            data-recusar-equipe="${escapeHTML(equipe.id)}">
            RECUSAR
          </button>
        ` : ''}

        <button class="btn-excluir-equipe"
          data-excluir-equipe="${escapeHTML(equipe.id)}"
          data-nome-equipe="${escapeHTML(equipe.name)}">
          EXCLUIR EQUIPE
        </button>

        <div id="detalhes-equipe-${escapeHTML(equipe.id)}"></div>
      </div>
    `;
  }).join('');
}

async function verEquipe(id) {
  const area = document.getElementById(`detalhes-equipe-${id}`);
  if (!area) return;

  if (area.innerHTML.trim()) {
    area.innerHTML = '';
    return;
  }

  area.innerHTML = '<p>Carregando dados da equipe...</p>';

  const [atletasResultado, comissaoResultado] = await Promise.all([
    supabase
      .from('players')
      .select('full_name, shirt_number, position, status')
      .eq('team_id', id)
      .order('full_name'),

    supabase
      .from('team_staff')
      .select('full_name, role')
      .eq('team_id', id)
      .order('created_at')
  ]);

  if (atletasResultado.error || comissaoResultado.error) {
    area.innerHTML = `
      <div class="equipe-admin-detalhes">
        <p>Não foi possível carregar todos os dados.</p>
        <p>${escapeHTML(
          atletasResultado.error?.message ||
          comissaoResultado.error?.message
        )}</p>
      </div>
    `;
    return;
  }

  const atletas = atletasResultado.data || [];
  const comissao = comissaoResultado.data || [];

  area.innerHTML = `
    <div class="equipe-admin-detalhes">
      <h4>ATLETAS (${atletas.length})</h4>
      ${
        atletas.length
          ? atletas.map(atleta => `
            <p>
              <strong>${escapeHTML(atleta.full_name)}</strong>
              ${atleta.shirt_number != null
                ? ` | Camisa ${escapeHTML(atleta.shirt_number)}`
                : ''}
              ${atleta.position
                ? ` | ${escapeHTML(atleta.position)}`
                : ''}
              | ${escapeHTML(atleta.status)}
            </p>
          `).join('')
          : '<p>Nenhum atleta cadastrado.</p>'
      }

      <h4>COMISSÃO TÉCNICA (${comissao.length})</h4>
      ${
        comissao.length
          ? comissao.map(integrante => `
            <p>
              <strong>${escapeHTML(integrante.full_name)}</strong>
              | ${escapeHTML(integrante.role)}
            </p>
          `).join('')
          : '<p>Nenhum integrante cadastrado.</p>'
      }
    </div>
  `;
}

async function atualizarStatus(id, status) {
  const mensagem = status === 'approved'
    ? 'Deseja aprovar esta equipe?'
    : 'Deseja recusar esta equipe?';

  if (!confirm(mensagem)) return;

  const { error } = await supabase.rpc('admin_update_team_status', {
    p_team_id: id,
    p_status: status
  });

  if (error) {
    alert('Erro: ' + error.message);
    return;
  }

  alert('Cadastro atualizado com sucesso!');
  carregarEquipes();
}

async function excluirEquipe(id, nome) {
  const confirmou = confirm(
    `Tem certeza que deseja excluir a equipe "${nome}"?\n\n` +
    'Os atletas serão preservados, mas ficarão sem equipe. ' +
    'A comissão técnica e os grupos vinculados serão excluídos. ' +
    'Equipes com partidas vinculadas não podem ser excluídas.'
  );

  if (!confirmou) return;

  const { error } = await supabase.rpc('admin_delete_team', {
    p_team_id: id
  });

  if (error) {
    alert('Não foi possível excluir: ' + error.message);
    return;
  }

  alert('Equipe excluída com sucesso!');
  carregarEquipes();
}

function instalarPainel() {
  const painel = document.getElementById('painel-admin');
  if (!painel) return;

  if (document.getElementById('botao-gestao-equipes')) return;

  const botao = document.createElement('button');
  botao.id = 'botao-gestao-equipes';
  botao.textContent = 'GESTÃO DE EQUIPES';
  botao.style.cssText =
    'background:#b5ff38;color:#080b09;padding:12px 18px;' +
    'border:0;border-radius:8px;font-weight:900;cursor:pointer;';

  const secao = document.createElement('section');
  secao.id = 'gestao-equipes';
  secao.style.display = 'none';
  secao.innerHTML = `
    <h2>GESTÃO DE EQUIPES</h2>
    <button id="atualizar-lista-equipes"
      style="background:#b5ff38;color:#080b09;">
      ATUALIZAR LISTA
    </button>
    <div id="lista-equipes-admin"></div>
  `;

  painel.appendChild(botao);
  painel.appendChild(secao);

  botao.addEventListener('click', () => {
    const aberta = secao.style.display !== 'none';
    secao.style.display = aberta ? 'none' : 'block';
    if (!aberta) carregarEquipes();
  });

  secao.querySelector('#atualizar-lista-equipes')
    .addEventListener('click', carregarEquipes);
}

document.addEventListener('click', event => {
  const alvo = event.target;

  if (alvo.dataset.verEquipe) {
    verEquipe(alvo.dataset.verEquipe);
  }

  if (alvo.dataset.aprovarEquipe) {
    atualizarStatus(alvo.dataset.aprovarEquipe, 'approved');
  }

  if (alvo.dataset.recusarEquipe) {
    atualizarStatus(alvo.dataset.recusarEquipe, 'rejected');
  }

  if (alvo.dataset.excluirEquipe) {
    excluirEquipe(
      alvo.dataset.excluirEquipe,
      alvo.dataset.nomeEquipe
    );
  }
});

const observador = new MutationObserver(instalarPainel);
observador.observe(document.body, {
  childList: true,
  subtree: true
});

instalarPainel();
