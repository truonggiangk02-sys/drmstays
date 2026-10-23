CREATE TABLE `listing_overrides` (
  `id` integer PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `price` integer NOT NULL,
  `description` text NOT NULL,
  `active` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `apartment_id` integer NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `check_in` text NOT NULL,
  `check_out` text NOT NULL,
  `guests` integer NOT NULL,
  `message` text NOT NULL,
  `status` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_inquiries_created_at` ON `inquiries` (`created_at`);
