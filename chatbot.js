/* ==========================================================================
   App Agendamento — Sobrancelhas | chatbot estilo WhatsApp
   Fluxo curto e direto: serviço → nome → WhatsApp → dia → horário → confirmar
   Funciona sem banco (modo demonstração, localStorage) e com Supabase.
   IA Groq via Edge Function é opcional e só ajuda a entender texto livre.
   ========================================================================== */

const $ = (id) => document.getElementById(id);
const els = {
  studioNome: $("studio-nome"),
  botNome: $("bot-nome"),
  messages: $("chat-messages"),
  quick: $("quick-replies"),
  form: $("chat-form"),
  input: $("chat-input"),
  demo: $("demo-badge"),
};

els.studioNome.textContent = CONFIG.studioNome;
els.botNome.textContent = `${CONFIG.atendenteNome} • ${CONFIG.studioNome}`;

const state = { servico: null, nome: "", telefone: "", dataISO: "", horario: "" };
let etapa = "servico";
let opcoesData = [];
let opcoesHora = [];
let supabaseClient = null;

// Usuário logado (definido pelo auth.js). Se já temos o nome,
// o chat pula a pergunta do nome e deseja feliz aniversário no dia 🎂
window.__usuario = null;
window.__setUsuario = (u) => { window.__usuario = u; };
window.__restartChat = () => restart();
function ehAniversarioHoje(nascISO) {
  if (!nascISO || !nascISO.includes("-")) return false;
  const [, m, d] = nascISO.split("-").map(Number);
  const hoje = new Date();
  return m === hoje.getMonth() + 1 && d === hoje.getDate();
}

if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && window.supabase) {
  supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
} else {
  els.demo.classList.remove("hidden");
}

// ---------- helpers ----------
const servicoPorId = (id) => CONFIG.servicos.find((s) => s.id === id);
const reais = (v) => `R$ ${Number(v).toFixed(0)}`;
function scrollBottom() { els.messages.scrollTop = els.messages.scrollHeight; }
function addMsg(text, who = "bot", isHTML = false) {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  if (isHTML) div.innerHTML = text;
  else div.textContent = text;
  els.messages.appendChild(div);
  scrollBottom();
}
function showTyping() {
  const t = document.createElement("div");
  t.className = "typing"; t.id = "typing-ind";
  t.innerHTML = "<i></i><i></i><i></i>";
  els.messages.appendChild(t); scrollBottom();
}
function hideTyping() { document.getElementById("typing-ind")?.remove(); }
function botSay(text, quick = []) {
  showTyping();
  return new Promise((res) => setTimeout(() => {
    hideTyping(); addMsg(text, "bot"); setQuick(quick); res();
  }, 450));
}
function setQuick(options) {
  els.quick.innerHTML = "";
  (options || []).forEach((opt) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "qr-btn"; b.textContent = opt;
    b.onclick = () => { els.input.value = opt; els.form.requestSubmit(); };
    els.quick.appendChild(b);
  });
}
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const soDigitos = (s) => String(s || "").replace(/\D/g, "");

// ---------- datas e horários ----------
function horarioDoDia(dataISO) {
  const [a, m, d] = dataISO.split("-").map(Number);
  const diaSemana = new Date(a, m - 1, d).getDay();
  return CONFIG.horariosPorDia[diaSemana] || null;
}
function proximosDias(n = 10) {
  const out = [];
  const hoje = new Date();
  for (let i = 0; i < n && out.length < 6; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!horarioDoDia(iso)) continue;
    const rotulo = i === 0 ? "Hoje" : i === 1 ? "Amanhã"
      : d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
    out.push({ iso, rotulo: `${rotulo}` });
  }
  return out;
}
function dataBonita(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}
function minOf(hhmm) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }
function hhmmOf(min) { return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`; }

function getDemo() {
  try { return JSON.parse(localStorage.getItem("agendamentos_demo")) || []; }
  catch { return []; }
}
function saveDemo(ag) {
  const all = getDemo(); all.push(ag);
  localStorage.setItem("agendamentos_demo", JSON.stringify(all));
}

async function horariosOcupados(dataISO) {
  try {
    if (supabaseClient) {
      const { data } = await supabaseClient.from(CONFIG.tabela).select("horario, servico").eq("data", dataISO);
      return (data || []).map((r) => r.horario);
    }
  } catch { /* cai para demo */ }
  return getDemo().filter((a) => a.data === dataISO).map((a) => a.horario);
}

async function gerarHorariosLivres(dataISO, servicoId) {
  const serv = servicoPorId(servicoId);
  const dur = serv.duracaoMin;
  const janela = horarioDoDia(dataISO);
  if (!janela) return [];
  const inicioMin = minOf(janela.inicio);
  const fimMin = minOf(janela.fim);
  const ocup = (await horariosOcupados(dataISO)).map(minOf);
  const livres = [];
  // Slots back-to-back da duração do serviço (40min): 16:30, 17:10, 17:50...
  // Só entra slot que termina até o fechamento (hora cheia: 20h, 18h...).
  for (let t = inicioMin; t + dur <= fimMin; t += dur) {
    const fim = t + dur;
    const conflita = ocup.some((o) => {
      // agendamentos existentes também ocupam 40min
      const oFim = o + 40;
      return t < oFim && o < fim;
    });
    if (!conflita) livres.push(hhmmOf(t));
  }
  // se for hoje, remove horários já passados
  if (dataISO === new Date().toISOString().slice(0, 10)) {
    const agora = new Date().getHours() * 60 + new Date().getMinutes() + 30;
    return livres.filter((h) => minOf(h) > agora);
  }
  return livres;
}

// ---------- IA opcional (Groq via Edge Function) ----------
async function interpretarServicoLivre(texto) {
  if (!CONFIG.edgeFunctionUrl || !CONFIG.supabaseAnonKey) return null;
  try {
    const r = await fetch(CONFIG.edgeFunctionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${CONFIG.supabaseAnonKey}` },
      body: JSON.stringify({
        system: "Você classifica o serviço de sobrancelha. Responda APENAS JSON: {\"servico\": \"limpeza\" ou \"henna\" ou \"\"}.",
        user: texto, model: CONFIG.groqModel,
      }),
    });
    const j = await r.json();
    const m = String(j.content || "").match(/\{[\s\S]*\}/);
    if (!m) return null;
    const p = JSON.parse(m[0]);
    return p.servico === "limpeza" || p.servico === "henna" ? p.servico : null;
  } catch { return null; }
}

