-- App Agendamento — Sobrancelhas: tabela de agendamentos do chatbot

create table if not exists public.agendamentos (
  id bigint generated always as identity primary key,
  nome text not null,
  telefone text not null,
  servico text not null,
  valor numeric not null default 20,
  data text not null,
  horario text not null,
  status text not null default 'Agendado',
  observacoes text not null default '',
  criado_em timestamptz not null default now()
);

alter table public.agendamentos enable row level security;

drop policy if exists "agendamentos select publico" on public.agendamentos;
drop policy if exists "agendamentos insert publico" on public.agendamentos;

-- Leitura pública: o chatbot consulta horários ocupados
create policy "agendamentos select publico"
on public.agendamentos for select
to anon
using (true);

-- Insert público: a cliente agenda sem login
create policy "agendamentos insert publico"
on public.agendamentos for insert
to anon
with check (true);
