# Azure Container Apps — despliegue de producción

Producción = **solo** Azure Container Apps. Docker Compose y `mediamtx.yml` quedan para lab local.

| Recurso | Nombre por defecto |
|---|---|
| Resource group | `rg-sdlab` |
| Región | `westus2` |
| ACR | `sdlabacr` |
| Environment | `sdlab-env` |
| Web | `sdlab-web` (HTTPS → puerto 3000) |
| MediaMTX | `sdlab-mediamtx` (TCP 1935 público; HLS 8888 / API 9997 internos) |
| Azure Files | share `recordings` montado en `/recordings` |

```text
GitHub Actions → build → ACR → az containerapp update
OBS ──RTMP──► sdlab-mediamtx:1935
Navegadores ─HTTPS─► sdlab-web
sdlab-web ─DNS interno─► sdlab-mediamtx:8888 (HLS) / :9997 (API)
sdlab-mediamtx ─webhook─► http://sdlab-web:3000/api/webhooks/mediamtx
Ambas apps ──► Azure Files /recordings
```

## 1. Prerrequisitos

- Azure CLI (`az`) autenticado: `az login`
- Extensión Container Apps: `az extension add --name containerapp --upgrade`
- Docker Desktop (solo para el primer build del bootstrap)
- Suscripción con cuota Container Apps + ACR

## 2. Bootstrap (una vez)

Desde la raíz del repo (Git Bash / WSL / Linux):

```bash
chmod +x scripts/azure-bootstrap.sh
# Opcional: exporta NEXT_PUBLIC_* si vas a buildear la web en el bootstrap
./scripts/azure-bootstrap.sh
```

Variables opcionales: `LOCATION`, `RG`, `ACR_NAME`, `ENV_NAME`, `WEB_APP`, `MTX_APP`.

El script crea RG, ACR, Log Analytics, VNet (`sdlab-vnet`), Environment en modo **WorkloadProfiles** con subnet (no Express; TCP externo OBS exige VNet), Storage/Files, registra el volumen `recordings`, y las dos Container Apps.

### Puertos adicionales de MediaMTX (HLS + API internos)

Tras crear `sdlab-mediamtx`, asegúrate de que el ingress TCP tenga mapeos internos para 8888 y 9997. Ejemplo YAML (ajusta imagen/FQDN):

```yaml
properties:
  configuration:
    ingress:
      external: true
      transport: tcp
      targetPort: 1935
      exposedPort: 1935
      additionalPortMappings:
        - targetPort: 8888
          exposedPort: 8888
          external: false
        - targetPort: 9997
          exposedPort: 9997
          external: false
```

Aplica con:

```bash
az containerapp show -n sdlab-mediamtx -g rg-sdlab -o yaml > /tmp/mtx.yaml
# edita additionalPortMappings como arriba
az containerapp update -n sdlab-mediamtx -g rg-sdlab --yaml /tmp/mtx.yaml
```

### Montar Azure Files en `/recordings`

En ambas apps, volumen del Environment (`recordings`) → mountPath `/recordings`:

- `sdlab-mediamtx`: ReadWrite
- `sdlab-web`: ReadOnly (la app solo lee para subir a Supabase)

Ejemplo en la sección `template.volumes` / `volumeMounts` del YAML de la app, o desde el portal: **Application → Volumes**.

### Secrets de runtime en `sdlab-web`

```bash
az containerapp secret set -n sdlab-web -g rg-sdlab --secrets \
  database-url="$DATABASE_URL" \
  firebase-admin-client-email="$FIREBASE_ADMIN_CLIENT_EMAIL" \
  firebase-admin-private-key="$FIREBASE_ADMIN_PRIVATE_KEY" \
  supabase-s3-access-key="$SUPABASE_S3_ACCESS_KEY" \
  supabase-s3-secret-key="$SUPABASE_S3_SECRET_KEY" \
  uploadthing-secret="$UPLOADTHING_SECRET" \
  uploadthing-token="$UPLOADTHING_TOKEN"

az containerapp update -n sdlab-web -g rg-sdlab --set-env-vars \
  DATABASE_URL=secretref:database-url \
  FIREBASE_ADMIN_CLIENT_EMAIL=secretref:firebase-admin-client-email \
  FIREBASE_ADMIN_PRIVATE_KEY=secretref:firebase-admin-private-key \
  SUPABASE_S3_ACCESS_KEY=secretref:supabase-s3-access-key \
  SUPABASE_S3_SECRET_KEY=secretref:supabase-s3-secret-key \
  SUPABASE_S3_ENDPOINT="$SUPABASE_S3_ENDPOINT" \
  SUPABASE_S3_REGION="${SUPABASE_S3_REGION:-us-east-1}" \
  SUPABASE_STORAGE_BUCKET="$SUPABASE_STORAGE_BUCKET" \
  UPLOADTHING_SECRET=secretref:uploadthing-secret \
  UPLOADTHING_TOKEN=secretref:uploadthing-token \
  UPLOADTHING_APP_ID="$UPLOADTHING_APP_ID" \
  RTMP_PUBLIC_URL="rtmp://<fqdn-tcp-mediamtx>:1935" \
  HLS_PUBLIC_URL="http://sdlab-mediamtx:8888" \
  MEDIAMTX_API_URL="http://sdlab-mediamtx:9997" \
  MEDIAMTX_RECORDINGS_DIR="/recordings"
```

