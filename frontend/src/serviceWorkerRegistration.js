const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register(config) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL || "/", window.location.href);

    if (publicUrl.origin !== window.location.origin) {
      console.warn("Service worker registration skipped: different origin.");
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL || ""}/service-worker.js`;

      if (isLocalhost) {
        console.log("Running on localhost → validating service worker");
        checkValidServiceWorker(swUrl, config);
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[PWA] Service Worker registered:', registration);

      if (config && config.onSuccess) {
        config.onSuccess(registration);
      }
    })
    .catch((error) => {
      console.error('[PWA] Error registering service worker:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then((response) => {
      if (response.status === 404) {
        console.warn("[PWA] Service worker not found (404). Unregistering...");
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister();
        });
      } else {
        console.log("[PWA] Service worker found. Registering...");
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log("[PWA] Offline: using cached content.");
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
