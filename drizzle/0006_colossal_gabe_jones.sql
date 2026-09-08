CREATE TYPE "public"."owner_alert_kind" AS ENUM('burofax_plazo', 'iva_apertura', 'iva_cierre', 'monitorio', 'prescripcion');--> statement-breakpoint
CREATE TABLE "burofax_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"payload" text NOT NULL,
	"iv" text NOT NULL,
	"claim_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "burofax_drafts_claim_token_unique" UNIQUE("claim_token")
);
--> statement-breakpoint
CREATE TABLE "owner_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"kind" "owner_alert_kind" NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "owner_alerts" ADD CONSTRAINT "owner_alerts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_alerts" ADD CONSTRAINT "owner_alerts_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "burofax_drafts_expira_idx" ON "burofax_drafts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "owner_alerts_due_idx" ON "owner_alerts" USING btree ("scheduled_at","sent_at");--> statement-breakpoint
CREATE INDEX "owner_alerts_user_idx" ON "owner_alerts" USING btree ("user_id");