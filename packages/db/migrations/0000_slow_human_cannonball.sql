CREATE TABLE "cycle_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"game_year" integer NOT NULL,
	"scoring_action_id" text NOT NULL,
	"phase_times" jsonb NOT NULL,
	"budget_seconds" integer NOT NULL,
	"startup_seconds" integer DEFAULT 0 NOT NULL,
	"points_per_piece" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_matrices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"game_year" integer NOT NULL,
	"criteria" jsonb NOT NULL,
	"options" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"game_year" integer NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"cycle_scenario_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"design_matrix_id" uuid,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
