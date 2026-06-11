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
	{ href: "/coach", label: "Coach", icon: MessageCircle },
	{ href: "/simulator", label: "Simulatore", icon: Calculator },
];

/**
 * Mobile-first nav: bottom tab bar on small screens, top tabs on
 * tablet+, drawer for overflow. Sticky header with theme toggle.
 */
export function NavBar() {
	const [location] = useLocation();
	const [open, setOpen] = React.useState(false);

	// Close drawer on route change
	React.useEffect(() => setOpen(false), [location]);

	return (
		<>
			{/* Top app bar — sticky, sits below the iOS status bar when launched as PWA */}
			<header className="sticky sticky-top-safe z-40 border-b border-border/60 glass">
				<div className="container flex h-14 items-center justify-between gap-2">
					<Link
						href="/dashboard"
						className="flex items-center gap-2 font-display text-base font-semibold tracking-tight"
					>
						<span
							className="inline-block size-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-glow"
							aria-hidden
						/>
						<span>Daily Coach</span>
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

				{/* Desktop nav (md+) — horizontal tabs */}
				<nav
					aria-label="Navigazione principale"
					className="container hidden h-12 items-center gap-1 overflow-x-auto md:flex"
				>
					{NAV.map((item) => (
						<NavLink key={item.href} item={item} current={location} />
					))}
				</nav>
			</header>

			{/* Mobile drawer */}
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
						<ul className="grid grid-cols-2 gap-2">
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

			{/* Mobile bottom tab bar (only the 4 most-used) — sits above the iOS home indicator */}
			<nav
				aria-label="Navigazione rapida"
				className="fixed inset-x-0 bottom-0 sticky-bottom-safe z-30 border-t border-border/60 glass md:hidden"
			>
				<ul className="container grid grid-cols-4 gap-1 px-2 pb-safe-bottom pt-1">
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
		: "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors";
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
