# Configuração do Sistema Dr. Remo

## Pré-requisitos

1. **Node.js** (versão 16 ou superior)
2. **Conta no Supabase** (gratuita)

## Configuração do Banco de Dados (Supabase)

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Escolha um nome para o projeto (ex: "dr-remo")
5. Defina uma senha para o banco de dados
6. Selecione uma região próxima ao Brasil
7. Clique em "Create new project"

### 2. Configurar o Banco de Dados

1. No painel do Supabase, vá para **SQL Editor**
2. Copie todo o conteúdo do arquivo `database/schema.sql`
3. Cole no editor SQL e execute (clique em "Run")
4. Aguarde a execução completar

### 3. Obter as Chaves de API

1. No painel do Supabase, vá para **Settings** > **API**
2. Copie as seguintes informações:
   - **URL**: `https://seu-projeto.supabase.co`
   - **anon public**: chave pública (anon key)
   - **service_role**: chave de serviço (service role key)

### 4. Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` com suas informações do Supabase:
   ```env
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_ANON_KEY=sua_chave_anonima_aqui
   SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
   PORT=3000
   NODE_ENV=development
   ```

## Instalação e Execução

### 1. Instalar Dependências

```bash
npm install
```

### 2. Executar o Sistema

**Modo desenvolvimento:**
```bash
npm run dev
```

**Modo produção:**
```bash
npm start
```

### 3. Acessar o Sistema

- **Site principal**: http://localhost:3000
- **Agendamentos**: http://localhost:3000/agendamento
- **Painel Admin**: http://localhost:3000/admin
- **Consulta Paciente**: http://localhost:3000/paciente

## Funcionalidades do Painel Administrativo

### Dashboard
- Estatísticas gerais de agendamentos
- Visão geral do sistema

### Agendamentos
- Lista todos os agendamentos
- Filtrar por data
- Alterar status (Agendado → Feito → Cancelado)

### Dias Bloqueados
- Bloquear dias inteiros (feriados, férias, etc.)
- Remover bloqueios

### Tipos de Atendimento
- Gerenciar tipos de consulta/atendimento
- Adicionar novos tipos
- Remover tipos não utilizados

## Estrutura do Banco de Dados

### Tabelas Principais

1. **service_types**: Tipos de atendimento
2. **appointments**: Agendamentos dos pacientes
3. **blocked_days**: Dias bloqueados para agendamento
4. **blocked_times**: Horários específicos bloqueados

### Status dos Agendamentos

- `scheduled`: Agendado (padrão)
- `done`: Consulta realizada
- `canceled`: Cancelado

## Solução de Problemas

### Erro de Conexão com Banco
1. Verifique se as variáveis no `.env` estão corretas
2. Confirme se o projeto Supabase está ativo
3. Verifique se o schema foi executado corretamente

### Painel Admin não carrega dados
1. Abra o console do navegador (F12)
2. Verifique se há erros de API
3. Confirme se o servidor está rodando
4. Teste a conexão: http://localhost:3000/api/health

### Agendamentos não aparecem
1. Verifique se existem dados na tabela `appointments`
2. Confirme se as políticas RLS estão configuradas
3. Teste diretamente a API: http://localhost:3000/api/appointments

## Comandos Úteis

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Executar em produção
npm start

# Verificar saúde da API
curl http://localhost:3000/api/health
```

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do servidor no terminal
2. Abra o console do navegador para erros frontend
3. Confirme se todas as configurações estão corretas
