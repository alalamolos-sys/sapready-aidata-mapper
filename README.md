# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/a517fea5-b8b5-4d4f-83b0-9b8a3e1d12ac

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a517fea5-b8b5-4d4f-83b0-9b8a3e1d12ac) and start prompting.

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

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Preview the SAP Mapping Tool locally

The project includes the **SAP Mapping Tool** page that lets you upload finance CSV
extracts, inspect the detected SAP object, review data-quality warnings, and
export LTMC-ready CSV bundles. To preview it in your browser:

1. Install dependencies (skip this step if you already ran `npm i`).

   ```sh
   npm install
   ```

2. Start the Vite development server and expose it on all interfaces so you can
   open it from a forwarded port.

   ```sh
   npm run dev -- --host 0.0.0.0 --port 5173
   ```

3. Open the forwarded port (usually `5173`) in your browser. You should see the
   Lovable UI with a navigation entry labelled **SAP Mapping Tool**. Use that
   section to upload your CSV files and inspect the results produced by
   `sapreadyCore`.

While the dev server is running, any changes you make to the UI or the
`sapreadyCore` logic will hot-reload in the browser so you can iterate quickly.

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

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a517fea5-b8b5-4d4f-83b0-9b8a3e1d12ac) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
