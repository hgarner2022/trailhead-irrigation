ALTER TABLE "customer" ADD COLUMN "stripe_payment_method_id" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "card_brand" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "card_last4" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "card_expires" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "card_failed_at" timestamp with time zone;--> statement-breakpoint
update "customer" c
set "stripe_payment_method_id" = sp."stripe_payment_method_id", "card_brand" = sp."card_brand", "card_last4" = sp."card_last4", "card_expires" = sp."card_expires", "card_failed_at" = sp."card_failed_at"
from (
  select distinct on ("customer_id") "customer_id", "stripe_payment_method_id", "card_brand", "card_last4", "card_expires", "card_failed_at"
  from "season_pass"
  where "stripe_payment_method_id" is not null or "card_last4" is not null
  order by "customer_id", ("status" = 'active') desc, "created_at" desc
) sp
where sp."customer_id" = c."id" and c."stripe_payment_method_id" is null and c."card_last4" is null;
