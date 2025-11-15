CREATE TABLE "Nodes" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"surfaceId" varchar(24) NOT NULL,
	"type" varchar(100) NOT NULL,
	"x" double precision,
	"y" double precision,
	"width" double precision DEFAULT 0,
	"height" double precision DEFAULT 0,
	"z" integer,
	"min_x" double precision,
	"min_y" double precision,
	"max_x" double precision,
	"max_y" double precision,
	"data" jsonb,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Surfaces" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
ALTER TABLE "Nodes" ADD CONSTRAINT "Nodes_surfaceId_Surfaces_id_fk" FOREIGN KEY ("surfaceId") REFERENCES "public"."Surfaces"("id") ON DELETE cascade ON UPDATE cascade;