import { useEffect, useRef } from "react";

type FormSessionInitializerOptions = {
  initialize: () => void;
  open: boolean;
  sessionKey: string;
};

type FormSessionState = {
  open: boolean;
  sessionKey: string | null;
};

export function useFormSessionInitializer({
  initialize,
  open,
  sessionKey,
}: FormSessionInitializerOptions) {
  const sessionState = useRef<FormSessionState>({
    open: false,
    sessionKey: null,
  });

  useEffect(() => {
    if (!open) {
      sessionState.current = {
        open: false,
        sessionKey: null,
      };
      return;
    }

    if (
      sessionState.current.open &&
      sessionState.current.sessionKey === sessionKey
    ) {
      return;
    }

    initialize();
    sessionState.current = {
      open: true,
      sessionKey,
    };
  }, [initialize, open, sessionKey]);
}
