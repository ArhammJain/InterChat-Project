<h1 align="center" id="title">InterChat</h1>

<p align="center"><img src="https://socialify.git.ci/ArhammJain/InterChat-Project/image?custom_language=Next.js&amp;font=Raleway&amp;forks=1&amp;issues=1&amp;language=1&amp;name=1&amp;owner=1&amp;pattern=Solid&amp;pulls=1&amp;stargazers=1&amp;theme=Auto" alt="project-image"></p>

<p id="description">A fast modern and fully functional real time chatting app built using Next.js Supabase Realtime and secure JWT authentication. InterChat allows users to sign up search friends start private conversations and exchange messages instantly all with a clean and responsive UI.</p>

<p align="center"><img src="&lt;p align=" left"=""> <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&amp;logo=next.js"> <img src="https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=for-the-badge&amp;logo=supabase&amp;logoColor=white"> <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&amp;logo=node.js"> <img src="https://img.shields.io/badge/Database-PostgreSQL-blue?style=for-the-badge&amp;logo=postgresql"> <img src="https://img.shields.io/badge/Deployment-Vercel-black?style=for-the-badge&amp;logo=vercel"> <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge"></p>

<h2>🚀 Demo</h2>

[https://interchatbyarham.vercel.app/login](https://interchatbyarham.vercel.app/login)

  
  
<h2>🧐 Features</h2>

Here're some of the project's best features:

*   Secure login/signup using JWT + HTTP-only cookies
*   Private one to one conversations with any user
*   Realtime messaging using Supabase Realtime (no refresh)
*   User search system to quickly find and start chats
*   Modern responsive chat UI with message bubbles
*   Auto scroll to latest message and smooth chat experience
*   Auto load conversation list with last message preview
*   Fully optimized for Vercel deployment with safe backend APIs

<h2>🛠️ Installation Steps:</h2>

<p>1. Clone the Repository</p>

```
git clone https://github.com/your-username/your-repo.git
```
```
cd your-repo
```

<p>2. Install Dependencies</p>

```
cd frontend
```
```
npm install
```

<p>3. Set Up Supabase Database ( Copy and Paste this qurie to Supabase SQL Editor )</p>

```
-- Drop old tables if they exist (optional, for fresh setup)
drop table if exists participants cascade;
drop table if exists messages cascade;
drop table if exists conversations cascade;
drop table if exists users cascade;

-- USERS TABLE
create table users (
  id bigserial primary key,
  username text not null unique,
  password_hash text not null,
  avatar text,
  created_at timestamptz default now()
);

-- CONVERSATIONS TABLE
create table conversations (
  id bigserial primary key,
  name text,
  is_group boolean default false,
  created_at timestamptz default now()
);

-- PARTICIPANTS TABLE
create table participants (
  id bigserial primary key,
  conversation_id bigint not null references conversations(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  joined_at timestamptz default now()
);

-- MESSAGES TABLE
create table messages (
  id bigserial primary key,
  conversation_id bigint not null references conversations(id) on delete cascade,
  sender_id bigint references users(id) on delete set null,
  content text,
  type text default 'text',
  created_at timestamptz default now()
);

-- (Recommended) Disable RLS for now
alter table users disable row level security;
alter table conversations disable row level security;
alter table participants disable row level security;
alter table messages disable row level security;

```

<p>4. Enable Realtime</p>

Go to:
Database → Replication → Realtime → Enable on public.messages

<p>5. Create Environment File</p>

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
JWT_SECRET=your_random_secret_key
```

<p>6. Start Development Server</p>

```
npm run dev
```
