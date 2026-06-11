/**
 * Re-export so existing imports keep working. The actual
 * implementation now lives in `@/components/FooterDisclaimer` and
 * is rendered globally by `<AppShell>`. Pages that previously
 * rendered the footer inline should remove the import once they
 * migrate.
 */
export { FooterDisclaimer } from "@/components/FooterDisclaimer";
