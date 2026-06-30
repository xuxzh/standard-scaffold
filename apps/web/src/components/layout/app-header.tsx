import { LanguageToggle } from "@/components/i18n/language-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

type AppHeaderProps = {
  title: string;
};

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-app-header flex items-center gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6"
    >
      <SidebarTrigger />
      <div className="flex min-w-0 flex-1 items-center">
        <h1 className="truncate text-base font-semibold leading-6">{title}</h1>
      </div>
      <LanguageToggle />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
