/**
 * `RoutePlaceholder` — a tiny "Coming soon" card used by routes
 * whose pages haven't been migrated yet.
 *
 * Each card is a shadcn `Card` with a title (the section name) and
 * a short "coming soon" body. The card carries an `aria-label` so
 * the page is screen-reader-friendly even when the body text is sparse.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface RoutePlaceholderProps {
	/** Wouter path the placeholder serves (e.g. `/goals`). */
	path: string;
	/** Human-readable title (e.g. `Obiettivi`). */
	title: string;
}

export function RoutePlaceholder({ path, title }: RoutePlaceholderProps) {
	return (
		<div className="mt-6 flex justify-center">
			<Card
				aria-label={`Sezione ${title}`}
				data-testid={`route-placeholder-${path.replace("/", "")}`}
				className="w-full max-w-lg shadow-soft"
			>
				<CardHeader>
					<CardTitle aria-label={title}>{title}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="m-0 text-sm text-muted-foreground" data-testid="in-arrivo">
						In arrivo — questa sezione arriverà nella prossima ondata.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
