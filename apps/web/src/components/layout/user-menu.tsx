import { LogOutIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { getUserDisplay } from "@/lib/auth/user-display-store";

function getAvatarInitial(displayName: string | null) {
  const normalizedDisplayName = displayName?.trim();

  return normalizedDisplayName ? normalizedDisplayName.charAt(0).toUpperCase() : "U";
}

export function UserMenu() {
  const { t } = useTranslation(["auth", "common"]);
  const userDisplay = getUserDisplay();
  const displayName = userDisplay?.displayName ?? t("logout.fallbackName", { ns: "auth" });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t("header.userMenu", { ns: "common" })}
          data-testid="user-menu-trigger"
          size="icon"
          variant="outline"
        >
          <span aria-hidden="true">{getAvatarInitial(userDisplay?.displayName ?? null)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium">{displayName}</div>
        <Button className="w-full justify-start" type="button" variant="ghost">
          <LogOutIcon data-icon="inline-start" />
          {t("logout.action", { ns: "auth" })}
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
