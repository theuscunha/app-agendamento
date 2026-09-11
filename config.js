/* ==========================================================================
   App Agendamento — Sobrancelhas | Configuração do studio
   Edite aqui: nome, WhatsApp, horários, serviços e Supabase/Groq.
   ========================================================================== */

const CONFIG = {
  studioNome: "Maria Souza",
  atendenteNome: "Atendente virtual",

  // WhatsApp da profissional (só números, com DDI+DDD). Ex.: "5511999998888"
  whatsappProfissional: "",

  // Horários por dia da semana: 0=Dom, 1=Seg, ..., 6=Sáb
  // Seg–Sex: depois das 16:30 | Sáb e Dom: dia inteiro
  // Para mudar o fim do expediente, ajuste o "fim" de cada dia.
  horariosPorDia: {
    0: { inicio: "08:00", fim: "18:00" }, // Domingo
    1: { inicio: "16:30", fim: "20:00" }, // Segunda
    2: { inicio: "16:30", fim: "20:00" }, // Terça
    3: { inicio: "16:30", fim: "20:00" }, // Quarta
    4: { inicio: "16:30", fim: "20:00" }, // Quinta
    5: { inicio: "16:30", fim: "20:00" }, // Sexta
    6: { inicio: "08:00", fim: "18:00" }, // Sábado
  },

  servicos: [
    { id: "limpeza", nome: "Limpeza", preco: 20, duracaoMin: 40 },
    { id: "henna", nome: "Henna", preco: 30, duracaoMin: 40 },
  ],

  // Supabase — projeto "App Agendamento" (tabela criada via
  // supabase_agendamentos.sql). Chave anon é pública e protegida por RLS.
  supabaseUrl: "https://xxzlhkbkwopxboczzpyg.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4emxoa2Jrd29weGJvY3p6cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNzgxMTUsImV4cCI6MjEwNDY1NDExNX0.z_VKyez7YrqWxAIZkYyyrOxnHgzCyyWTd9J8DoB3lTQ",
  tabela: "agendamentos",

  // IA Groq via Edge Function do Supabase (opcional — o fluxo funciona
  // sem IA, com botões e texto livre simples).
  // Ex.: "https://SEU-PROJETO.supabase.co/functions/v1/chatbot-ai"
  edgeFunctionUrl: "",
  groqModel: "openai/gpt-oss-20b",
};
