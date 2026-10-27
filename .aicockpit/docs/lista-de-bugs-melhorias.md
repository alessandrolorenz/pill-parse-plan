web:
- [x] ao selecionar uma dose que foi tomada a pagina recarrega para atualizar os componentes do front, mas isso faz com que a pagina scrolle para o topo e é necessario scrollar de volta para onde estava para poder selecionar a proxima dose, e isso acontece de novo dai, de ir ao topo e precisar voltar. Isso é um problema de usabe=ilidade que precisamos resolver.
  - Resolvido: atualização otimista em `SupabaseScheduleView`, sem recarregar a lista.
- [x] ao concluir todas as doses, nao existe uma opção para arquivar, passar para inativo ou deletar o tratamento
  - Resolvido: banner "Todas as doses foram concluídas" com botão Arquivar.
- [x] nao tem opção de arquivar ou deletar o tratamento
  - Resolvido: botões Arquivar/Reativar e Excluir (com confirmação) na agenda do tratamento.
- [x] quando nao tem a data definida ele coloca 0 dias ou nao coloca e nao gera as dose, gera o tratamento, mas nao as doses
  - Resolvido: o review destaca duração/frequência faltando e só libera a agenda depois de preenchidas (ou "uso contínuo", 30 dias). Um tratamento sem doses não é mais criado.

mobile:
- [x] ao entrar em um tratamento e ir concluindo os passos, se retornar a tela anterior o progresso não é atualizado no progress bar, só atualiza se sair do app e voltar.
  - Resolvido: a home recarrega ao voltar ao foco (`useFocusEffect`).
- [x] o icone esta só com um verde chapado sem um icone mesmo.
  - Resolvido: ícones gerados a partir de `public/pill-icon.svg` (fontes em `apps/mobile/assets/source/`). Aparece a partir do próximo build nativo.
- [x] ao concluir todas as doses, nao existe uma opção para arquivar, passar para inativo ou deletar o tratamento
  - Resolvido: banner de conclusão com botão Arquivar.
- [x] nao tem opção de arquivar ou deletar o tratamento
  - Resolvido: botões Arquivar/Reativar e Excluir; as notificações do tratamento são canceladas.
- [x] quando nao tem a data definida ele coloca 0 dias ou nao coloca e nao gera as dose, gera o tratamento, mas nao as doses
  - Resolvido: mesma regra da web no review.

extra:
- [x] horários das doses gravados em UTC (dose das 08:00 aparecia como 11:00)
  - Resolvido para novos tratamentos com `toEventRow`. Dados antigos: `supabase/manual/events_utc_to_local_1_preview.sql` e `_2_apply.sql` (rodar no SQL Editor depois que a correção estiver no ar).
