# Cloud Run Demo Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the RSVP Reader Docker image to one public, single-instance Cloud Run demo service when verified code reaches `main`.

**Architecture:** GitHub Actions verifies the app, uses GitHub OIDC to impersonate a narrow Google deploy service account, pushes a commit-SHA image to Artifact Registry, and deploys that image to Cloud Run. A local, idempotent bootstrap script creates all Google resources and prints the non-secret GitHub variables.

**Tech Stack:** Node.js 22, Docker, GitHub Actions, Google Artifact Registry, Cloud Run, Workload Identity Federation, gcloud, Bash.

## Global Constraints

- Project ID: `rsvp-reader-personal-demo`; project number: `1016486021065`; region: `us-west1`.
- Artifact Registry repository and Cloud Run service: `rsvp-reader`.
- Cloud Run: `min=1`, `max=1`, concurrency `10`, port `4317`, health path `/health`.
- No database, Firebase, custom domain, DNS changes, or service-account JSON key.
- OIDC must trust only `Aeonia-ai/rta-rsvp-reader` at `refs/heads/main`.
- The unauthenticated `run.app` URL is a short-lived private-demo endpoint.

---

## File Structure

- `scripts/bootstrap-google-cloud.sh`: operator-run Google resource and OIDC bootstrap.
- `.github/workflows/ci.yml`: PR-only verification.
- `.github/workflows/deploy-cloud-run.yml`: verified main/manual Cloud Run delivery.
- `README.md`: bootstrap, GitHub variables, deployment and demo-security instructions.

### Task 1: Create an idempotent Google bootstrap script

**Files:**
- Create: `scripts/bootstrap-google-cloud.sh`
- Modify: `README.md`
- Test: `scripts/bootstrap-google-cloud.sh`

**Interfaces:**
- Consumes: `GCP_PROJECT_ID`, `GCP_PROJECT_NUMBER`, optional `GCP_REGION`, and an owner-authorized `gcloud` login.
- Produces: `rsvp-reader` Artifact Registry, `rsvp-reader-runtime` and `github-rsvp-reader-deployer` service accounts, plus `GCP_WIF_PROVIDER` and `GCP_DEPLOY_SERVICE_ACCOUNT` outputs.

- [ ] **Step 1: Write the bootstrap script**

