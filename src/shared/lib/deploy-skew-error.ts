const AUTO_RELOAD_FLAG = "app-error-auto-reload";

export function isDeploySkewError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  return (
    name.includes("chunkloaderror") ||
    message.includes("loading chunk") ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("failed to fetch rsc") ||
    message.includes("load failed") ||
    message.includes("importing a module script failed")
  );
}

/** One automatic reload per session when a stale bundle fails to load. */
export function tryAutoReloadOnDeploySkew(error: Error): boolean {
  if (typeof window === "undefined" || !isDeploySkewError(error)) {
    return false;
  }

  if (sessionStorage.getItem(AUTO_RELOAD_FLAG)) {
    return false;
  }

  sessionStorage.setItem(AUTO_RELOAD_FLAG, "1");
  window.location.reload();
  return true;
}

export function clearDeploySkewReloadFlag(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(AUTO_RELOAD_FLAG);
}
