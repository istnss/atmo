Sim. Como o Atmô já passou da fase de ideia e já temos **Next.js + Supabase + autenticação + banco + RLS + estrutura inicial**, vale criar um README que documente o estado atual sem fingir que as partes ainda não implementadas estão prontas.

Eu faria assim:

# Atmô

> Plataforma para conectar pessoas através de atividades presenciais em pequenos grupos, criando oportunidades de interação e novas conexões em uma cidade.

## Sobre o projeto

O **Atmô** é uma plataforma que busca facilitar a criação de conexões entre pessoas, principalmente aquelas que chegaram recentemente a uma cidade ou querem conhecer novas pessoas através de experiências presenciais.

A proposta é permitir que usuários encontrem e participem de **atividades em pequenos grupos**, organizadas por pessoas da própria comunidade.

As atividades podem ser gratuitas ou pagas e possuem informações como local, endereço, categoria, duração, número de vagas e responsável pela atividade.

---

## Objetivo do MVP

O objetivo inicial é validar o modelo da plataforma com um fluxo simples:

1. Usuário cria uma conta.
2. Usuário acessa a plataforma.
3. Usuário visualiza atividades disponíveis.
4. Usuário pode se inscrever em uma atividade.
5. Usuário pode cancelar sua inscrição.
6. Usuário pode criar uma atividade, quando possuir permissão para isso.
7. Participantes recebem as informações necessárias para comparecer à atividade.

---

## Status atual

### Fundação

* [x] Projeto Next.js criado
* [x] TypeScript configurado
* [x] Tailwind CSS configurado
* [x] Projeto Supabase criado
* [x] Variáveis de ambiente configuradas
* [x] Supabase Client configurado
* [x] Next.js conectado ao Supabase

### Autenticação

* [x] Página de cadastro
* [x] Página de login
* [x] Cadastro utilizando Supabase Auth
* [x] Login utilizando Supabase Auth
* [x] Criação automática do perfil após cadastro
* [x] Trigger para criação de perfil
* [x] Nome do usuário enviado durante o cadastro
* [x] Testes de cadastro e login realizados

### Banco de dados

Estrutura inicial do banco criada para suportar:

* `profiles`
* `activities`
* inscrições/participações
* histórico do usuário
* presença nas atividades

A tabela `profiles` está vinculada ao usuário autenticado através do `auth.users` do Supabase.

### Segurança

* [x] Row Level Security (RLS) configurado nas tabelas necessárias
* [x] Policies para controle de acesso aos perfis
* [x] Estrutura de policies para controle das atividades e participação
* [x] Regras para impedir alterações indevidas por usuários comuns

---

## Funcionalidades previstas

### Usuário

* Cadastro
* Login
* Logout
* Perfil
* Visualização de atividades
* Inscrição em atividades
* Cancelamento de inscrição
* Visualização das atividades das quais participa

### Organizador

* Criar atividades
* Editar atividades
* Gerenciar vagas
* Visualizar participantes
* Marcar presença

### Atividade

Cada atividade deverá possuir, inicialmente:

* Título
* Descrição
* Categoria
* Local
* Endereço
* Data
* Horário
* Duração
* Número máximo de participantes
* Valor
* Organizador
* Status
* Informações sobre recorrência
* Imagens, quando aplicável

---

## Categorias iniciais

As categorias previstas para o MVP são:

* **Manuais & Reparos**
* **Artística & Criativa**
* **Intelectuais & Leitura**
* **Jogos**
* **Atividade Física**

---

## Regras definidas para o MVP

* Atividades podem ser **gratuitas ou pagas**.
* É necessário possuir cadastro para participar.
* O participante pode cancelar sua inscrição.
* Atividades podem possuir limite de vagas.
* O endereço será público antes da confirmação da participação.
* O organizador será exibido.
* Atividades poderão possuir fotos.
* A confirmação da participação poderá utilizar e-mail.
* Sistema de reputação não fará parte da primeira versão do MVP.

---

## Tecnologias

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend / BaaS

