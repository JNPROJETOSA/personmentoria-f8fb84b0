# Instruções de Migração de Usuários

## Usuários a Migrar
1. mmilenaggomes@gmail.com (Estudante)
2. famulape@gmail.com (Admin)
3. jotajoao29@gmail.com (Admin)
4. joaovilelaestudos@gmail.com (Estudante)

## Processo de Migração

### Passo 1: Preparar Novo Projeto ✅
**Já executado:**
- ✅ Projeto configurado: `jibsgrfzrkviffcignsm`
- ✅ Tabelas criadas
- ✅ Políticas de segurança configuradas

### Passo 2: Adicionar Usuários à Whitelist
**Execute no SQL Editor do NOVO projeto:**
```sql
-- Arquivo: migrate_users_step1_whitelist.sql
```
Isso permite que esses 4 usuários se cadastrem no novo sistema.

### Passo 3: Exportar Dados do Projeto Antigo (Opcional)
**Execute no SQL Editor do ANTIGO projeto:**
```sql
-- Arquivo: migrate_users_step2_export.sql
```
Copie os resultados para referência futura.

### Passo 4: Cadastro dos Usuários no Novo Sistema

**Opção A - Você cadastra por eles:**
1. Acesse `http://localhost:8080`
2. Para cada usuário:
   - Clique em "Cadastrar-se"
   - Use o email do usuário
   - Crie uma senha temporária
   - Envie a senha para o usuário

**Opção B - Eles se cadastram:**
1. Envie para cada usuário:
   ```
   Olá! Estamos migrando para um novo sistema.
   
   Por favor, acesse: http://localhost:8080
   Clique em "Cadastrar-se"
   Use seu email: [email do usuário]
   Crie uma nova senha
   
   Seu perfil e dados serão restaurados automaticamente.
   ```

### Passo 5: Verificação
Após cada usuário se cadastrar:
1. Faça login como admin
2. Vá na aba "Administrador"
3. Verifique se o usuário aparece na lista
4. Confirme que a role está correta (admin ou student)

## Status Atual

- [ ] Script de whitelist executado no novo projeto
- [ ] Dados exportados do projeto antigo (opcional)
- [ ] mmilenaggomes@gmail.com cadastrado
- [ ] famulape@gmail.com cadastrado
- [ ] jotajoao29@gmail.com cadastrado
- [ ] joaovilelaestudos@gmail.com cadastrado

## Notas Importantes

⚠️ **Senhas NÃO podem ser migradas** - Cada usuário precisa criar nova senha

✅ **Roles serão atribuídas automaticamente** - Baseado na whitelist

✅ **Dados podem ser importados depois** - Se você exportou do projeto antigo

## Próximos Passos

1. Execute `migrate_users_step1_whitelist.sql` no NOVO projeto
2. Decida se vai cadastrar você mesmo ou pedir para os usuários se cadastrarem
3. Após todos se cadastrarem, verifique no painel admin