Create `scripts/bootstrap-google-cloud.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID.}"
: "${GCP_PROJECT_NUMBER:?Set GCP_PROJECT_NUMBER.}"
GCP_REGION="${GCP_REGION:-us-west1}"
REPOSITORY=rsvp-reader
RUNTIME_SA=rsvp-reader-runtime
DEPLOY_SA=github-rsvp-reader-deployer
POOL=github
PROVIDER=rsvp-reader
GITHUB_REPOSITORY=Aeonia-ai/rta-rsvp-reader

command -v gcloud >/dev/null || { echo 'Install the Google Cloud CLI first.' >&2; exit 1; }
gcloud config set project "$GCP_PROJECT_ID"
gcloud services enable artifactregistry.googleapis.com iam.googleapis.com iamcredentials.googleapis.com run.googleapis.com sts.googleapis.com
gcloud artifacts repositories describe "$REPOSITORY" --location="$GCP_REGION" >/dev/null 2>&1 || gcloud artifacts repositories create "$REPOSITORY" --repository-format=docker --location="$GCP_REGION" --description='RSVP Reader demo images'
gcloud iam service-accounts describe "$RUNTIME_SA@$GCP_PROJECT_ID.iam.gserviceaccount.com" >/dev/null 2>&1 || gcloud iam service-accounts create "$RUNTIME_SA" --display-name='RSVP Reader runtime'
gcloud iam service-accounts describe "$DEPLOY_SA@$GCP_PROJECT_ID.iam.gserviceaccount.com" >/dev/null 2>&1 || gcloud iam service-accounts create "$DEPLOY_SA" --display-name='GitHub RSVP Reader deployer'
DEPLOY_EMAIL="$DEPLOY_SA@$GCP_PROJECT_ID.iam.gserviceaccount.com"
RUNTIME_EMAIL="$RUNTIME_SA@$GCP_PROJECT_ID.iam.gserviceaccount.com"
for ROLE in roles/artifactregistry.writer roles/run.admin; do
  gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" --member="serviceAccount:$DEPLOY_EMAIL" --role="$ROLE" --condition=None
done
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_EMAIL" --member="serviceAccount:$DEPLOY_EMAIL" --role=roles/iam.serviceAccountUser
gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1 || gcloud iam workload-identity-pools create "$POOL" --location=global --display-name='GitHub Actions'
gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global --workload-identity-pool="$POOL" >/dev/null 2>&1 || gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --location=global --workload-identity-pool="$POOL" --issuer-uri=https://token.actions.githubusercontent.com --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref' --attribute-condition="assertion.repository == '$GITHUB_REPOSITORY' && assertion.ref == 'refs/heads/main'"
PRINCIPAL="principalSet://iam.googleapis.com/projects/$GCP_PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository/$GITHUB_REPOSITORY"
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_EMAIL" --member="$PRINCIPAL" --role=roles/iam.workloadIdentityUser
printf 'GCP_PROJECT_ID=%s\nGCP_REGION=%s\nGCP_WIF_PROVIDER=projects/%s/locations/global/workloadIdentityPools/%s/providers/%s\nGCP_DEPLOY_SERVICE_ACCOUNT=%s\n' "$GCP_PROJECT_ID" "$GCP_REGION" "$GCP_PROJECT_NUMBER" "$POOL" "$PROVIDER" "$DEPLOY_EMAIL"
```

- [ ] **Step 2: Check script syntax before it can affect Google**

Run:

```bash
bash -n scripts/bootstrap-google-cloud.sh
```

Expected: exit `0`, no output.

- [ ] **Step 3: Document bootstrap and the variables**

Add a `## Google Cloud demo deployment` section to `README.md` with:

```bash
GCP_PROJECT_ID=rsvp-reader-personal-demo \
GCP_PROJECT_NUMBER=1016486021065 \
GCP_REGION=us-west1 \
./scripts/bootstrap-google-cloud.sh
```

Document that the four printed values belong in GitHub repository **Actions variables**, not secrets; a JSON key is never created; and rerunning the script is safe.

- [ ] **Step 4: Commit Task 1**

```bash
git add scripts/bootstrap-google-cloud.sh README.md
git commit -m "feat: bootstrap Google Cloud demo delivery"
```

