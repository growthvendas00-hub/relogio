CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`eyebrow` text DEFAULT 'Coleção Urbana' NOT NULL,
	`description` text NOT NULL,
	`price_cents` integer NOT NULL CHECK (`price_cents` >= 0),
	`compare_at_price_cents` integer CHECK (`compare_at_price_cents` IS NULL OR `compare_at_price_cents` >= 0),
	`stock` integer DEFAULT 0 NOT NULL CHECK (`stock` >= 0),
	`category` text DEFAULT 'Casual' NOT NULL,
	`case_color` text DEFAULT 'Preto' NOT NULL,
	`strap` text DEFAULT 'Aço' NOT NULL,
	`movement` text DEFAULT 'Quartzo' NOT NULL,
	`water_resistance` text DEFAULT '3 ATM' NOT NULL,
	`image_url` text NOT NULL,
	`image_key` text,
	`featured` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);
--> statement-breakpoint
CREATE INDEX `products_active_featured_idx` ON `products` (`active`,`featured`);
--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);
