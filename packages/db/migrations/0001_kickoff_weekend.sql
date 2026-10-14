CREATE TABLE "kickoff_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace" text NOT NULL,
	"kind" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kickoff_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"voter_key" text NOT NULL,
	"choice" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kickoff_votes" ADD CONSTRAINT "kickoff_votes_item_id_kickoff_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."kickoff_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kickoff_items_workspace_idx" ON "kickoff_items" USING btree ("workspace");--> statement-breakpoint
CREATE UNIQUE INDEX "kickoff_votes_item_voter_idx" ON "kickoff_votes" USING btree ("item_id","voter_key");