`NEXT_PUBLIC_*` se inyectan en el **build** de la imagen (Dockerfile `ARG`s), no como env de runtime del Container App.

Si los webhooks de MediaMTX no llegan, prueba `http://sdlab-web/api/webhooks/mediamtx` (sin `:3000`): el ingress HTTP interno suele mapear 80 → 3000. Actualiza `mediamtx.azure.yml` y redespliega la imagen mtx.

## 3. CI/CD (GitHub Actions)

Workflow: [`.github/workflows/deploy-azure.yml`](../.github/workflows/deploy-azure.yml)

Trigger: `push` a `main` y `workflow_dispatch`.

### Secrets del repositorio

| Secret | Uso |
|---|---|
| `AZURE_CREDENTIALS` | JSON del service principal (`az ad sp create-for-rbac --sdk-auth`) |
| `ACR_USERNAME` / `ACR_PASSWORD` | Credenciales ACR (o Managed Identity vía OIDC) |
| `ACR_LOGIN_SERVER` | p.ej. `sdlabacr.azurecr.io` |
| `AZURE_RESOURCE_GROUP` | `rg-sdlab` |
| `FIREBASE_ADMIN_*`, `DATABASE_URL`, etc. | Solo si el workflow también actualiza secrets (opcional) |

### Variables del repositorio (build-args)

`NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_HLS_BASE_URL` (puede quedar vacío: el player usa `/api/hls`).

Service principal mínimo:

```bash
az ad sp create-for-rbac \
  --name "github-sdlab-aca" \
  --role contributor \
  --scopes /subscriptions/<SUB_ID>/resourceGroups/rg-sdlab \
  --sdk-auth
```

Guarda el JSON en el secret `AZURE_CREDENTIALS`.

## 4. Checklist post-deploy

1. **HTTPS web** — Abre `https://<fqdn-sdlab-web>`: carga login Firebase y la app.
2. **OBS RTMP** — En OBS, servidor = `RTMP_PUBLIC_URL` (FQDN TCP de `sdlab-mediamtx`, puerto 1935) + stream key de la sala. En la app: `obsConnected` / path ready vía API/webhook MediaMTX.
3. **HLS en vivo** — Entra a la sala: el player reproduce por `/api/hls/...` (proxy Next → `http://sdlab-mediamtx:8888`).
4. **Webhook** — Al empezar/parar publicación RTMP, MediaMTX llama a `sdlab-web` y el estado de la sala se actualiza sin OBS WebSocket.
5. **Grabación** — Al finalizar el evento, el archivo aparece en Azure Files `/recordings` y el flujo existente sube a Supabase ([`lib/recording.ts`](../lib/recording.ts)).
6. **CI** — Push a `main` → workflow verde → nueva revisión de `sdlab-web` (y `sdlab-mediamtx` si cambiaron sus archivos).

## 5. Fuera de alcance

- VM, AKS, App Service
- Dominio custom / certificado propio (después, sobre el FQDN de Container Apps)
- Cambiar Neon / Firebase / Supabase

## 6. Lab local vs producción

| | Local | Azure Container Apps |
|---|---|---|
| Orquestación | `docker compose` | Environment `sdlab-env` |
| Config MediaMTX | `mediamtx.yml` | `mediamtx.azure.yml` (imagen) |
| Webhooks | `host.docker.internal:3000` | `http://sdlab-web:3000/...` |
| Grabaciones | `./recordings` | Azure Files `/recordings` |
| OBS status | WebSocket opcional | Solo API/webhook MediaMTX |
