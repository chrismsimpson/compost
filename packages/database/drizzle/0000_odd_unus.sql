CREATE TABLE "Nodes" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
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
