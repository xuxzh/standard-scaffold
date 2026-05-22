import { LaptopMinimalIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme, type ResolvedTheme, type ThemeMode } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "跟随系统" },
];

function ThemeIcon({
  themeMode,
  resolvedTheme,
}: {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
}) {
  if (themeMode === "system") {
    return resolvedTheme === "dark" ? <MoonIcon /> : <SunIcon />;
  }

  if (themeMode === "dark") {
    return <MoonIcon />;
  }

  return <SunIcon />;
}

export function ThemeToggle() {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-testid="theme-toggle" variant="outline" size="sm" aria-label="主题切换">
          <ThemeIcon themeMode={themeMode} resolvedTheme={resolvedTheme} />
          <span className="hidden sm:inline">主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={themeMode}
          onValueChange={(value) => setThemeMode(value as ThemeMode)}
        >
          {themeOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
              {option.value === "system" ? (
                <LaptopMinimalIcon className="ml-auto size-4" />
              ) : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
