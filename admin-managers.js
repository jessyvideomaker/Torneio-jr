
import { supabase } from './supabase.js';

const estilo = document.createElement('style');

estilo.textContent = `
#gestao-dirigentes {
  color: #fff;
  margin-top: 20px;
}
.dirigente-card {
  background: #151a16;
  border: 1px solid #303a30;
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
}
.dirigente-card button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  margin-top: 10px;
  cursor: pointer;
  font-weight: 800;
}
.btn-liberar {
  background: #b5ff38;
  color: #080b09;
}
.btn-bloquear {
  background: #c62828;
  color: #fff;
}
`;

document.head.appendChild(estilo);

function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caractere]);
}

async function carregarDirigentes() {
  const lista = document.getElementById('lista-dirigentes-admin');
  if (!lista) return;

  lista.innerHTML = '<p>Carregando dirigentes...</p>';

  const { data, error } = await supabase.rpc('admin_list_managers');

  if (error) {
    lista.innerHTML =
      `<p>Erro ao carregar: ${escapar(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    lista.innerHTML = '<p>Nenhum dirigente cadastrado.</p>';
    return;
  }

  lista.innerHTML = data.map(dirigente => {
    const ativo = dirigente.is_active === true;

    return `
      <div class="dirigente-card">
        <h3>${escapar(dirigente.full_name || 'Sem nome')}</h3>
        <p><strong>Equipe:</strong>
          ${escapar(dirigente.team_name || 'Não informada')}
        </p>
        <p><strong>WhatsApp:</strong>
          ${escapar(dirigente.phone || 'Não informado')}
        </p>
        <p><strong>E-mail:</strong>
          ${escapar(dirigente.email || 'Não informado')}
        </p>
        <p><strong>Acesso:</strong>
          ${ativo ? 'LIBERADO' : 'BLOQUEADO'}
        </p>

        <button
          class="${ativo ? 'btn-bloquear' : 'btn-liberar'}"
          data-dirigente-id="${escapar(dirigente.id)}"
          data-dirigente-ativo="${ativo}">
          ${ativo ? 'BLOQUEAR ACESSO' : 'LIBERAR ACESSO'}
        </button>
      </div>
    `;
  }).join('');
}

async function alterarAcesso(id, ativoAtual) {
  const novoStatus = ativoAtual !== 'true';

  const mensagem = novoStatus
    ? 'Deseja liberar o acesso deste dirigente?'
    : 'Deseja bloquear o acesso deste dirigente?';

  if (!confirm(mensagem)) return;

  const { error } = await supabase.rpc('admin_toggle_manager', {
    p_manager_id: id,
    p_active: novoStatus
  });

  if (error) {
    alert('Não foi possível atualizar: ' + error.message);
    return;
  }

  alert('Status atualizado com sucesso!');
  carregarDirigentes();
}

function instalarPainel() {
  const painel = document.getElementById('painel-admin');
  if (!painel) return;

  if (document.getElementById('botao-gestao-dirigentes')) return;

  const botao = document.createElement('button');
  botao.id = 'botao-gestao-dirigentes';
  botao.textContent = 'GESTÃO DE DIRIGENTES';
  botao.style.cssText =
    'background:#b5ff38;color:#080b09;padding:12px 18px;' +
    'border:0;border-radius:8px;font-weight:900;cursor:pointer;';

  const secao = document.createElement('section');
  secao.id = 'gestao-dirigentes';
  secao.style.display = 'none';

  secao.innerHTML = `
    <h2>GESTÃO DE DIRIGENTES</h2>
    <button id="atualizar-dirigentes"
      style="background:#b5ff38;color:#080b09;">
      ATUALIZAR LISTA
    </button>
    <div id="lista-dirigentes-admin"></div>
  `;

  painel.appendChild(botao);
  painel.appendChild(secao);

  botao.addEventListener('click', () => {
    const aberta = secao.style.display !== 'none';
    secao.style.display = aberta ? 'none' : 'block';

    if (!aberta) carregarDirigentes();
  });

  secao.querySelector('#atualizar-dirigentes')
    .addEventListener('click', carregarDirigentes);
}

document.addEventListener('click', event => {
  const botao = event.target.closest('[data-dirigente-id]');
  if (!botao) return;

  alterarAcesso(
    botao.dataset.dirigenteId,
    botao.dataset.dirigenteAtivo
  );
});

const observador = new MutationObserver(instalarPainel);

observador.observe(document.body, {
  childList: true,
  subtree: true
});

instalarPainel();

