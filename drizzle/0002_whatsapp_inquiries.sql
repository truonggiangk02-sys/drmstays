ALTER TABLE `inquiries` ADD `phone` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `inquiries` ADD `channel` text NOT NULL DEFAULT 'email';
--> statement-breakpoint
ALTER TABLE `inquiries` ADD `request_id` text;
--> statement-breakpoint
ALTER TABLE `inquiries` ADD `telegram_status` text NOT NULL DEFAULT 'not_applicable';
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inquiries_request_id` ON `inquiries` (`request_id`) WHERE `request_id` IS NOT NULL;
--> statement-breakpoint
CREATE TABLE `inquiry_rate_limits` (`key` text PRIMARY KEY NOT NULL, `count` integer NOT NULL);
