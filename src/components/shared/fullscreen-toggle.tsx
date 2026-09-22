"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";

/** Default a caisse screen to fullscreen, like pressing F11 on open. No
 * browser will honor requestFullscreen() without a user gesture in the same
 * event — that's a hard platform restriction (Chrome/Firefox/Safari all
 * enforce it), so a bare call right on mount is silently rejected on every
 * reload. The listeners below catch the cashier's very first pointer, touch
 * or key interaction anywhere on the page instead — still a valid gesture —
 * captured before any inner element can stop it from bubbling, so
 * fullscreen engages on that very first tap/click rather than needing a
 * second, separate one on the toggle button. Renders nothing. */
export function FullscreenAutoEnter() {
  useEffect(() => {
    function enterFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    }
    enterFullscreen();
    const gestureEvents = ["pointerdown", "touchstart", "keydown"] as const;
    gestureEvents.forEach((type) =>
      document.addEventListener(type, enterFullscreen, {
        once: true,
        capture: true,
      }),
    );

    return () => {
      gestureEvents.forEach((type) =>
        document.removeEventListener(type, enterFullscreen, { capture: true }),
      );
    };
  }, []);

  return null;
}

export function FullscreenToggle() {
  const t = useT();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  const label = isFullscreen ? t.pos.exitFullscreen : t.pos.enterFullscreen;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleFullscreen}
      title={label}
      aria-label={label}
    >
      {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
    </Button>
  );
}
