/* ==========================================================================
   App Agendamento — Sobrancelhas | Configuração do studio
   Edite aqui: nome, WhatsApp, horários, serviços e Supabase/Groq.
   ========================================================================== */

const CONFIG = {
  // >>> TROQUE AQUI: nome do studio / profissional <<<
  studioNome: "Studio de Sobrancelhas",
  atendenteNome: "Atendente virtual",

  // WhatsApp da profissional (só números, com DDI+DDD). Ex.: "5511999998888"
  whatsappProfissional: "",

  // Horário de atendimento (padrão: Seg a Sáb, 9h às 18h)
  // diasAtendimento: 0=Dom, 1=Seg, ..., 6=Sáb
  horaInicio: 9,
  horaFim: 18,
  diasAtendimento: [1, 2, 3, 4, 5, 6],

  servicos: [
    { id: "limpeza", nome: "Limpeza", preco: 20, duracaoMin: 30 },
    { id: "henna", nome: "Henna", preco: 30, duracaoMin: 60 },
  ],

  // Supabase (opcional — sem preencher, o app roda em modo demonstração
  // salvando no navegador). Para ativar o banco, crie a tabela com o
  // arquivo supabase_agendamentos.sql e preencha abaixo:
  supabaseUrl: "",
  supabaseAnonKey: "",
  tabela: "agendamentos",

  // IA Groq via Edge Function do Supabase (opcional — o fluxo funciona
  // sem IA, com botões e texto livre simples).
  // Ex.: "https://SEU-PROJETO.supabase.co/functions/v1/chatbot-ai"
  edgeFunctionUrl: "",
  groqModel: "openai/gpt-oss-20b",
};
