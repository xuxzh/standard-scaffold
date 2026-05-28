import { LogOutIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { getRedirectTarget } from "@/lib/auth/auth-redirect";
import { clearAuthToken } from "@/lib/auth/token-store";
import { clearUserDisplay, getUserDisplay } from "@/lib/auth/user-display-store";

function getAvatarInitial(displayName: string | null) {
  const normalizedDisplayName = displayName?.trim();

  return normalizedDisplayName ? normalizedDisplayName.charAt(0).toUpperCase() : "U";
}

export function UserMenu() {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const redirectLocation = useRouterState({
    select: (state) => ({
      href: state.location.href,
      pathname: state.location.pathname,
      searchStr: state.location.searchStr
    })
  });
  const userDisplay = getUserDisplay();
  const displayName = userDisplay?.displayName ?? t("logout.fallbackName", { ns: "auth" });

  function handleOpenLogoutConfirm() {
    setMenuOpen(false);
    setConfirmOpen(true);
  }

  async function handleConfirmLogout() {
    clearUserDisplay();
    clearAuthToken();
    setConfirmOpen(false);
    await navigate({
      to: "/login",
      search: {
        redirect: getRedirectTarget(redirectLocation)
      },
      replace: true
    });
  }

  return (
    <>
      <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
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
          <DropdownMenuItem onSelect={handleOpenLogoutConfirm}>
            <LogOutIcon data-icon="inline-start" />
            {t("logout.action", { ns: "auth" })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("logout.confirmTitle", { ns: "auth" })}</DialogTitle>
            <DialogDescription>{t("logout.confirmDescription", { ns: "auth" })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmOpen(false)} type="button" variant="outline">
              <XIcon data-icon="inline-start" />
              {t("logout.cancel", { ns: "auth" })}
            </Button>
            <Button onClick={handleConfirmLogout} type="button" variant="destructive">
              <LogOutIcon data-icon="inline-start" />
              {t("logout.action", { ns: "auth" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
