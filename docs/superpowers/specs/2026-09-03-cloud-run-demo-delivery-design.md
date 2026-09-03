# Cloud Run Demo Delivery Design

## Objective

Publish the existing RSVP Reader container to a Google Cloud Run demo URL and
automatically redeploy it after verified changes reach `main`. The deployment is
for one private demonstration session, not a production multi-user service.

## Scope

- Preserve the existing PR and `main` verification checks.
- On a successful `main` push, build the repository's existing Dockerfile,
  publish an immutable image to Artifact Registry, deploy it to Cloud Run, and
  request `/health` from the deployed URL.
- Offer a manual workflow-dispatch deployment for recovery or a first release.
- Use GitHub Actions OpenID Connect with Google Workload Identity Federation.
  No Google service-account key is stored in GitHub.

## Cloud Run service shape

- Service name: `rsvp-reader`.
- Region: `us-west1`, unless the operator selects a different region at
  bootstrap.
- Container port: supplied by Cloud Run through `PORT`; the image already
  listens on `0.0.0.0` and honors it.
- Health endpoint: `GET /health`.
- Scaling: minimum instance count `1`; maximum instance count `1`; bounded
  concurrency appropriate for one phone controller and one glasses display.
- Access: unauthenticated access is permitted only for the temporary demo URL.
  There is no custom domain, DNS record, Firebase dependency, or persistence
  layer in this delivery.

The single-instance constraint is intentional. The reading session, WebSocket
connections, and loaded text are process memory. Multiple instances would make
the paired phone and glasses observe different reader sessions. An instance
restart clears the demo session; that behavior is accepted for this phase.

## CI/CD flow

```text
pull request ───────────────> npm test + typecheck + build

main push ─> verify ─> build image tagged with commit SHA
                     ─> Artifact Registry
                     ─> Cloud Run revision
                     ─> GET /health smoke check
                     ─> deployment URL in Actions summary
```

The deploy workflow is only authoritative for images and the Cloud Run service
settings it declares. It does not manage DNS, Cloud SQL, Firebase, user
accounts, or unrelated Google Cloud resources.

## One-time Google bootstrap

After a billing-enabled Google Cloud project is available, an operator creates:

1. the Artifact Registry Docker repository;
2. the GitHub Workload Identity Pool and provider restricted to
   `Aeonia-ai/rta-rsvp-reader` and the `main` branch deployment identity;
3. a dedicated deploy service account with only the roles necessary to publish
   the image and deploy this Cloud Run service;
4. the GitHub repository variables identifying the project, region, Workload
   Identity Provider, and deploy service account.

The bootstrap instructions must use short-lived GitHub OIDC credentials, not a
downloaded key file.

## Security boundary

The app currently has no application authentication: anyone reaching the demo
URL can attempt to control the shared reader. This is explicitly accepted only
for a short-lived, privately shared demo URL. A tokenized session or a proper
access gateway is required before publishing a stable public hostname.

## Verification

- Existing tests, typecheck, and production build pass before a deploy.
- The workflow confirms the Cloud Run URL returns HTTP 200 from `/health`.
- A phone opens `/controls`; glasses open `/glasses-app`; both establish WSS
  connections to the same Cloud Run instance and share playback state.
- A new deployment/restart is expected to clear the reader session; this is
  recorded as an accepted demo limitation.
