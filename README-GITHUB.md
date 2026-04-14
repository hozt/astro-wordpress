mkdir -p .github/workflows && cat > .github/workflows/trigger-deploy.yml << 'EOF'
name: Trigger Cloudflare Pages Deploy

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.DEPLOY_PAT }}
      - name: Push empty commit
        run: |
          git config user.email "deploy-bot@hozt.com"
          git config user.name "Deploy Bot"
          git commit --allow-empty -m "chore: trigger deploy"
          git push
EOF
gh secret set DEPLOY_PAT --repo hozt/reponame-here
git add .github/workflows/trigger-deploy.yml && git commit -m "chore: add deploy trigger workflow" && git push
