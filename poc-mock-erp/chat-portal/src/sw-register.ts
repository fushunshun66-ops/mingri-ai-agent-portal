export function registerSW() {
  if ("serviceWorker" in navigator) {
    const doRegister = () =>
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] SW registered:", registration.scope);
        })
        .catch((err) => {
          console.warn("[PWA] SW registration failed:", err);
        });

    if (document.readyState === "complete") {
      doRegister();
    } else {
      window.addEventListener("load", doRegister, { once: true });
    }
  }
}
