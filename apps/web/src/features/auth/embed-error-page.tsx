import { useSearch } from "@tanstack/react-router";
import { AlertTriangleIcon, EyeIcon, RotateCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  acquireEmbedToken,
  setEmbedSkipAuth,
  type EmbedErrorCode,
} from "@/lib/auth/auth-embed";

const KNOWN_CODES: ReadonlyArray<EmbedErrorCode> = [
  "NO_TOKEN",
  "PARSE_ERROR",
  "TIMEOUT",
  "PARENT_DISCONNECTED",
];

// Fallback destination when the user lands on the error page directly
// (no `from` search param). The first packaging page is a reasonable
// default for "I just want to look around".
const DEFAULT_EMBED_TARGET = "/embed/packaging/packaging-type";

function isKnownErrorCode(value: unknown): value is EmbedErrorCode {
  return (
    typeof value === "string" &&
    (KNOWN_CODES as ReadonlyArray<string>).includes(value)
  );
}

export function EmbedErrorPage() {
  const { t } = useTranslation("common");
  const search = useSearch({ strict: false }) as {
    embedError?: unknown;
    from?: unknown;
  };
  const errorCode: EmbedErrorCode = isKnownErrorCode(search.embedError)
    ? search.embedError
    : "NO_TOKEN";
  const fromPath =
    typeof search.from === "string" && search.from.startsWith("/")
      ? search.from
      : DEFAULT_EMBED_TARGET;

  async function handleRetry() {
    // Re-run the acquisition protocol. If it succeeds, navigate back to
    // the original path (the parent layout re-renders and the child
    // route mounts). If it fails again, refresh this page with the
    // latest error code.
    const result = await acquireEmbedToken();
    if (result === null) {
      window.location.assign(fromPath);
    } else {
      const next = new URL(window.location.href);
      next.searchParams.set("embedError", result.code);
      window.location.replace(next.toString());
    }
  }

  function handleIgnoreToken() {
    setEmbedSkipAuth(true);
    window.location.assign(fromPath);
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md" data-testid="embed-error-page">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon aria-hidden className="size-5" />
            <span className="text-sm font-medium">
              {t("pages.embedError.title")}
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("pages.embedError.description")}
            </p>
            <p
              className="text-sm text-foreground"
              data-testid="embed-error-code-message"
            >
              {t(`pages.embedError.codes.${errorCode}`)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleRetry}
            className="w-full"
          >
            <RotateCwIcon data-icon="inline-start" />
            {t("pages.embedError.retry")}
          </Button>
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              onClick={handleIgnoreToken}
              className="w-full"
              data-testid="embed-error-ignore-button"
            >
              <EyeIcon data-icon="inline-start" />
              {t("pages.embedError.ignore")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t("pages.embedError.ignoreHint")}
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
