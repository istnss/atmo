# Atmô

> Plataforma para conectar pessoas através de atividades presenciais em pequenos grupos, criando oportunidades de interação e novas conexões em uma cidade.

## Sobre o projeto

O **Atmô** é uma plataforma que busca facilitar a criação de conexões entre pessoas, principalmente aquelas que chegaram recentemente a uma cidade ou querem conhecer novas pessoas através de experiências presenciais.

A proposta é permitir que usuários encontrem e participem de **atividades em pequenos grupos**, organizadas por pessoas da própria comunidade.

As atividades podem ser gratuitas ou pagas e possuem informações como local, endereço, categoria, duração, número de vagas e responsável pela atividade.

---

## Tecnologias

* Next.js
* React
* TypeScript
* Tailwind CSS
* PostgreSQL

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


## Executando o projeto

Instale as dependências:

```bash
npm install
```

Execute o servidor de desenvolvimento:

```bash
npm run dev
```

---


## Licença

Projeto em desenvolvimento.
