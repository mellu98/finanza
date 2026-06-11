import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";

/**
 * Theme toggle: light <-> dark. Defaults to system on first paint.
 * Icon swaps based on the *resolved* theme (after system preference
 * has been applied) — this is the only way to get the right icon
 * on the first render.
 */
export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => setMounted(true), []);

	const isDark = mounted && resolvedTheme === "dark";

	return (
		<Button
			variant="ghost"
			size="icon"
			aria-label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
			onClick={() => setTheme(isDark ? "light" : "dark")}
		>
			{isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
		</Button>
	);
}
