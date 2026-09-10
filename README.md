# App Agendamento — Sobrancelhas

Atendente virtual para studio de sobrancelhas. A cliente conversa pelo chat, vê horários livres e agenda, com respostas curtas e diretas, como no WhatsApp.

## Serviços

- Limpeza — R$ 20 (~30min)
- Henna — R$ 30 (~60min)

## Stack

- Backend: Supabase (tabela `agendamentos` — ver `supabase_agendamentos.sql`)
- IA: Groq via Edge Function (opcional — o fluxo funciona sem IA)
- Interface: HTML, CSS e JavaScript puro
- Publicação: Cloudflare Pages

## Configurar

1. Edite `config.js`: nome do studio, WhatsApp, dias/horários.
2. (Opcional) Rode `supabase_agendamentos.sql` no Supabase e preencha `supabaseUrl` + `supabaseAnonKey` no `config.js`. Sem isso, roda em modo demonstração (localStorage).
3. Publique no Cloudflare Pages apontando para esta pasta.
