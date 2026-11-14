
import { supabase } from './supabase.js';

(() => {
  const estilo = `
    <style>
      #gestao-equipes {
        margin-top: 18px;
        padding: 18px;
        background: #101510;
        border: 1px solid #b5ff38;
        border-radius: 12px;
        color: white;
      }
      #gestao-equipes h2 {
        color: #b5ff38;
        font-size: 20px;
      }
      .equipe-admin {
        background: #1a2119;
        border: 1px solid #35432d;
        border-radius: 10px;
        padding: 14px;
        margin: 12px 0;
      }
      .equipe-admin p {
        margin: 7px 0;
        overflow-wrap: anywhere;
      }
      .equipe-admin button {
        padding: 10px 14px;
        margin: 8px 6px 0 0;
        border: 0;
        border-radius: 7px;
        font-weight: bold;
        cursor: pointer;
      }
      .aprovar-equipe {
        background: #b5ff38;
        color: #080b09;
      }
      .recusar-equipe {
        background: #e34b4b;
        color: white;
      }
      .excluir-equipe {
        background: #8f2525;
        color: white;
      }
      .status-equipe {
        color: #b5ff38;
        font-weight: bold;
      }
    </style>
  `;

  function escapar(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[caractere]);
  }

  async function carregarEquipes() {
    const lista = document.getElementById('lista-equipes-admin');
    if (!lista) return;

    lista.innerHTML = 'Carregando equipes...';

    const { data, error } = await supabase.rpc('admin_list_teams');

    if (error) {
      lista.innerHTML = 'Erro ao carregar equipes: ' + escapar(error.message);
      return;
    }

    if (!data || data.length === 0) {
      lista.innerHTML = 'Nenhuma equipe cadastrada até o momento.';
      return;
    }

    lista.innerHTML = data.map(equipe => {
      const status = {
        pending: 'Pendente',
        approved: 'Aprovada',
        rejected: 'Recusada'
      }[equipe.status] || equipe.status;

      const botoes = equipe.status === 'pending'
        ? `
          <button class="aprovar-equipe" data-id="${escapar(equipe.id)}" data-status="approved">
            APROVAR
          </button>
          <button class="recusar-equipe" data-id="${escapar(equipe.id)}" data-status="rejected">
            RECUSAR
          </button>
        `
        : '';

      return `
        <div class="equipe-admin">
          <h3>${escapar(equipe.name)}</h3>
          <p><strong>Dirigente:</strong> ${escapar(equipe.manager_name || 'Não informado')}</p>
          <p><strong>Campeonato:</strong> ${escapar(equipe.competition_name || 'Não informado')}</p>
          <p><strong>Status:</strong> <span class="status-equipe">${escapar(status)}</span></p>
          ${botoes}
          <button class="excluir-equipe" data-action="delete" data-id="${escapar(equipe.id)}">
            EXCLUIR EQUIPE
          </button>
        </div>
      `;
    }).join('');
  }

  async function atualizarStatus(id, status) {
    const acao = status === 'approved' ? 'aprovar' : 'recusar';

    if (!confirm(`Deseja realmente ${acao} esta equipe?`)) return;

    const { error } = await supabase.rpc('admin_update_team_status', {
      p_team_id: id,
      p_status: status
    });

    if (error) {
      alert('Não foi possível atualizar: ' + error.message);
      return;
    }

    alert('Status da equipe atualizado com sucesso!');
    carregarEquipes();
  }

  async function excluirEquipe(id, nome) {
    const confirmou = confirm(
      `ATENÇÃO!\n\nDeseja realmente excluir a equipe "${nome}"?\n\nOs atletas serão preservados, mas ficarão sem equipe vinculada. A comissão técnica e os grupos vinculados serão excluídos. Equipes com partidas não poderão ser excluídas.`
    );

    if (!confirmou) return;

    const { error } = await supabase.rpc('admin_delete_team', {
      p_team_id: id
    });

    if (error) {
      alert('Não foi possível excluir a equipe:\n' + error.message);
      return;
    }

    alert('Equipe excluída com sucesso!');
    carregarEquipes();
  }

  function instalarPainel() {
    const painel = document.getElementById('painel-admin');
    if (!painel || document.getElementById('botao-gestao-equipes')) return;

    painel.insertAdjacentHTML('beforeend', estilo);

    const botao = document.createElement('button');
    botao.id = 'botao-gestao-equipes';
    botao.textContent = 'GESTÃO DE EQUIPES';
    botao.style.cssText = `
      display:block;
      width:100%;
      margin:15px 0;
      padding:14px;
      background:#b5ff38;
      color:#080b09;
      border:0;
      border-radius:8px;
      font-weight:900;
      cursor:pointer;
    `;

    const secao = document.createElement('section');
    secao.id = 'gestao-equipes';
    secao.style.display = 'none';
    secao.innerHTML = `
      <h2>GESTÃO DE EQUIPES</h2>
      <p>Consulte, aprove, recuse ou exclua equipes inscritas.</p>
      <button id="atualizar-lista-equipes" style="padding:10px;margin-bottom:12px;cursor:pointer;">
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

    secao.addEventListener('click', event => {
      const botaoAcao = event.target.closest('button[data-id]');
      if (!botaoAcao) return;

      const id = botaoAcao.dataset.id;

      if (botaoAcao.dataset.action === 'delete') {
        const equipe = botaoAcao.closest('.equipe-admin');
        const nome = equipe.querySelector('h3')?.textContent || 'Equipe';

        excluirEquipe(id, nome);
        return;
      }

      atualizarStatus(id, botaoAcao.dataset.status);
    });
  }

  const observador = new MutationObserver(instalarPainel);
  observador.observe(document.body, {
    childList: true,
    subtree: true
  });

  instalarPainel();
})();
