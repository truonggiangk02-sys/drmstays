ALTER TABLE `listing_overrides` ADD `monthly_price` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `listing_overrides` ADD `usd_nightly` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `listing_overrides` ADD `usd_monthly` integer NOT NULL DEFAULT 0;
