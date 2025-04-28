#!/bin/bash

# GitHub Commands Helper Script
# This script displays the commands you need to run to push to GitHub
# Usage: bash scripts/github-commands.sh "Your commit message"

# Repository details
GITHUB_USER="atlasgrowth"
REPO_NAME="five0four"
BRANCH="main"

# Check if commit message was provided
if [ -z "$1" ]; then
  COMMIT_MESSAGE="Update from Replit"
else
  COMMIT_MESSAGE="$1"
fi

echo "============================================================="
echo "Copy and paste these commands to push your code to GitHub:"
echo "============================================================="
echo ""
echo "# Configure Git (only needed once)"
echo "git config --global user.email \"your-email@example.com\""
echo "git config --global user.name \"Your Name\""
echo ""
echo "# Initialize repository if needed"
echo "git init"
echo "git branch -M $BRANCH"
echo ""
echo "# Add or update remote repository"
echo "git remote add origin https://\${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
echo "# OR if remote already exists:"
echo "git remote set-url origin https://\${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
echo ""
echo "# Stage all changes"
echo "git add ."
echo ""
echo "# Commit changes"
echo "git commit -m \"$COMMIT_MESSAGE\""
echo ""
echo "# Push to GitHub"
echo "git push -u origin $BRANCH"
echo ""
echo "============================================================="
echo "Remember to replace \${GITHUB_TOKEN} with your actual GitHub token"
echo "if it's not set as an environment variable."
echo "============================================================="