* Supabase
* PostgreSQL
* Supabase Auth
* Row Level Security (RLS)
* Database Triggers

### Desenvolvimento

* Git
* GitHub
* VS Code

---

## Estrutura atual

```text
atmo/
├── app/
│   ├── atividades/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── editar/
│   │           └── page.tsx
│   ├── cadastro/
│   │   └── page.tsx
│   ├── categorias/
│   │   └── page.tsx
│   ├── criar-atividade/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── minhas-atividades/
│   │   └── page.tsx
│   ├── perfil/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── lib/
│   └── supabase/
│       └── client.ts
│
├── public/
│
├── .env.local
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

> A estrutura será expandida conforme as funcionalidades do MVP forem implementadas.

---

## Banco de dados

### `profiles`

Armazena as informações públicas do usuário.

Campos principais:

* `id`
* `name`
* `avatar_url`
* `bio`
* `can_create_activity`
* `created_at`

O campo `id` está relacionado ao usuário existente no Supabase Auth.

### `activities`

Responsável pelo armazenamento das atividades criadas na plataforma.

A estrutura contempla informações relacionadas à atividade, organizador, localização, vagas, data e status.

### Participação

A estrutura de participação será utilizada para controlar:

* inscrições;
* cancelamentos;
* participantes;
* presença;
* relacionamento entre usuário e atividade.

---

## Autenticação

A autenticação é realizada utilizando o **Supabase Auth**.

Fluxo atual:

```text
Cadastro
   ↓
Supabase Auth
   ↓
auth.users
   ↓
Database Trigger
   ↓
public.profiles
```

O cadastro envia o nome do usuário através dos metadados do Supabase Auth e o trigger utiliza essa informação para criar o respectivo perfil.

---

## Próximos passos

### Sprint 2 — Banco

* [x] Criar `profiles`
* [x] Finalizar `activities`
* [x] Finalizar tabela de categorias
* [x] Finalizar tabela de inscrições
* [ ] Finalizar tabela de presença
* [x] Revisar todas as policies RLS
* [x] Criar relacionamentos e constraints

### Sprint 3 — Autenticação e sessão

* [x] Cadastro
* [x] Login
* [x] Logout
* [x] Persistência de sessão
* [x] Proteção de rotas
* [x] Redirecionamento de usuário autenticado
* [x] Controle de acesso para criação de atividades

### Sprint 4 — Atividades

* [x] Listagem de atividades
* [x] Página de detalhes
* [x] Criar atividade
* [x] Editar atividade
* [x] Cancelar atividade
* [x] Controle de vagas
* [x] Status da atividade

### Sprint 5 — Participantes

* [x] Inscrição
* [x] Cancelamento de inscrição
* [x] Lista de participantes (visualização da contagem e vagas disponíveis)
* [x] Controle de vagas
* [ ] Registro de presença
* [ ] Histórico do usuário

### Sprint 6 — Experiência do usuário

* [x] Perfil
* [x] Categorias (página dedicada `/categorias` e seleção na criação)
* [ ] Busca
* [ ] Filtros
* [ ] Melhorias de responsividade
* [x] Estados de carregamento
* [x] Mensagens de erro e sucesso

---

## Variáveis de ambiente

O projeto utiliza variáveis de ambiente para conexão com o Supabase.

Criar um arquivo:

```text
.env.local
```

Com as variáveis necessárias:

```env
NEXT_PUBLIC_SUPABASE_URL=seu_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_supabase_publishable_key
```

As credenciais reais **não devem ser versionadas no Git**.

---

## Executando o projeto

Instale as dependências:

```bash
npm install
```

Execute o servidor de desenvolvimento:

```bash
npm run dev
```

O projeto estará disponível em:

```text
http://localhost:3000
```

---

## Desenvolvimento

O projeto ainda está em fase de desenvolvimento do MVP.
Funcionalidades marcadas como `[x]` já foram implementadas e testadas.
Funcionalidades marcadas como `[ ]` ainda fazem parte do desenvolvimento planejado.

---

## Licença

Projeto em desenvolvimento.