// ---------- fluxo ----------
async function inicio() {
  etapa = "servico";
  const u = window.__usuario;
  const quem = u?.nome
    ? `Oi, ${esc(u.nome.split(" ")[0])}! Aqui é da ${CONFIG.studioNome} 💛`
    : `Oi! Aqui é da ${CONFIG.studioNome} 💛`;
  const mimo = u?.nasc && ehAniversarioHoje(u.nasc) ? "\n🎂 Feliz aniversário! Hoje tem mimo pra você!" : "";
  await botSay(`${quem}${mimo}\nLimpeza ${reais(20)} • Henna ${reais(30)}.\nQual você quer?`, ["Limpeza R$20", "Henna R$30"]);
}

async function tratar(textoOriginal) {
  const texto = textoOriginal.trim();
  if (!texto) return;
  addMsg(texto, "user");
  setQuick([]);
  els.input.value = "";
  const low = texto.toLowerCase();

  // comandos globais
  if (/^🔄|recomeçar|recomecar|reiniciar|novo/.test(low)) return restart();

  if (etapa === "servico") {
    let id = null;
    if (/limpeza|limpa|20/.test(low)) id = "limpeza";
    else if (/henna|30|tinta/.test(low)) id = "henna";
    else id = await interpretarServicoLivre(texto);
    if (!id) { await botSay("Só trabalho com sobrancelha por aqui 🙂\nÉ Limpeza ou Henna?", ["Limpeza R$20", "Henna R$30"]); return; }
    state.servico = id;
    if (window.__usuario?.nome) {
      state.nome = window.__usuario.nome;
      etapa = "telefone";
      await botSay(`Boa! ${servicoPorId(id).nome} ${reais(servicoPorId(id).preco)} ✅\nQual seu WhatsApp com DDD?`);
      return;
    }
    etapa = "nome";
    await botSay(`Boa! ${servicoPorId(id).nome} ${reais(servicoPorId(id).preco)} ✅\nComo posso te chamar?`);
    return;
  }

  if (etapa === "nome") {
    const nome = texto.replace(/^(meu nome é|me chamo|sou|aqui é)\s+/i, "").trim();
    if (nome.length < 2 || /^\d+$/.test(nome)) { await botSay("Me diz seu nome pra eu anotar? 🙂"); return; }
    state.nome = nome;
    etapa = "telefone";
    await botSay(`Prazer, ${esc(nome.split(" ")[0])}! Qual seu WhatsApp com DDD?`);
    return;
  }

  if (etapa === "telefone") {
    const m = texto.match(/\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}|\d{10,11}/);
    const dig = soDigitos(m ? m[0] : texto);
    if (dig.length < 10 || dig.length > 11) { await botSay("Não achei um número válido 🥺\nManda com DDD? Ex.: (11) 99999-8888"); return; }
    state.telefone = m ? m[0].trim() : texto;
    etapa = "data";
    opcoesData = proximosDias();
    await botSay("Qual dia fica bom pra você?", opcoesData.map((d) => d.rotulo));
    return;
  }

  if (etapa === "data") {
    let achou = opcoesData.find((d) => d.rotulo.toLowerCase() === low || low.includes(d.iso));
    if (!achou && /hoje/.test(low)) achou = opcoesData[0];
    if (!achou && /amanh/.test(low)) achou = opcoesData[1] || opcoesData[0];
    if (!achou) { await botSay("Escolhe um dia aqui embaixo, por favor 🙂", opcoesData.map((d) => d.rotulo)); return; }
    state.dataISO = achou.iso;
    etapa = "horario";
    opcoesHora = await gerarHorariosLivres(state.dataISO, state.servico);
    if (!opcoesHora.length) { await botSay("Esse dia lotou 🥺 Escolhe outro dia?", opcoesData.map((d) => d.rotulo)); etapa = "data"; return; }
    await botSay(`Horários livres em ${dataBonita(state.dataISO)}:`, opcoesHora.slice(0, 8));
    return;
  }

  if (etapa === "horario") {
    const m = texto.match(/\d{1,2}[:h]\d{2}|\d{1,2}\s*h/);
    const norm = m ? m[0].replace("h", ":") : texto;
    const hh = norm.includes(":") ? norm : null;
    if (!hh || !opcoesHora.includes(hh.padStart(5, "0"))) {
      await botSay("Escolhe um horário da lista, por favor 🙂", opcoesHora.slice(0, 8)); return;
    }
    state.horario = hh.padStart(5, "0");
    etapa = "confirmar";
    const s = servicoPorId(state.servico);
    addMsg(`Confira:<div class="summary"><div><span>Serviço</span><strong>${esc(s.nome)} • ${reais(s.preco)}</strong></div><div><span>Dia</span><strong>${esc(dataBonita(state.dataISO))}</strong></div><div><span>Hora</span><strong>${esc(state.horario)}</strong></div><div><span>Nome</span><strong>${esc(state.nome)}</strong></div></div><br>Tudo certo?`, "bot", true);
    setQuick(["✅ Confirmar", "✏️ Corrigir"]);
    return;
  }

  if (etapa === "confirmar") {
    if (/confirm|sim|isso|ok|pode|certo|fechado/.test(low)) { await salvar(); return; }
    if (/corrig|editar|alterar|mudar|não|nao|errado/.test(low)) {
      etapa = "correcao";
      await botSay("O que quer corrigir?", ["Serviço", "Dia", "Horário", "Nome"]);
      return;
    }
    await botSay('Responde "Confirmar" ou "Corrigir", por favor 🙂', ["✅ Confirmar", "✏️ Corrigir"]);
    return;
  }

  if (etapa === "correcao") {
    if (/servi/.test(low)) { etapa = "servico"; await botSay("Qual serviço?", ["Limpeza R$20", "Henna R$30"]); }
    else if (/dia|data/.test(low)) { etapa = "data"; await botSay("Qual dia?", opcoesData.map((d) => d.rotulo)); }
    else if (/hora/.test(low)) { etapa = "horario"; opcoesHora = await gerarHorariosLivres(state.dataISO, state.servico); await botSay("Qual horário?", opcoesHora.slice(0, 8)); }
    else if (/nome/.test(low)) { etapa = "nome"; await botSay("Qual o nome correto?"); }
    else { await botSay("Escolhe aqui embaixo 🙂", ["Serviço", "Dia", "Horário", "Nome"]); }
    return;
  }
}

