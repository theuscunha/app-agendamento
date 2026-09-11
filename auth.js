/* ==========================================================================
   Maria Souza — Sobrancelhas | login / cadastro (Supabase Auth + demo local)
   - Cadastro pede: nome, e-mail, data de nascimento e senha
   - Nascimento vai para o user_metadata no Supabase (sem tabela extra)
   - Sem Supabase ou se ele falhar: contas ficam só neste navegador
   ========================================================================== */

const LS_CONTAS = "ms_contas";
const LS_SESSAO = "ms_sessao";

let authClient = null;
if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && window.supabase) {
  authClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
}

const authMsg = document.getElementById("auth-msg");
function authErro(t) {
  authMsg.textContent = t;
  authMsg.classList.remove("hidden");
  setTimeout(() => authMsg.classList.add("hidden"), 4500);
}

function showScreen(nome) {
  ["welcome", "login", "register"].forEach((s) =>
    document.getElementById(`screen-${s}`).classList.toggle("hidden", s !== nome || nome === "app")
  );
  document.getElementById("screen-app").classList.toggle("hidden", nome !== "app");
  document.getElementById("user-chip").classList.toggle("hidden", nome !== "app");
  document.getElementById("online-pill").classList.toggle("hidden", nome === "app");
}

const getContas = () => {
  try { return JSON.parse(localStorage.getItem(LS_CONTAS)) || []; }
  catch { return []; }
};
const saveContaLocal = (c) => {
  const todas = getContas().filter((x) => x.email !== c.email);
  todas.push(c);
  localStorage.setItem(LS_CONTAS, JSON.stringify(todas));
};
const primeiroNome = (n) => String(n || "").trim().split(" ")[0] || "você";

function entrar(user) {
  localStorage.setItem(LS_SESSAO, JSON.stringify(user));
  document.getElementById("user-name").textContent = primeiroNome(user.nome);
  document.getElementById("user-avatar").textContent = (primeiroNome(user.nome)[0] || "M").toUpperCase();
  showScreen("app");
  if (window.__setUsuario) window.__setUsuario(user);
  if (window.__restartChat) window.__restartChat();
}

async function sair() {
  try { await authClient?.auth.signOut(); } catch { /* ignora */ }
  localStorage.removeItem(LS_SESSAO);
  showScreen("welcome");
}

// ---------- cadastro ----------
document.getElementById("form-register").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("reg-nome").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const nasc = document.getElementById("reg-nasc").value; // aaaa-mm-dd
  const pass = document.getElementById("reg-pass").value;

  if (nome.length < 2) return authErro("Me diz seu nome 🙂");
  if (!nasc) return authErro("Coloque sua data de nascimento 🎂");
  if (new Date(nasc) > new Date()) return authErro("Essa data de nascimento é no futuro? 🥺");
  if (pass.length < 6) return authErro("A senha precisa de 6+ caracteres.");

  // Tenta criar no Supabase (nascimento vai no perfil, sem tabela extra)
  if (authClient) {
    try {
      const { error } = await authClient.auth.signUp({
        email,
        password: pass,
        options: { data: { nome, nascimento: nasc } },
      });
      if (error && !/already|registrado|existe/i.test(error.message)) throw error;
    } catch (err) {
      console.warn("Cadastro Supabase falhou, usando modo local:", err.message);
    }
  }
  saveContaLocal({ nome, email, nasc, pass });
  entrar({ nome, email, nasc, origem: "cadastro" });
});

// ---------- login ----------
document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const pass = document.getElementById("login-pass").value;

  if (authClient) {
    try {
      const { data, error } = await authClient.auth.signInWithPassword({ email, password: pass });
      if (!error && data.user) {
        const md = data.user.user_metadata || {};
        return entrar({
          nome: md.nome || email.split("@")[0],
          email,
          nasc: md.nascimento || "",
          origem: "supabase",
        });
      }
    } catch (err) {
      console.warn("Login Supabase falhou, tentando local:", err.message);
    }
  }
  const conta = getContas().find((x) => x.email === email && x.pass === pass);
  if (conta) return entrar({ nome: conta.nome, email, nasc: conta.nasc, origem: "local" });
  authErro("E-mail ou senha inválidos. Ou crie sua conta 🙂");
});

// ---------- navegação ----------
document.getElementById("btn-go-login").onclick = () => showScreen("login");
document.getElementById("btn-go-register").onclick = () => showScreen("register");
document.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => showScreen(b.dataset.go)));
document.getElementById("btn-logout").onclick = sair;
document.getElementById("link-forgot").onclick = async () => {
  const email = prompt("Qual seu e-mail de cadastro?");
  if (!email) return;
  if (authClient) {
    const { error } = await authClient.auth.resetPasswordForEmail(email.trim());
    authErro(error ? "Não consegui enviar: " + error.message : "Te enviei um link de troca de senha 💌");
  } else {
    authErro("Crie uma conta nova — é rapidinho 🙂");
    showScreen("register");
  }
};

// ---------- sessão existente ----------
document.addEventListener("DOMContentLoaded", async () => {
  if (authClient) {
    try {
      const { data } = await authClient.auth.getSession();
      const u = data?.session?.user;
      if (u) {
        const md = u.user_metadata || {};
        return entrar({
          nome: md.nome || (u.email || "").split("@")[0],
          email: u.email || "",
          nasc: md.nascimento || "",
          origem: "supabase",
        });
      }
    } catch { /* cai para sessão local */ }
  }
  try {
    const s = JSON.parse(localStorage.getItem(LS_SESSAO));
    if (s?.email) return entrar(s);
  } catch { /* sem sessão */ }
  showScreen("welcome");
});
