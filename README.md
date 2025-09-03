# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7d524653-ac03-442c-ad32-403b69e82e98

## ⚠️ Configuração Obrigatória

Este projeto requer uma chave da OpenAI API para funcionar. Siga estes passos:

### 1. Configurar variáveis de ambiente

```sh
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env e adicione sua chave da OpenAI
# OPENAI_API_KEY=sk-sua-chave-aqui
```

### 2. Obter chave da OpenAI

1. Acesse [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Faça login ou crie uma conta
3. Clique em "Create new secret key"
4. Copie a chave gerada
5. Cole no arquivo `.env`

### 3. Executar o projeto

```sh
# Instalar dependências
npm install

# Executar servidor API + frontend (recomendado)
npm run dev:full

# OU executar separadamente:
# Terminal 1: npm run server
# Terminal 2: npm run dev
```

### 4. Verificar configuração

- Acesse http://localhost:8080
- Clique no ícone de configurações (⚙️) no canto superior direito
- Verifique se aparece "✓ Configurada" para OpenAI API

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7d524653-ac03-442c-ad32-403b69e82e98) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Configure environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Step 5: Start both API server and frontend
npm run dev:full
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Express.js (API server)
- OpenAI API (image analysis)

## Security Features

- ✅ OpenAI API key nunca exposta ao cliente
- ✅ Todas as chamadas à OpenAI via proxy server-side
- ✅ Chaves armazenadas apenas em variáveis de ambiente
- ✅ Validação de entrada no servidor
- ✅ Tratamento de erros robusto

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7d524653-ac03-442c-ad32-403b69e82e98) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
