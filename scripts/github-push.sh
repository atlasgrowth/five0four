#!/bin/bash

# GitHub Push Script
# This script facilitates pushing code to GitHub from a Replit project

# Instructions:
# 1. Make sure a GITHUB_TOKEN secret is set in your Replit project
# 2. Run this script from the root of your project with: bash scripts/github-push.sh "Your commit message"

# Check if commit message was provided
if [ -z "$1" ]; then
  echo "ERROR: Please provide a commit message."
  echo "Usage: bash scripts/github-push.sh \"Your commit message\""
  exit 1
fi

# GitHub repository details
# Change these variables if your repository changes
GITHUB_USER="atlasgrowth"
REPO_NAME="five0four"
COMMIT_MESSAGE="$1"
BRANCH="main"  # Change this if you want to push to a different branch

# Configure Git with GitHub token for authentication
git config --global user.email "noreply@replit.com"
git config --global user.name "Replit User"

# Check if we're in a git repository, if not initialize one
if [ ! -d ".git" ]; then
  echo "Initializing Git repository..."
  git init
  git branch -M $BRANCH
  git remote add origin https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git
else
  # Check if the remote origin exists, if not add it
  if ! git remote | grep -q "^origin$"; then
    echo "Adding GitHub remote..."
    git remote add origin https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git
  else
    # Update the remote URL with the token
    echo "Updating remote URL with token..."
    git remote set-url origin https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git
  fi
fi

# Stage all changes
echo "Staging changes..."
git add .

# Commit with provided message
echo "Committing changes with message: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE"

# Push to GitHub
echo "Pushing to GitHub repository: $GITHUB_USER/$REPO_NAME branch: $BRANCH"
git push -u origin $BRANCH

echo "Complete! Your code has been pushed to GitHub."
echo "View your repository at: https://github.com/$GITHUB_USER/$REPO_NAME"