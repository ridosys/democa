/**
 * Resolves once the user is back on this page after something took over
 * the screen — the print dialog, or the Android printer app. Waits a
 * moment first, since that screen may only show up after the call that
 * opened it has returned; then, if the page is hidden, until it is shown
 * again.
 */
export function waitUntilPageReturns(delayMs = 1000): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (document.visibilityState === "visible") {
        resolve();
        return;
      }
      const onChange = () => {
        if (document.visibilityState !== "visible") return;
        document.removeEventListener("visibilitychange", onChange);
        resolve();
      };
      document.addEventListener("visibilitychange", onChange);
    }, delayMs);
  });
}
