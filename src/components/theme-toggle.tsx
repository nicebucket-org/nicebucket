import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/theme-context";

const themeOptions = [
  { value: "light" as const, label: "Light", icon: SunIcon },
  { value: "dark" as const, label: "Dark", icon: MoonIcon },
  { value: "system" as const, label: "System", icon: MonitorIcon },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const currentTheme = themeOptions.find((option) => option.value === theme);
  const CurrentIcon = currentTheme?.icon || SunIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9">
          <CurrentIcon className="size-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className="gap-2"
            >
              <Icon className="size-4" />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
