import {
	BarChart3,
	Calculator,
	Calendar,
	LineChart,
	Menu,
	MessageCircle,
	PiggyBank,
	Receipt,
	Wallet,
	X,
} from "lucide-react";
import * as React from "react";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { MobileFooterNote } from "@/components/FooterDisclaimer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type NavItem = {
	href: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
	{ href: "/dashboard", label: "Home", icon: BarChart3 },
	{ href: "/plan", label: "Piano", icon: Calendar },
	{ href: "/budget", label: "Budget", icon: Wallet },
	{ href: "/goals", label: "Obiettivi", icon: PiggyBank },
	{ href: "/debts", label: "Debiti", icon: Receipt },
	{ href: "/transactions", label: "Spese", icon: LineChart },
	{ href: "/coach", label: "Mentore", icon: MessageCircle },
	{ href: "/simulator", label: "Simulatore", icon: Calculator },
];

/**
 * Nav principale. Tre layout:
 * - Mobile (<md): top bar compatto + drawer a scomparsa + bottom tab bar
 * - Tablet/Desktop: top bar con brand centrato in container max-w-6xl
 *   e riga di tab orizzontali sotto
 */
export function NavBar() {
	const [location] = useLocation();
	const [open, setOpen] = React.useState(false);

	// Chiude il drawer al cambio rotta
	React.useEffect(() => setOpen(false), [location]);

	return (
		<>
			{/* Header sticky, sotto la status bar iOS in modalità PWA */}
			<header className="sticky sticky-top-safe z-40 border-b border-border/60 glass">
				<div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 md:px-8 lg:px-10">
					<Link
						href="/dashboard"
						className="flex items-center gap-2.5 font-display text-base font-semibold tracking-tight"
					>
						<span
							className="inline-block size-8 rounded-xl bg-gradient-to-br from-violet-400 via-violet-500 to-violet-700 shadow-glow ring-1 ring-white/10"
							aria-hidden
						/>
						<span className="flex items-baseline gap-1">
							<span>Coach</span>
							<span className="text-muted-foreground">Quotidiano</span>
						</span>
					</Link>
					<div className="flex items-center gap-1">
						<ThemeToggle />
						<Button
							variant="ghost"
							size="icon"
							className="md:hidden"
							aria-label={open ? "Chiudi menu" : "Apri menu"}
							aria-expanded={open}
							onClick={() => setOpen((v) => !v)}
						>
							{open ? <X className="size-5" /> : <Menu className="size-5" />}
						</Button>
					</div>
				</div>

				{/* Nav orizzontale desktop (md+) */}
				<nav
					aria-label="Navigazione principale"
					className="mx-auto hidden w-full max-w-6xl items-center gap-1 overflow-x-auto px-4 sm:px-6 md:flex md:h-14 md:px-8 lg:px-10"
				>
					{NAV.map((item) => (
						<NavLink key={item.href} item={item} current={location} />
					))}
				</nav>
			</header>

			{/* Drawer mobile */}
			{open ? (
				<>
					<div
						className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-sm md:hidden"
						aria-hidden
						onClick={() => setOpen(false)}
					/>
					<nav
						aria-label="Navigazione principale"
						className="fixed inset-x-0 top-14 z-30 border-b border-border/60 bg-background p-4 shadow-card md:hidden"
					>
						<ul className="mx-auto grid max-w-6xl grid-cols-2 gap-2">
							{NAV.map((item) => (
								<li key={item.href}>
									<NavLink
										item={item}
										current={location}
										mobile
										onNavigate={() => setOpen(false)}
									/>
								</li>
							))}
						</ul>
					</nav>
				</>
			) : null}

			{/* Bottom tab bar mobile (4 più usati) — sopra la home indicator iOS */}
			<nav
				aria-label="Navigazione rapida"
				className="fixed inset-x-0 bottom-0 sticky-bottom-safe z-30 border-t border-border/60 glass md:hidden"
			>
				<div className="px-3 pt-1.5">
					<MobileFooterNote />
				</div>
				<ul className="mx-auto grid w-full max-w-6xl grid-cols-4 gap-1 px-2 pb-safe-bottom pt-1">
					{NAV.slice(0, 4).map((item) => (
						<li key={item.href}>
							<NavLink item={item} current={location} mobile compact />
						</li>
					))}
				</ul>
			</nav>
		</>
	);
}

function NavLink({
	item,
	current,
	mobile = false,
	compact = false,
	onNavigate,
}: {
	item: NavItem;
	current: string;
	mobile?: boolean;
	compact?: boolean;
	onNavigate?: () => void;
}) {
	const isActive =
		current === item.href || current.startsWith(`${item.href}/`);
	const Icon = item.icon;

	const base = mobile
		? "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
		: "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors";
	const state = isActive
		? "bg-accent/10 text-accent"
		: "text-muted-foreground hover:bg-secondary hover:text-foreground";
	const layout = compact ? "flex-col gap-0.5 py-1.5 text-[10px]" : "";

	return (
		<Link
			href={item.href}
			className={cn(base, state, layout)}
			aria-current={isActive ? "page" : undefined}
			onClick={onNavigate}
		>
			<Icon className={cn("size-4 shrink-0", compact && "size-5")} />
			<span className={cn(compact && "leading-none")}>{item.label}</span>
		</Link>
	);
}
