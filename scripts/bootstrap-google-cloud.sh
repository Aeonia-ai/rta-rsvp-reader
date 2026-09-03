#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID.}"
: "${GCP_PROJECT_NUMBER:?Set GCP_PROJECT_NUMBER.}"

GCP_REGION="${GCP_REGION:-us-west1}"
REPOSITORY="rsvp-reader"
RUNTIME_SERVICE_ACCOUNT="rsvp-reader-runtime"
DEPLOY_SERVICE_ACCOUNT="github-rsvp-reader-deployer"
WORKLOAD_IDENTITY_POOL="github"
WORKLOAD_IDENTITY_PROVIDER="rsvp-reader"
GITHUB_REPOSITORY="Aeonia-ai/rta-rsvp-reader"

command -v gcloud >/dev/null || {
  printf '%s\n' 'Install the Google Cloud CLI first: https://cloud.google.com/sdk/docs/install' >&2
  exit 1
}

gcloud config set project "$GCP_PROJECT_ID"
gcloud services enable \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  run.googleapis.com \
  serviceusage.googleapis.com \
  sts.googleapis.com

gcloud artifacts repositories describe "$REPOSITORY" --location="$GCP_REGION" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format=docker \
    --location="$GCP_REGION" \
    --description='RSVP Reader demo images'

gcloud iam service-accounts describe "$RUNTIME_SERVICE_ACCOUNT@$GCP_PROJECT_ID.iam.gserviceaccount.com" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "$RUNTIME_SERVICE_ACCOUNT" \
    --display-name='RSVP Reader runtime'
gcloud iam service-accounts describe "$DEPLOY_SERVICE_ACCOUNT@$GCP_PROJECT_ID.iam.gserviceaccount.com" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "$DEPLOY_SERVICE_ACCOUNT" \
    --display-name='GitHub RSVP Reader deployer'

deploy_email="$DEPLOY_SERVICE_ACCOUNT@$GCP_PROJECT_ID.iam.gserviceaccount.com"
runtime_email="$RUNTIME_SERVICE_ACCOUNT@$GCP_PROJECT_ID.iam.gserviceaccount.com"
for role in roles/artifactregistry.writer roles/run.admin; do
  gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
    --member="serviceAccount:$deploy_email" \
    --role="$role" \
    --condition=None
done
gcloud iam service-accounts add-iam-policy-binding "$runtime_email" \
  --member="serviceAccount:$deploy_email" \
  --role=roles/iam.serviceAccountUser

gcloud iam workload-identity-pools describe "$WORKLOAD_IDENTITY_POOL" --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create "$WORKLOAD_IDENTITY_POOL" \
    --location=global \
    --display-name='GitHub Actions'
gcloud iam workload-identity-pools providers describe "$WORKLOAD_IDENTITY_PROVIDER" \
  --location=global \
  --workload-identity-pool="$WORKLOAD_IDENTITY_POOL" >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc "$WORKLOAD_IDENTITY_PROVIDER" \
    --location=global \
    --workload-identity-pool="$WORKLOAD_IDENTITY_POOL" \
    --issuer-uri=https://token.actions.githubusercontent.com \
    --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref' \
    --attribute-condition="assertion.repository == '$GITHUB_REPOSITORY' && assertion.ref == 'refs/heads/main'"

principal_set="principalSet://iam.googleapis.com/projects/$GCP_PROJECT_NUMBER/locations/global/workloadIdentityPools/$WORKLOAD_IDENTITY_POOL/attribute.repository/$GITHUB_REPOSITORY"
gcloud iam service-accounts add-iam-policy-binding "$deploy_email" \
  --member="$principal_set" \
  --role=roles/iam.workloadIdentityUser

printf '%s\n' 'Google Cloud bootstrap complete. Add these GitHub repository variables:'
printf 'GCP_PROJECT_ID=%s\n' "$GCP_PROJECT_ID"
printf 'GCP_REGION=%s\n' "$GCP_REGION"
printf 'GCP_WIF_PROVIDER=projects/%s/locations/global/workloadIdentityPools/%s/providers/%s\n' \
  "$GCP_PROJECT_NUMBER" "$WORKLOAD_IDENTITY_POOL" "$WORKLOAD_IDENTITY_PROVIDER"
printf 'GCP_DEPLOY_SERVICE_ACCOUNT=%s\n' "$deploy_email"