### Task 2: Add the verified deployment workflow

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy-cloud-run.yml`
- Test: `.github/workflows/deploy-cloud-run.yml`

**Interfaces:**
- Consumes: Task 1 GitHub variables `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT`.
- Produces: image `${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/rsvp-reader/rsvp-reader:${GITHUB_SHA}` and deployment URL.

- [ ] **Step 1: Make CI PR-only**

Replace this section in `.github/workflows/ci.yml`:

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

with:

```yaml
on:
  pull_request:
```

- [ ] **Step 2: Add `.github/workflows/deploy-cloud-run.yml`**

```yaml
name: deploy-cloud-run
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  id-token: write
concurrency:
  group: rsvp-reader-cloud-run
  cancel-in-progress: false
env:
  SERVICE: rsvp-reader
  REPOSITORY: rsvp-reader
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run build
      - uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}
          service_account: ${{ vars.GCP_DEPLOY_SERVICE_ACCOUNT }}
      - uses: google-github-actions/setup-gcloud@v3
      - run: gcloud auth configure-docker "${{ vars.GCP_REGION }}-docker.pkg.dev" --quiet
      - id: image
        run: echo "url=${{ vars.GCP_REGION }}-docker.pkg.dev/${{ vars.GCP_PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.SERVICE }}:${{ github.sha }}" >> "$GITHUB_OUTPUT"
      - run: docker build --tag "${{ steps.image.outputs.url }}" .
      - run: docker push "${{ steps.image.outputs.url }}"
      - id: deploy
        uses: google-github-actions/deploy-cloudrun@v3
        with:
          project_id: ${{ vars.GCP_PROJECT_ID }}
          region: ${{ vars.GCP_REGION }}
          service: ${{ env.SERVICE }}
          image: ${{ steps.image.outputs.url }}
          flags: >-
            --port=4317 --min=1 --max=1 --concurrency=10
            --service-account=rsvp-reader-runtime@${{ vars.GCP_PROJECT_ID }}.iam.gserviceaccount.com
      - run: gcloud run services add-iam-policy-binding "${{ env.SERVICE }}" --project="${{ vars.GCP_PROJECT_ID }}" --region="${{ vars.GCP_REGION }}" --member=allUsers --role=roles/run.invoker --quiet
      - run: curl --fail --retry 5 --retry-all-errors --retry-delay 2 "${{ steps.deploy.outputs.url }}/health"
      - run: |
          echo '## RSVP Reader demo deployment' >> "$GITHUB_STEP_SUMMARY"
          echo "- Image: \`${{ steps.image.outputs.url }}\`" >> "$GITHUB_STEP_SUMMARY"
          echo "- URL: ${{ steps.deploy.outputs.url }}" >> "$GITHUB_STEP_SUMMARY"
```

- [ ] **Step 3: Lint and verify**

Run:

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: each command exits `0`.

- [ ] **Step 4: Commit Task 2**

```bash
git add .github/workflows/ci.yml .github/workflows/deploy-cloud-run.yml
git commit -m "ci: deploy RSVP Reader to Cloud Run"
```

### Task 3: Bootstrap and prove the delivery path

**Files:**
- Modify: `README.md` only if observed behavior differs.
- Test: GitHub Actions workflow and Cloud Run browser session.

**Interfaces:**
- Consumes: Task 1 resources and Task 2 committed workflow on `main`.
- Produces: a healthy public `run.app` URL.

- [ ] **Step 1: Run bootstrap locally**

```bash
gcloud auth login
GCP_PROJECT_ID=rsvp-reader-personal-demo GCP_PROJECT_NUMBER=1016486021065 GCP_REGION=us-west1 ./scripts/bootstrap-google-cloud.sh
```

Expected: four GitHub variable assignments print; no key file appears.

- [ ] **Step 2: Add the printed values as GitHub repository variables**

Open `https://github.com/Aeonia-ai/rta-rsvp-reader/settings/variables/actions`; create `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER`, and `GCP_DEPLOY_SERVICE_ACCOUNT`. Do not add credentials as secrets.

- [ ] **Step 3: Manually dispatch the deployment workflow**

Open `https://github.com/Aeonia-ai/rta-rsvp-reader/actions/workflows/deploy-cloud-run.yml`, choose `main`, and select **Run workflow**.

Expected: tests, push, Cloud Run deploy, public invoker binding, and `/health` all succeed; the summary gives a `run.app` URL.

- [ ] **Step 4: Check the demo path and automatic delivery**

Open `<URL>/controls` on the phone and `<URL>/glasses-app` on the glasses, play a bundled sample, and confirm synchronized display. Merge a documentation-only PR into `main`; expected: one new deployment tagged by its commit SHA and a successful `/health` check.

## Self-Review

- Task 1 covers keyless Google preparation; Task 2 covers verification, immutable build, deploy, public invocation, health proof, and URL reporting; Task 3 covers real deployment and automatic delivery.
- All resource names, project identifiers, variable names, and runtime service-account references match across tasks.
- No placeholders or deferred implementation markers remain.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-03-cloud-run-demo-delivery.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task and review each task before the next.
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, with checkpoints.
