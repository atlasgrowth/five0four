# GitHub Repository Instructions

## Repository Information
- **Repository URL**: https://github.com/atlasgrowth/five0four
- **Username**: atlasgrowth
- **Repository Name**: five0four

## How to Push Code to GitHub

### Prerequisites
1. Ensure you have a GitHub Personal Access Token stored as a `GITHUB_TOKEN` secret in your Replit project.
2. Make sure you have the necessary permissions for the GitHub repository.

### Method 1: Using the Shell Tab in Replit

1. Open the Shell tab in Replit.
2. Run the following commands:

```bash
# Configure Git (only needed once)
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"

# Initialize a repository if it doesn't exist yet
git init
git branch -M main

# Add GitHub as the remote repository
git remote add origin https://${GITHUB_TOKEN}@github.com/atlasgrowth/five0four.git
# OR if the remote already exists, update it:
git remote set-url origin https://${GITHUB_TOKEN}@github.com/atlasgrowth/five0four.git

# Stage all changes
git add .

# Commit with a message
git commit -m "Your commit message"

# Push to GitHub
git push -u origin main
```

### Method 2: Using Replit's Version Control UI

1. Click on the "Version Control" tab in the sidebar (Git icon).
2. Connect your GitHub account if not already connected.
3. Select the repository "atlasgrowth/five0four".
4. Stage your changes by clicking the + icon next to the files.
5. Add a commit message.
6. Click "Commit & Push".

## Troubleshooting

If you encounter issues with authentication:

1. Check that your `GITHUB_TOKEN` secret is valid and has not expired.
2. Ensure you have the correct permissions for the repository.
3. Try regenerating your GitHub token and updating the secret in Replit.

For permission errors when pushing:
1. Make sure you're a collaborator on the repository or the repository owner.
2. Check that your token has the necessary scopes (repo, workflow, etc.).

## Additional Resources

- [GitHub Documentation on Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Replit Documentation on Secrets](https://docs.replit.com/programming-ide/storing-sensitive-information-environment-variables)