(() => {
  if (document.body?.classList?.contains("cms-administrator")) return;
  const key = "cc-visit-sent";
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch (_) { /* private mode */ }

  const payload = JSON.stringify({
    path: location.pathname + location.search,
    t: Date.now(),
  });

  // Local editor/preview server
  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    navigator.sendBeacon?.(
      `/api/analytics/visit?path=${encodeURIComponent(location.pathname)}`,
      new Blob([payload], { type: "application/json" }),
    ) || fetch(`/api/analytics/visit?path=${encodeURIComponent(location.pathname)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
    return;
  }

  // Public GitHub Pages: lightweight shared counter namespace
  fetch(`https://api.countapi.xyz/hit/villagercrafter-captain-campaign/visits`, { mode: "cors" }).catch(() => {});
})();
