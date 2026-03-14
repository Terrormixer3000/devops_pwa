"use client";

import { useState, useCallback, useEffect } from "react";
import { pushService, type PushPermissionState, type PushSupportStatus } from "@/lib/services/pushService";

interface PushState {
  supportStatus: PushSupportStatus;
  permissionState: PushPermissionState;
  isSubscribed: boolean;
  webhookToken: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook der den Push-Notification-Status buendelt.
 * Ersetzt manuelle useEffect+useState Bloecke auf settings und push-test Seiten.
 */
export function usePushState(): PushState {
  const [supportStatus, setSupportStatus] = useState<PushSupportStatus>(() =>
    typeof window === "undefined" ? "unsupported" : pushService.getSupportStatus()
  );
  const [permissionState, setPermissionState] = useState<PushPermissionState>(() =>
    typeof window === "undefined" ? "default" : pushService.getPermissionState()
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [webhookToken, setWebhookToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : pushService.getStoredToken()
  );
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = pushService.getSupportStatus();
      setSupportStatus(status);
      setPermissionState(pushService.getPermissionState());
      setWebhookToken(pushService.getStoredToken());

      if (status === "supported") {
        try {
          const existing = await pushService.getExistingSubscription();
          setIsSubscribed(!!existing);
        } catch {
          setIsSubscribed(false);
        }
      } else {
        setIsSubscribed(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { supportStatus, permissionState, isSubscribed, webhookToken, isLoading, refresh };
}
