# Deployment

This project is set up for GitHub Actions data updates and AWS Amplify Hosting deployments.

## Monthly data update

`.github/workflows/update-university-data.yml` runs on the first day of every month at `10:00 UTC`, and can also be run manually from GitHub Actions.

The workflow:

1. Installs Node dependencies with `npm ci`.
2. Runs `npm run update:data`.
3. Runs `npm run audit:data`.
4. Builds the app with `npm run build`.
5. Commits changed `data/*.json` files back to the branch.

`scripts/update-university-data.mjs` currently refreshes CWUR ranking data, validates the local catalog JSON, and writes `data/update-report.json`.

`scripts/audit-program-data.mjs` checks whether program links are reachable, collects deadline-related evidence from public program and admission pages, and writes `data/program-audit-report.json`. Deadline evidence is for review and is not automatically written to `data/application-windows.json`.

## Amplify Hosting

Connect the GitHub repository branch in AWS Amplify Hosting. Amplify will use the root `amplify.yml` file:

1. `npm ci`
2. `npm run build`
3. Deploy `.next`

Set `NEXT_PUBLIC_SITE_URL` in Amplify branch environment variables if the production domain changes.

## Local checks

Run these before pushing deployment changes:

```bash
npm run update:data
npm run audit:data
npm run build
npm run lint
```
