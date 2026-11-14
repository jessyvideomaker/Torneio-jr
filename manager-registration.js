import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginBox = document.getElementById('login-box');

  if (!loginForm || !loginBox) return;

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.textContent = 'CRIAR CONTA DE DIRIGENTE';
  botao.style.cssText = `
    width:100%;
    margin-top:15px;
    padding:14px;
    background:#b5ff38;
    color:#080b09;
    border:0;
    border-radius:8px;
    font-weight:800;
    cursor:pointer;
  `;

  loginForm.insertAdjacentElement('afterend', botao);

  const cadastro = document.createElement('form');
  cadastro.style.cssText = `
    display:none;
    margin-top:20px;
    padding:18px;
    background:#101510;
    border:1px solid #b5ff38;
    border-radius:12px;
  `;

  cadastro.innerHTML = `
    <h2 style="color:#b5ff38">Cadastro de dirigente</h2>

    <input name="full_name" placeholder="Nome completo" required>
    <input name="phone" placeholder="Telefone com DDD" required>
    <input name="team_name" placeholder="Nome da equipe" required>
    <input name="email" type="email" placeholder="E-mail" required>
    <input name="password" type="password" placeholder="Criar senha" required minlength="6">
    <input name="confirm_password" type="password" placeholder="Confirmar senha" required minlength="6">

    <button type="submit" style="
      width:100%;
      padding:14px;
      margin-top:12px;
      background:#b5ff38;
      color:#080b09;
      border:0;
      border-radius:8px;
      font-weight:800;
    ">CADASTRAR</button>

    <p id="cadastro-mensagem" style="color:white"></p>
  `;

  loginForm.insertAdjacentElement('afterend', cadastro);

  botao.addEventListener('click', () => {
    cadastro.style.display = cadastro.style.display === 'none' ? 'block' : 'none';
  });

  cadastro.addEventListener('submit', async (event) => {
    event.preventDefault();

    const dados = new FormData(cadastro);
    const nome = dados.get('full_name').trim();
    const telefone = dados.get('phone').trim();
    const equipe = dados.get('team_name').trim();
    const email = dados.get('email').trim();
    const senha = dados.get('password');
    const confirmar = dados.get('confirm_password');
    const mensagem = document.getElementById('cadastro-mensagem');

    if (senha !== confirmar) {
      mensagem.textContent = 'As senhas não são iguais.';
      return;
    }

    mensagem.textContent = 'Criando sua conta...';

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          full_name: nome,
          phone: telefone,
          team_name: equipe
        }
      }
    });

    if (error) {
      mensagem.textContent = 'Erro: ' + error.message;
      return;
    }

    mensagem.textContent =
      'Cadastro realizado! Confira seu e-mail para confirmar a conta e depois faça login.';
    cadastro.reset();
  });
});
