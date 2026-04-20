import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const PUSH_PROMPT_STORAGE_KEY = "tsmroofpro.pushPrompted.v1";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushNotificationManager() {
  const { user, isActive } = useAuth();

  useEffect(() => {
    if (!user?.id || !isActive) return;
    if (!VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return;
    }

    let cancelled = false;

    const ensurePushSubscription = async () => {
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;

      let permission = Notification.permission;
      if (permission === "default" && !localStorage.getItem(PUSH_PROMPT_STORAGE_KEY)) {
        localStorage.setItem(PUSH_PROMPT_STORAGE_KEY, "true");
        permission = await Notification.requestPermission();
      }

      if (cancelled || permission !== "granted") return;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      await supabase.functions.invoke("manage-push-subscription", {
        body: {
          action: "subscribe",
          subscription: subscription.toJSON(),
        },
      });
    };

    ensurePushSubscription().catch((error) => {
      console.error("Failed to initialize push notifications:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [isActive, user?.id]);

  return null;
}
