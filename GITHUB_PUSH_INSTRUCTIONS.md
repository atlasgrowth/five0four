# GitHub Push Instructions

To push your code to GitHub from Replit, please follow these steps:

## Setup (Only Once)

1. **Configure Git username and email**
   ```bash
   git config --global user.email "your-email@example.com"
   git config --global user.name "Your Name"
   ```

2. **Generate a GitHub Personal Access Token**
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token
   - Grant it 'repo' permissions
   - Copy the token

3. **Save your GitHub token as a secret in Replit**
   - Click on "Secrets" in the Tools panel
   - Add a new secret named `GITHUB_TOKEN` with your token as the value

## Pushing Code to GitHub

1. **Open the Replit Shell**
   - Click on "Shell" in the Tools panel

2. **Initialize Git repository (if not already done)**
   ```bash
   git init
   git branch -M main
   ```

3. **Set remote repository**
   ```bash
   git remote add origin https://$GITHUB_TOKEN@github.com/atlasgrowth/five0four.git
   ```
   If you get an error that the remote already exists, use:
   ```bash
   git remote set-url origin https://$GITHUB_TOKEN@github.com/atlasgrowth/five0four.git
   ```

4. **Stage your changes**
   ```bash
   git add .
   ```

5. **Commit your changes**
   ```bash
   git commit -m "Your commit message here"
   ```

6. **Push to GitHub**
   ```bash
   git push -u origin main
   ```

## Troubleshooting

If you encounter lock file errors:
```bash
rm -f .git/index.lock .git/config.lock
```

If you need to verify your remote is set correctly:
```bash
git remote -v
```

If you encounter authentication issues, ensure your GITHUB_TOKEN secret is set correctly in the Replit Secrets panel.

## Repository Details

- **GitHub Repository**: https://github.com/atlasgrowth/five0four
- **Default Branch**: main