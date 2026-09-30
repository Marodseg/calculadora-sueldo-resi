import { useEffect, useState } from "react";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

/** Evento (no estándar, solo Chromium) que permite lanzar el diálogo de instalación. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Registra el service worker y avisa cuando hay una versión nueva o la app ya funciona sin conexión. */
export function registerServiceWorker() {
  const update = registerSW({
    onNeedRefresh() {
      toast("Hay una versión nueva", {
        duration: Infinity,
        action: { label: "Actualizar", onClick: () => void update(true) },
      });
    },
    onOfflineReady() {
      toast.success("Lista para usar sin conexión");
    },
  });
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Estado de instalación: si se puede instalar con un clic (Chromium) o hay que explicarlo (iOS). */
export function useInstall() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setEvent(null);
  };

  return { installed, canPrompt: event !== null, showIosHint: !installed && isIos(), install };
}
