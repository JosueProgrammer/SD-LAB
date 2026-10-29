#!/usr/bin/env bash
# Bootstrap Azure Container Apps: RG, ACR, Environment, Files, sdlab-web + sdlab-mediamtx.
# Requisitos: az CLI autenticado (az login), extensión containerapp, Docker opcional.
set -euo pipefail

LOCATION="${LOCATION:-westus2}"
RG="${RG:-rg-sdlab}"
ACR_NAME="${ACR_NAME:-sdlabacr}"
ENV_NAME="${ENV_NAME:-sdlab-env}"
WEB_APP="${WEB_APP:-sdlab-web}"
MTX_APP="${MTX_APP:-sdlab-mediamtx}"
SHARE_NAME="${SHARE_NAME:-recordings}"
LOG_WS="${LOG_WS:-sdlab-logs}"
STORAGE_NAME="${STORAGE_NAME:-sdlabrec$(date +%s | tail -c 8)}"
STORAGE_NAME="$(echo "$STORAGE_NAME" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9' | cut -c1-24)"

echo "==> Resource group $RG ($LOCATION)"
az group create --name "$RG" --location "$LOCATION" --output none

echo "==> ACR $ACR_NAME"
az acr create --resource-group "$RG" --name "$ACR_NAME" --sku Basic --admin-enabled true --output none
ACR_LOGIN_SERVER="$(az acr show -n "$ACR_NAME" -g "$RG" --query loginServer -o tsv)"
ACR_USER="$(az acr credential show -n "$ACR_NAME" --query username -o tsv)"
ACR_PASS="$(az acr credential show -n "$ACR_NAME" --query passwords[0].value -o tsv)"

echo "==> Log Analytics $LOG_WS"
az monitor log-analytics workspace create \
  --resource-group "$RG" \
  --workspace-name "$LOG_WS" \
  --location "$LOCATION" \
  --output none
LOG_ID="$(az monitor log-analytics workspace show -g "$RG" -n "$LOG_WS" --query customerId -o tsv)"
LOG_KEY="$(az monitor log-analytics workspace get-shared-keys -g "$RG" -n "$LOG_WS" --query primarySharedKey -o tsv)"

echo "==> Container Apps Environment $ENV_NAME"
az containerapp env create \
  --name "$ENV_NAME" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --logs-workspace-id "$LOG_ID" \
  --logs-workspace-key "$LOG_KEY" \
  --output none
ENV_ID="$(az containerapp env show -n "$ENV_NAME" -g "$RG" --query id -o tsv)"

echo "==> Storage + Azure Files ($STORAGE_NAME / $SHARE_NAME)"
az storage account create \
  --name "$STORAGE_NAME" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --output none
STORAGE_KEY="$(az storage account keys list -g "$RG" -n "$STORAGE_NAME" --query '[0].value' -o tsv)"
az storage share create \
  --name "$SHARE_NAME" \
  --account-name "$STORAGE_NAME" \
  --account-key "$STORAGE_KEY" \
  --quota 100 \
  --output none

echo "==> Registrar volumen Azure Files en el Environment"
az containerapp env storage set \
  --name "$ENV_NAME" \
  --resource-group "$RG" \
  --storage-name recordings \
  --azure-file-account-name "$STORAGE_NAME" \
  --azure-file-account-key "$STORAGE_KEY" \
  --azure-file-share-name "$SHARE_NAME" \
  --access-mode ReadWrite \
  --output none

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Build & push imágenes iniciales (si Docker está disponible)"
if command -v docker >/dev/null 2>&1; then
  echo "$ACR_PASS" | docker login "$ACR_LOGIN_SERVER" -u "$ACR_USER" --password-stdin
  docker build -f "$ROOT/Dockerfile.mediamtx" -t "$ACR_LOGIN_SERVER/sdlab-mediamtx:latest" "$ROOT"
  docker push "$ACR_LOGIN_SERVER/sdlab-mediamtx:latest"
  docker build \
    --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="${NEXT_PUBLIC_FIREBASE_API_KEY:-}" \
    --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-}" \
    --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}" \
    --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:-}" \
    --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:-}" \
    --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="${NEXT_PUBLIC_FIREBASE_APP_ID:-}" \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}" \
    --build-arg NEXT_PUBLIC_HLS_BASE_URL="${NEXT_PUBLIC_HLS_BASE_URL:-}" \
    -f "$ROOT/Dockerfile" \
    -t "$ACR_LOGIN_SERVER/sdlab-web:latest" \
    "$ROOT"
  docker push "$ACR_LOGIN_SERVER/sdlab-web:latest"
else
  echo "AVISO: Docker no encontrado. Empuja imágenes a ACR antes de crear las apps."
fi

echo "==> Container App $MTX_APP (TCP 1935)"
az containerapp create \
  --name "$MTX_APP" \
  --resource-group "$RG" \
  --environment "$ENV_NAME" \
  --image "$ACR_LOGIN_SERVER/sdlab-mediamtx:latest" \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_USER" \
  --registry-password "$ACR_PASS" \
  --cpu 1.0 \
  --memory 2.0Gi \
  --min-replicas 1 \
  --max-replicas 1 \
  --ingress external \
  --transport tcp \
  --target-port 1935 \
  --exposed-port 1935 \
  --output none

