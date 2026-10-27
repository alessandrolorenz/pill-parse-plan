/**
 * figma-capture.js
 *
 * Self-contained Figma HTML-to-Design capture loader.
 * Dynamically injects the Figma capture SDK and auto-triggers a capture
 * once the API is available.
 *
 * Usage — add ONE line anywhere in your HTML:
 *   <script src="/scripts/figma-capture.js" async></script>
 *
 * Or load on demand from the browser console / any JS context:
 *   const s = document.createElement('script');
 *   s.src = '/scripts/figma-capture.js';
 *   document.head.appendChild(s);
 */
(function () {
  'use strict';

  const CAPTURE_SDK_URL = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
  const CAPTURE_ENDPOINT = 'https://mcp.figma.com/mcp/html-to-design';
  const POLL_INTERVAL_MS = 500;
  const MAX_POLL_ATTEMPTS = 20;
  const PRE_CAPTURE_DELAY_MS = 2000;

  /** Inject the external Figma capture SDK script. */
  function injectCaptureSDK() {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${CAPTURE_SDK_URL}"]`)) {
        // Already injected — resolve immediately.
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = CAPTURE_SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`[Figma Capture] Failed to load SDK from ${CAPTURE_SDK_URL}`));
      document.head.appendChild(script);
    });
  }

  /** Poll until window.figma.captureForDesign is available, then fire. */
  function waitAndCapture() {
    console.log('[Figma Capture] Waiting for capture API...');

    let attempts = 0;

    const poll = setInterval(() => {
      attempts++;

      if (window.figma && typeof window.figma.captureForDesign === 'function') {
        clearInterval(poll);
        console.log('[Figma Capture] API found! Triggering capture in', PRE_CAPTURE_DELAY_MS, 'ms...');

        setTimeout(() => {
          window.figma
            .captureForDesign({
              captureId: 'auto-capture-' + Date.now(),
              endpoint: CAPTURE_ENDPOINT,
              selector: 'body',
              verbose: true,
            })
            .then((result) => {
              console.log('[Figma Capture] Capture completed:', result);
            })
            .catch((error) => {
              console.error('[Figma Capture] Capture failed:', error);
            });
        }, PRE_CAPTURE_DELAY_MS);

      } else if (attempts >= MAX_POLL_ATTEMPTS) {
        clearInterval(poll);
        console.warn(
          '[Figma Capture] API not available after',
          MAX_POLL_ATTEMPTS,
          'attempts (',
          (MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000,
          's).'
        );
      }
    }, POLL_INTERVAL_MS);
  }

  /** Entry point — runs after the page has loaded. */
  function init() {
    console.log('[Figma Capture] Initializing...');

    injectCaptureSDK()
      .then(() => {
        console.log('[Figma Capture] SDK injected.');
        waitAndCapture();
      })
      .catch((err) => {
        console.error(err.message);
      });
  }

  // Defer until the page is fully loaded so the DOM is ready for capture.
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();