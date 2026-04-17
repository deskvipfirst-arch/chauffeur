export function createPollingInterval(callback: () => void | Promise<void>, intervalMs = 15000) {
  const id = window.setInterval(() => {
    void callback();
  }, intervalMs);

  return () => window.clearInterval(id);
}

export function shouldRefreshOnVisibility(state: DocumentVisibilityState) {
  return state === "visible";
}
