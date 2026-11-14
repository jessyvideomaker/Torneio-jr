
import { supabase } from './supabase.js';

function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function criarGestaoAtletas() {
  const painel = document.getElementById('painel-admin');

  if (!painel || document.getElementById('gestao-atletas-admin')) return;

  const botao = document.createElement('button');
  botao.textContent = 'GESTÃO DE ATLETAS';
  botao.style.cssText = `
    display:block;width:100%;padding:15px;margin:15px 0;
    background:#b5ff38;color:#080b09;border:0;
    border-radius:9px;font-weight:800;font-size:15px;
    cursor:pointer;
  `;

  const area = document.createElement('section');
  area.id = 'gestao-atletas-admin';
  area.style.cssText = `
    display:none;background:#111713;color:#fff;
    padding:18px;border-radius:12px;margin:15px 0;
  `;

  area.innerHTML = `
    <h2 style="color:#b5ff38;">Gestão de atletas</h2>
    <p style="color:#aaa;">Consulte os cadastros e aprove ou reprove os atletas.</p>
    <button id="atualizar-lista-atletas" style="
      padding:12px;background:#b5ff38;color:#080b09;
      border:0;border-radius:8px;font-weight:bold;cursor:pointer;
    ">ATUALIZAR LISTA</button>
    <div id="resultado-atletas-admin" style="margin-top:18px;">
      Toque em atualizar lista.
    </div>
  `;

  botao.onclick = () => {
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
  };

  painel.appendChild(botao);
  painel.appendChild(area);

  document.getElementById('atualizar-lista-atletas')
    .onclick = carregarAtletasAdmin;

  area.addEventListener('click', async evento => {
    const acao = evento.target.closest('[data-status]');
    if (!acao) return;

    const playerId = acao.dataset.id;
    const status = acao.dataset.status;

    if (!confirm(
      status === 'approved'
        ? 'Deseja aprovar este atleta?'
        : 'Deseja reprovar este atleta?'
    )) return;

    acao.disabled = true;

    const { error } = await supabase.rpc('admin_update_player_status', {
      p_player_id: playerId,
      p_status: status
    });

    if (error) {
      alert('Não foi possível atualizar: ' + error.message);
      acao.disabled = false;
      return;
    }

    alert('Cadastro atualizado com sucesso!');
    await carregarAtletasAdmin();
  });
}

async function carregarAtletasAdmin() {
  const resultado = document.getElementById('resultado-atletas-admin');

  resultado.textContent = 'Carregando atletas...';

  const { data, error } = await supabase.rpc('admin_list_players');

  if (error) {
    resultado.textContent = 'Erro ao carregar atletas: ' + error.message;
    return;
  }

  if (!data || data.length === 0) {
    resultado.textContent = 'Nenhum atleta cadastrado.';
    return;
  }

  resultado.innerHTML = data.map(atleta => {
    const nascimento = atleta.birth_date
      ? new Date(atleta.birth_date + 'T12:00:00').toLocaleDateString('pt-BR')
      : 'Não informado';

    const status = {
      pending: 'Aguardando aprovação',
      approved: 'Aprovado',
      rejected: 'Reprovado'
    }[atleta.status] || atleta.status;

    return `
      <article style="
        background:#080b09;padding:15px;margin-bottom:14px;
        border:1px solid #303a32;border-radius:10px;
      ">
        <h3 style="color:#b5ff38;margin-top:0;">
          ${escapar(atleta.full_name)}
        </h3>

        <p><strong>Equipe:</strong> ${escapar(atleta.team_name || 'Não informada')}</p>
        <p><strong>CPF:</strong> ${escapar(atleta.cpf || 'Não informado')}</p>
        <p><strong>Nascimento:</strong> ${escapar(nascimento)}</p>
        <p><strong>WhatsApp:</strong> ${escapar(atleta.whatsapp || 'Não informado')}</p>
        <p><strong>Status:</strong> ${escapar(status)}</p>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button data-id="${escapar(atleta.player_id)}"
            data-status="approved"
            style="padding:11px;background:#b5ff38;color:#080b09;
            border:0;border-radius:7px;font-weight:bold;cursor:pointer;">
            APROVAR
          </button>

          <button data-id="${escapar(atleta.player_id)}"
            data-status="rejected"
            style="padding:11px;background:#a83232;color:#fff;
            border:0;border-radius:7px;font-weight:bold;cursor:pointer;">
            REPROVAR
          </button>
        </div>
      </article>
    `;
  }).join('');
}

const observador = new MutationObserver(() => {
  criarGestaoAtletas();
});

observador.observe(document.body, {
  childList: true,
  subtree: true
});

criarGestaoAtletas();
