

git merge upstream/main --allow-unrelated-histories
git push --set-upstream upstream main

git remote add upstream https://github.com/hozt/hozt-astro
git pull upstream main

git remote remove upstream
git remote set-url upstream git@github.com:hozt/hozt-astro.git
git fetch --all


git remote add upstream git@github.com:hozt/hozt-astro.git


cp ../hozt-astro/tailwind.config.js ./
cp ../hozt-live/.env ./
cp ../hozt-live/.gitignore ./
cp -a ../hozt-astro/src/componentsSite ./src/
cp -a ../hozt-astro/src/styles/* ./src/styles/
cp -a ../hozt-astro/src/componentsSite ./src


git remote set-url origin git@github.com:hozt/hozt-astro.git
git pull upstream main
git merge upstream/main --allow-unrelated-histories

npx @astrojs/upgrade

TZ=UTC npm run dev

## Astro 6 Notes

`@astrojs/tailwind` does not support Astro 6. Tailwind CSS is configured directly via PostCSS (`postcss.config.js`).
The `@tailwind base`, `@tailwind components`, and `@tailwind utilities` directives are imported in `src/styles/style.scss`.

`astro-pagefind` has not declared Astro 6 support yet. Install with:

```
npm install --legacy-peer-deps
```
