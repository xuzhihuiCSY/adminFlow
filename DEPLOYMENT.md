# Deployment

This project is set up for GitHub Actions data updates and AWS Amplify Hosting deployments.

## Monthly data update

`.github/workflows/update-university-data.yml` runs on the first day of every month at `10:00 UTC`, and can also be run manually from GitHub Actions.

The workflow:

1. Installs Python dependencies with `pip install -r requirements.txt`.
2. Runs `python scripts/update_university_data.py`.
3. Runs `python scripts/audit_program_data.py`.
4. Commits changed `data/*.json` files back to the branch.

Amplify handles the Next.js build after the data commit reaches the connected branch.

`scripts/update_university_data.py` currently refreshes CWUR ranking data, validates the local catalog JSON, and writes `data/update-report.json`.

`scripts/audit_program_data.py` checks whether program links are reachable, collects deadline-related evidence from public program and admission pages, and writes `data/program-audit-report.json`. Deadline evidence is for review and is not automatically written to `data/application-windows.json`.

## Amplify Hosting

Connect the GitHub repository branch in AWS Amplify Hosting. Amplify will use the root `amplify.yml` file:

1. `npm ci`
2. `npm run build`
3. Deploy `.next`

Set `NEXT_PUBLIC_SITE_URL` in Amplify branch environment variables if the production domain changes.

## Local checks

Run these before pushing deployment changes:

```bash
pip install -r requirements.txt
npm run update:data
npm run audit:data
npm run lint
```
