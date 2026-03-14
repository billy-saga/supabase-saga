# Supabase Log Retention Setup

Este repositório contém a infraestrutura e os scripts para gerenciar a retenção de logs (`log_excerpts_parent`) no Supabase. O banco de dados foi particionado por meses para facilitar a performance, e uma GitHub Action limpa registros antigos (mais de 90 dias) diariamente.

## Passos para uso e teste manual

1. **Configuração Supabase**:
   Vá em **Project → SQL Editor → New query**, cole e execute o conteúdo de `sql/create_log_excerpts.sql`.

   Para evitar erros de inserção, crie partições para os últimos 12 meses:
   ```sql
   DO $$
   DECLARE
     i int;
     y int;
     m int;
     d date := date_trunc('month', now())::date;
   BEGIN
     FOR i IN 0..11 LOOP
       y := EXTRACT(YEAR FROM (d - (i * interval '1 month')))::int;
       m := EXTRACT(MONTH FROM (d - (i * interval '1 month')))::int;
       PERFORM public.create_month_partition(y, m);
     END LOOP;
   END;
   $$;
   ```

2. **Teste no Supabase (Opcional)**:
   Insira uma linha antiga:
   ```sql
   INSERT INTO log_excerpts_parent (source, source_id, level, message_excerpt, ts)
   VALUES ('test', NULL, 'error', 'registro-teste-antigo', now() - interval '120 days');
   ```
   Rode a limpeza manualmente para verificar:
   ```sql
   SELECT public.clean_old_log_excerpts(100, 90);
   ```

3. **Verificação do Bot no GitHub**:
   - Assegure-se de que os **Secrets** `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão presentes no repositório.
   - Vá na aba **Actions**, selecione a workflow "Supabase Log Retention Cleanup" e dispare o Workflow manualmente clicando em **Run workflow**. Verifique os logs resultantes.
