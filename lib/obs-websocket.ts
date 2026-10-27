type ObsStreamStatus = {
  outputActive: boolean;
  outputReconnecting: boolean;
};

/**
 * Consulta el estado de streaming de OBS Studio vía obs-websocket (v5).
 * Si OBS no está disponible (otro PC / apagado), devuelve null sin lanzar.
 */
export async function getObsStreamStatus(): Promise<ObsStreamStatus | null> {
  const url = process.env.OBS_URL || `ws://127.0.0.1:${process.env.OBS_PORT || "4455"}`;
  const password = process.env.OBS_PASSWORD || "";

  try {
    const { default: OBSWebSocket } = await import("obs-websocket-js");
    const obs = new OBSWebSocket();
    await obs.connect(url, password || undefined, { rpcVersion: 1 });
    try {
      const status = await obs.call("GetStreamStatus");
      return {
        outputActive: Boolean(status.outputActive),
        outputReconnecting: Boolean(status.outputReconnecting),
      };
    } finally {
      await obs.disconnect().catch(() => undefined);
    }
  } catch {
    return null;
  }
}

export async function isObsStreaming(): Promise<boolean | null> {
  const status = await getObsStreamStatus();
  if (!status) return null;
  return status.outputActive || status.outputReconnecting;
}
