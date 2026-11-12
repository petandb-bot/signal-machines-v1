# Put it on GitHub

1. Unzip the source bundle. Open the `signal-machines` folder in a terminal.
2. Create an empty GitHub repository. Do not initialize it with another README.
3. Replace `YOUR-NAME` below with your GitHub username, then run:

```sh
git init
git add .
git commit -m "Release Signal Machines"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/signal-machines.git
git push -u origin main
```

4. In the repository, set **Settings → Pages → Source → GitHub Actions**.
5. Open **Actions → Build and deploy Signal Machines → Run workflow**. After it succeeds, open the URL shown by the `github-pages` deployment.

Future pushes to `main` update the app. Use a public repository if you want people to browse the code and play on public GitHub Pages.

The bundle includes source, icons, fonts, presets, tests and the workflow. It contains no Git history, installed dependencies or account-specific hosting configuration. `npm ci` installs the locked dependencies; `npm run build` produces the site.

Suggested repository description:

> A tiny modular playground for sound, chance and happy accidents. Connect little machines. Make strange sounds.
