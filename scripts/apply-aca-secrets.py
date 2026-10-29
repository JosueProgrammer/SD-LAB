"""Apply runtime secrets from .env to sdlab-web Container App (no shell & splitting)."""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"


def az_cmd(args: list[str]) -> int:
    """Invoke Azure CLI via `python -m azure.cli` to avoid az.cmd / & splitting on Windows."""
    candidates = [
        Path(r"C:\Program Files\Microsoft SDKs\Azure\CLI2\python.exe"),
        Path(shutil.which("python") or ""),
    ]
    py = next((p for p in candidates if p and p.exists()), None)
    if not py:
        raise FileNotFoundError("Azure CLI python.exe not found")
    return subprocess.run([str(py), "-m", "azure.cli", *args], shell=False).returncode




def load_env(path: Path) -> dict[str, str]:
    vars_: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip()
        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
            v = v[1:-1]
        vars_[k.strip()] = v
    return vars_


def main() -> int:
    vars_ = load_env(ENV_PATH)
    pk = vars_.get("FIREBASE_ADMIN_PRIVATE_KEY", "").replace("\\n", "\n")
    required = [
        "DATABASE_URL",
        "FIREBASE_ADMIN_CLIENT_EMAIL",
        "FIREBASE_ADMIN_PRIVATE_KEY",
        "SUPABASE_S3_ACCESS_KEY",
        "SUPABASE_S3_SECRET_KEY",
        "SUPABASE_S3_ENDPOINT",
        "SUPABASE_STORAGE_BUCKET",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    ]
    missing = [k for k in required if not vars_.get(k)]
    if missing:
        print("Missing in .env:", ", ".join(missing), file=sys.stderr)
        return 1

    secrets = [
        f"database-url={vars_['DATABASE_URL']}",
        f"firebase-admin-client-email={vars_['FIREBASE_ADMIN_CLIENT_EMAIL']}",
        f"firebase-admin-private-key={pk}",
        f"supabase-s3-access-key={vars_['SUPABASE_S3_ACCESS_KEY']}",
        f"supabase-s3-secret-key={vars_['SUPABASE_S3_SECRET_KEY']}",
    ]
    if vars_.get("UPLOADTHING_SECRET"):
        secrets.append(f"uploadthing-secret={vars_['UPLOADTHING_SECRET']}")
    if vars_.get("UPLOADTHING_TOKEN"):
        secrets.append(f"uploadthing-token={vars_['UPLOADTHING_TOKEN']}")

    print("Setting secrets...", flush=True)
    code = az_cmd(
        [
            "containerapp",
            "secret",
            "set",
            "-n",
            "sdlab-web",
            "-g",
            "rg-sdlab",
            "--secrets",
            *secrets,
            "-o",
            "none",
        ]
    )
    if code != 0:
        return code

    region = vars_.get("SUPABASE_S3_REGION") or "us-east-1"
    env_vars = [
        "DATABASE_URL=secretref:database-url",
        "FIREBASE_ADMIN_CLIENT_EMAIL=secretref:firebase-admin-client-email",
        "FIREBASE_ADMIN_PRIVATE_KEY=secretref:firebase-admin-private-key",
        "SUPABASE_S3_ACCESS_KEY=secretref:supabase-s3-access-key",
        "SUPABASE_S3_SECRET_KEY=secretref:supabase-s3-secret-key",
        f"SUPABASE_S3_ENDPOINT={vars_['SUPABASE_S3_ENDPOINT']}",
        f"SUPABASE_S3_REGION={region}",
        f"SUPABASE_STORAGE_BUCKET={vars_['SUPABASE_STORAGE_BUCKET']}",
        f"NEXT_PUBLIC_FIREBASE_PROJECT_ID={vars_['NEXT_PUBLIC_FIREBASE_PROJECT_ID']}",
    ]
    if vars_.get("UPLOADTHING_SECRET"):
        env_vars.append("UPLOADTHING_SECRET=secretref:uploadthing-secret")
    if vars_.get("UPLOADTHING_TOKEN"):
        env_vars.append("UPLOADTHING_TOKEN=secretref:uploadthing-token")
    if vars_.get("UPLOADTHING_APP_ID"):
        env_vars.append(f"UPLOADTHING_APP_ID={vars_['UPLOADTHING_APP_ID']}")
    if vars_.get("NEXT_PUBLIC_SUPABASE_URL"):
        env_vars.append(f"NEXT_PUBLIC_SUPABASE_URL={vars_['NEXT_PUBLIC_SUPABASE_URL']}")

    print("Updating env refs...", flush=True)
    return az_cmd(
        [
            "containerapp",
            "update",
            "-n",
            "sdlab-web",
            "-g",
            "rg-sdlab",
            "--set-env-vars",
            *env_vars,
            "-o",
            "none",
        ]
    )


if __name__ == "__main__":
    raise SystemExit(main())