MTX_FQDN="$(az containerapp show -n "$MTX_APP" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)"
RTMP_URL="rtmp://${MTX_FQDN}:1935"

echo "==> Aplicar puertos internos HLS/API + volumen /recordings en $MTX_APP"
TMP_MTX="$(mktemp)"
cat > "$TMP_MTX" <<EOF
properties:
  managedEnvironmentId: ${ENV_ID}
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
    registries:
      - server: ${ACR_LOGIN_SERVER}
        username: ${ACR_USER}
        passwordSecretRef: acr-password
    secrets:
      - name: acr-password
        value: ${ACR_PASS}
  template:
    containers:
      - name: ${MTX_APP}
        image: ${ACR_LOGIN_SERVER}/sdlab-mediamtx:latest
        resources:
          cpu: 1.0
          memory: 2Gi
        volumeMounts:
          - volumeName: recordings
            mountPath: /recordings
    scale:
      minReplicas: 1
      maxReplicas: 1
    volumes:
      - name: recordings
        storageName: recordings
        storageType: AzureFile
EOF

az containerapp update -n "$MTX_APP" -g "$RG" --yaml "$TMP_MTX" --output none
rm -f "$TMP_MTX"

echo "==> Container App $WEB_APP (HTTPS)"
az containerapp create \
  --name "$WEB_APP" \
  --resource-group "$RG" \
  --environment "$ENV_NAME" \
  --image "$ACR_LOGIN_SERVER/sdlab-web:latest" \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_USER" \
  --registry-password "$ACR_PASS" \
  --target-port 3000 \
  --ingress external \
  --transport auto \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars \
    "NODE_ENV=production" \
    "PORT=3000" \
    "HOSTNAME=0.0.0.0" \
    "RTMP_PUBLIC_URL=${RTMP_URL}" \
    "HLS_PUBLIC_URL=http://${MTX_APP}:8888" \
    "MEDIAMTX_API_URL=http://${MTX_APP}:9997" \
    "MEDIAMTX_RECORDINGS_DIR=/recordings" \
  --output none

TMP_WEB="$(mktemp)"
cat > "$TMP_WEB" <<EOF
properties:
  managedEnvironmentId: ${ENV_ID}
  configuration:
    ingress:
      external: true
      targetPort: 3000
      transport: auto
      allowInsecure: false
    registries:
      - server: ${ACR_LOGIN_SERVER}
        username: ${ACR_USER}
        passwordSecretRef: acr-password
    secrets:
      - name: acr-password
        value: ${ACR_PASS}
  template:
    containers:
      - name: ${WEB_APP}
        image: ${ACR_LOGIN_SERVER}/sdlab-web:latest
        resources:
          cpu: 0.5
          memory: 1Gi
        env:
          - name: NODE_ENV
            value: production
          - name: PORT
            value: "3000"
          - name: HOSTNAME
            value: "0.0.0.0"
          - name: RTMP_PUBLIC_URL
            value: "${RTMP_URL}"
          - name: HLS_PUBLIC_URL
            value: "http://${MTX_APP}:8888"
          - name: MEDIAMTX_API_URL
            value: "http://${MTX_APP}:9997"
          - name: MEDIAMTX_RECORDINGS_DIR
            value: /recordings
        volumeMounts:
          - volumeName: recordings
            mountPath: /recordings
    scale:
      minReplicas: 1
      maxReplicas: 3
    volumes:
      - name: recordings
        storageName: recordings
        storageType: AzureFile
EOF

az containerapp update -n "$WEB_APP" -g "$RG" --yaml "$TMP_WEB" --output none
rm -f "$TMP_WEB"

WEB_FQDN="$(az containerapp show -n "$WEB_APP" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)"

cat <<EOF

========================================
Bootstrap listo
========================================
ACR:               $ACR_LOGIN_SERVER
Environment:       $ENV_NAME
MediaMTX TCP FQDN: $MTX_FQDN
Web HTTPS:         https://$WEB_FQDN
RTMP_PUBLIC_URL:   $RTMP_URL
Storage:           $STORAGE_NAME / $SHARE_NAME

Siguientes pasos:
1. Configura secrets de runtime (DATABASE_URL, Firebase Admin, Supabase, UploadThing)
   — ver docs/azure-container-apps.md
2. GitHub Secrets: AZURE_CREDENTIALS, ACR_LOGIN_SERVER, ACR_USERNAME, ACR_PASSWORD,
   AZURE_RESOURCE_GROUP=$RG
3. GitHub Variables: NEXT_PUBLIC_FIREBASE_*, NEXT_PUBLIC_SUPABASE_URL
4. Push a main → .github/workflows/deploy-azure.yml
5. Checklist post-deploy en docs/azure-container-apps.md §4
========================================
EOF
