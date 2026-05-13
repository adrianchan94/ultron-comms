# ULTRON-COMMS · Northflank deployment

## The service

**Name:** `ultron-comms`
**Project:** `unpaidinternkev-v2`
**Type:** Combined service (build from git + deploy)
**Source:** `https://github.com/adrianchan94/ultron-comms` (branch `main`)
**Dockerfile:** `./Dockerfile`

## Ports

| Port  | Protocol | Public? | Purpose                              |
|-------|----------|---------|--------------------------------------|
| 19876 | TCP      | YES     | Mesh transport. TLS edge from NF.    |
| 8080  | HTTP     | YES     | `/health` endpoint. TLS edge from NF.|

## Environment / secrets

| Name                       | Value source                                                                 |
|----------------------------|------------------------------------------------------------------------------|
| `ULTRON_COMMS_KEY`         | **NEW SECRET** — generate `openssl rand -hex 32` and stash in 1Password.    |
| `ULTRON_COMMS_BIND`        | `0.0.0.0` (already in Dockerfile)                                            |
| `ULTRON_COMMS_PORT`        | `19876` (already in Dockerfile)                                              |
| `ULTRON_COMMS_HEALTH_PORT` | `8080` (already in Dockerfile)                                               |

## Resources

- Plan: `nf-compute-10` (the smallest — coordinator is lightweight; <100 MB RAM, <0.1 vCPU steady state)
- Instances: 1 (do not horizontally scale — coordinator is a singleton)
- Healthcheck: HTTP GET `:8080/health` every 30 s, threshold 3

## Path A — manual click-through (90 seconds)

1. Northflank → project `unpaidinternkev-v2` → **+ Create new** → **Combined service**.
2. Source: GitHub → repo `adrianchan94/ultron-comms` → branch `main`.
3. Build: Dockerfile → path `./Dockerfile`.
4. Ports: add two — `19876` (TCP, public) and `8080` (HTTP, public).
5. Runtime → Environment → add `ULTRON_COMMS_KEY` as **secret** with the value from 1Password.
6. Resources → `nf-compute-10`, 1 instance.
7. Health checks → HTTP → path `/health`, port `8080`.
8. Deploy.

## Path B — API deploy (requires service-scoped token)

The team token I was given is project-read scope only. To deploy via API,
issue a token with the `services` create/update permissions in Northflank
settings → API tokens.

Then:

```bash
export NF_TOKEN='nf-...'           # service-scoped token
export ULTRON_COMMS_KEY='...'      # the new shared secret

curl -sS -X POST \
  -H "Authorization: Bearer $NF_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.northflank.com/v1/projects/unpaidinternkev-v2/services/combined" \
  -d @- <<JSON
{
  "name": "ultron-comms",
  "description": "ULTRON cross-machine agent mesh coordinator.",
  "billing": { "deploymentPlan": "nf-compute-10" },
  "deployment": { "instances": 1 },
  "ports": [
    { "name": "mesh",   "internalPort": 19876, "public": true, "protocol": "TCP" },
    { "name": "health", "internalPort": 8080,  "public": true, "protocol": "HTTP" }
  ],
  "vcsData": {
    "projectUrl": "https://github.com/adrianchan94/ultron-comms",
    "projectType": "github",
    "projectBranch": "main"
  },
  "buildConfiguration": {
    "pathIgnoreRules": [],
    "isAllowList": false,
    "ciIgnoreFlagsEnabled": false
  },
  "buildSettings": {
    "dockerfile": {
      "buildEngine": "kaniko",
      "useCache": true,
      "dockerFilePath": "/Dockerfile",
      "dockerWorkDir": "/"
    }
  },
  "runtimeEnvironment": {
    "ULTRON_COMMS_KEY": { "value": "$ULTRON_COMMS_KEY", "secret": true }
  },
  "healthChecks": [
    {
      "type": "http",
      "path": "/health",
      "port": 8080,
      "intervalSeconds": 30,
      "timeoutSeconds": 5,
      "failureThreshold": 3
    }
  ]
}
JSON
```

## After deploy: verify

```bash
# Replace with Northflank-issued domain
COORD_HOST=ultron-comms--api--unpaidinternkev-v2.code.run
COORD_PORT=19876
HEALTH=https://$COORD_HOST/health   # NF TLS edge fronts both ports

curl -sS $HEALTH  # → {"ok":true,"peerId":"...","port":19876}
```

Then run the smoke client (M-5):

```bash
ULTRON_COMMS_HOST=$COORD_HOST \
ULTRON_COMMS_PORT=$COORD_PORT \
ULTRON_COMMS_KEY=$ULTRON_COMMS_KEY \
node /tmp/uc-client.mjs
# expected: OK peerId=... isCoordinator=false
```