async function salvar() {
  await botSay("Agendando… ⏳");
  const s = servicoPorId(state.servico);
  const payload = {
    nome: state.nome, telefone: state.telefone,
    servico: s.nome, valor: s.preco,
    data: state.dataISO, horario: state.horario,
    status: "Agendado", observacoes: "",
  };
  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.from(CONFIG.tabela).insert([payload]);
      if (error) throw error;
    } else {
      saveDemo(payload);
    }
    etapa = "fim";
    addMsg(`Agendado! ✅<br><div class="summary"><div><span>Serviço</span><strong>${esc(s.nome)} • ${reais(s.preco)}</strong></div><div><span>Dia</span><strong>${esc(dataBonita(state.dataISO))}</strong></div><div><span>Hora</span><strong>${esc(state.horario)}</strong></div></div><br>Te espero! Qualquer coisa me chama aqui 💛`, "bot", true);
    setQuick(["🔄 Novo agendamento"]);
  } catch (e) {
    addMsg(`Não consegui salvar agora: ${esc(e.message || "erro")}. Tenta de novo?`, "bot");
    setQuick(["🔁 Tentar de novo"]);
  }
}

function restart() {
  state.servico = null; state.nome = ""; state.telefone = ""; state.dataISO = ""; state.horario = "";
  els.messages.innerHTML = "";
  inicio();
}

// ---------- eventos ----------
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const v = els.input.value;
  if (/^🔄|^🔁/.test(v)) { restart(); return; }
  tratar(v);
});
document.getElementById("btn-restart").addEventListener("click", restart);
document.querySelectorAll(".service-card").forEach((c) => {
  c.addEventListener("click", () => { els.input.value = c.dataset.service === "henna" ? "Henna" : "Limpeza"; els.form.requestSubmit(); });
});

document.addEventListener("DOMContentLoaded", inicio);
