-- Volentify schema — equivalent to prisma/schema.prisma (Prisma naming conventions).
-- Applied automatically by the API the first time it connects to an empty Neon database, so it needs no manual
-- migration; later changes are applied by api/_lib/data/migrations.py. `npm run db:push` remains the Prisma path.

DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('CITIZEN', 'VOLUNTEER', 'NGO_MEMBER', 'RESEARCHER', 'INCIDENT_ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MODERATE', 'LOW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SourceType" AS ENUM ('OFFICIAL', 'NEWS', 'SOCIAL', 'SENSOR', 'CITIZEN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MeshEventType" AS ENUM ('PERSON_RESCUED', 'PERSON_MISSING', 'PERSON_TRAPPED', 'MEDICAL_EMERGENCY', 'FIRE', 'FLOOD', 'RESOURCE_REQUEST', 'VOLUNTEER_STATUS', 'DISASTER_STATUS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MeshPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReviewStatus" AS ENUM ('UNREVIEWED', 'REVIEWED', 'PROMOTED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "registration_no" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_name_key" ON "organizations"("name");

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "password_hash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "state_district" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "provider" TEXT NOT NULL DEFAULT 'credentials',
    "google_id" TEXT,
    "avatar_url" TEXT,
    "blood_group" TEXT,
    "emergency_contact" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "profile_data" JSONB NOT NULL DEFAULT '{}',
    "muster_code" TEXT,
    "muster_issued_at" TIMESTAMP(3),
    "org_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_key" ON "users"("google_id");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");

CREATE TABLE IF NOT EXISTS "volunteer_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "skills" TEXT[],
    "current_lat" DOUBLE PRECISION NOT NULL,
    "current_lng" DOUBLE PRECISION NOT NULL,
    "location_name" TEXT NOT NULL DEFAULT 'Field Location',
    "availability" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "missions_done" INTEGER NOT NULL DEFAULT 0,
    "total_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "badge_level" TEXT NOT NULL DEFAULT 'Tier-1 Field Responder',
    "response_rate" DOUBLE PRECISION NOT NULL DEFAULT 98.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "volunteer_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "volunteer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "volunteer_profiles_user_id_key" ON "volunteer_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "volunteer_profiles_availability_idx" ON "volunteer_profiles"("availability");

CREATE TABLE IF NOT EXISTS "disasters" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'HIGH',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "location" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "radius_km" DOUBLE PRECISION NOT NULL DEFAULT 25.0,
    "polygon_geojson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "affected_pop" TEXT,
    "summary" TEXT NOT NULL,
    "wind_speed_kmh" DOUBLE PRECISION,
    "rainfall_mm" DOUBLE PRECISION,
    "surge_meters" DOUBLE PRECISION,
    "org_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "source_url" TEXT,
    "external_id" TEXT,
    CONSTRAINT "disasters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "disasters_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "disasters_code_key" ON "disasters"("code");
CREATE INDEX IF NOT EXISTS "disasters_severity_idx" ON "disasters"("severity");
CREATE INDEX IF NOT EXISTS "disasters_category_idx" ON "disasters"("category");
CREATE INDEX IF NOT EXISTS "disasters_state_idx" ON "disasters"("state");

CREATE TABLE IF NOT EXISTS "tasks" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "urgency" "Severity" NOT NULL DEFAULT 'HIGH',
    "required_skill" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "location_name" TEXT NOT NULL DEFAULT 'Incident Site',
    "quantity_needed" INTEGER NOT NULL DEFAULT 1,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "disaster_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "accepted_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "start_lat" DOUBLE PRECISION,
    "start_lng" DOUBLE PRECISION,
    "people_helped" INTEGER,
    "outcome_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tasks_disaster_id_fkey" FOREIGN KEY ("disaster_id") REFERENCES "disasters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "tasks_code_key" ON "tasks"("code");
CREATE INDEX IF NOT EXISTS "tasks_urgency_idx" ON "tasks"("urgency");
CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks"("status");
CREATE INDEX IF NOT EXISTS "tasks_required_skill_idx" ON "tasks"("required_skill");

CREATE TABLE IF NOT EXISTS "evidence" (
    "id" TEXT NOT NULL,
    "disaster_id" TEXT NOT NULL,
    "author_id" TEXT,
    "source" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL DEFAULT 'OFFICIAL',
    "claim_text" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'SUPPORTING',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.92,
    "language" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "evidence_disaster_id_fkey" FOREIGN KEY ("disaster_id") REFERENCES "disasters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "evidence_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "evidence_source_type_idx" ON "evidence"("source_type");
CREATE INDEX IF NOT EXISTS "evidence_relation_idx" ON "evidence"("relation");

CREATE TABLE IF NOT EXISTS "alerts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "level" "Severity" NOT NULL DEFAULT 'CRITICAL',
    "location" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "advisory" TEXT NOT NULL,
    "disaster_id" TEXT,
    "sender_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "alerts_disaster_id_fkey" FOREIGN KEY ("disaster_id") REFERENCES "disasters"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "alerts_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "alerts_code_key" ON "alerts"("code");
CREATE INDEX IF NOT EXISTS "alerts_level_idx" ON "alerts"("level");
CREATE INDEX IF NOT EXISTS "alerts_state_idx" ON "alerts"("state");

CREATE TABLE IF NOT EXISTS "mesh_nodes" (
    "id" TEXT NOT NULL,
    "node_uuid" TEXT NOT NULL,
    "volunteer_id" TEXT,
    "last_lat" DOUBLE PRECISION,
    "last_lng" DOUBLE PRECISION,
    "battery_level" DOUBLE PRECISION,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mesh_nodes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mesh_nodes_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "mesh_nodes_node_uuid_key" ON "mesh_nodes"("node_uuid");
CREATE INDEX IF NOT EXISTS "mesh_nodes_last_seen_at_idx" ON "mesh_nodes"("last_seen_at");

CREATE TABLE IF NOT EXISTS "mesh_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "origin_node_id" TEXT NOT NULL,
    "disaster_id" TEXT,
    "type" "MeshEventType" NOT NULL,
    "priority" "MeshPriority" NOT NULL DEFAULT 'MEDIUM',
    "payload" JSONB NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "hop_count" INTEGER NOT NULL DEFAULT 0,
    "ttl" INTEGER NOT NULL DEFAULT 5,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "promoted_task_id" TEXT,
    CONSTRAINT "mesh_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mesh_events_origin_node_id_fkey" FOREIGN KEY ("origin_node_id") REFERENCES "mesh_nodes"("node_uuid") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mesh_events_disaster_id_fkey" FOREIGN KEY ("disaster_id") REFERENCES "disasters"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "mesh_events_promoted_task_id_fkey" FOREIGN KEY ("promoted_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "mesh_events_event_id_key" ON "mesh_events"("event_id");
CREATE INDEX IF NOT EXISTS "mesh_events_type_idx" ON "mesh_events"("type");
CREATE INDEX IF NOT EXISTS "mesh_events_priority_idx" ON "mesh_events"("priority");
CREATE INDEX IF NOT EXISTS "mesh_events_observed_at_idx" ON "mesh_events"("observed_at");
CREATE INDEX IF NOT EXISTS "mesh_events_disaster_id_idx" ON "mesh_events"("disaster_id");

-- Live hazard feeds (engines/live.py): last refresh per feed, and cached third-party lookups (OSM facilities).
CREATE TABLE IF NOT EXISTS "feed_state" (
    "feed" TEXT PRIMARY KEY,
    "synced_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "status" JSONB
);
CREATE TABLE IF NOT EXISTS "feed_cache" (
    "key" TEXT PRIMARY KEY,
    "payload" JSONB NOT NULL,
    "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews of volunteers by other members (one per author and volunteer; editable).
CREATE TABLE IF NOT EXISTS "volunteer_reviews" (
    "id" TEXT NOT NULL,
    "volunteer_user_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "task_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "volunteer_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "volunteer_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "volunteer_reviews_volunteer_user_id_fkey" FOREIGN KEY ("volunteer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "volunteer_reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "volunteer_reviews_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "volunteer_reviews_volunteer_author_key" ON "volunteer_reviews"("volunteer_user_id", "author_id");

-- Tamper-evident audit trail of privileged actions (CERT-In directions: keep at least 180 days). Append-only.
CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" BIGSERIAL PRIMARY KEY,
    "at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "actor_id" TEXT,
    "actor_email" TEXT,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "prev_hash" TEXT,
    "hash" TEXT
);
CREATE INDEX IF NOT EXISTS "audit_log_at_idx" ON "audit_log"("at");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log"("action");

-- Mesh nodes quarantined by command after deliberate false or abusive reports; their uploads are dropped.
CREATE TABLE IF NOT EXISTS "blocked_nodes" (
    "node_uuid" TEXT PRIMARY KEY,
    "reason" TEXT NOT NULL,
    "blocked_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cross-instance rate limits (sign-in attempts, registrations): one fixed window per key.
CREATE TABLE IF NOT EXISTS "rate_limits" (
    "key" TEXT PRIMARY KEY,
    "window_start" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "hits" INTEGER NOT NULL DEFAULT 0
);

-- Platform regulator accounts (regulation & monitoring). Passwords are scrypt hashes; see api/_lib/data/regulators.py.
INSERT INTO "users" ("id", "name", "email", "phone", "password_hash", "role", "provider", "is_verified", "onboarded", "profile_data", "updated_at") VALUES
    ('usr_regulator_gurpreet', 'Gurpreet', 'gurpreet@volentify.com', '', 'scrypt$ftGbrAlO/XD6boT+Jvta2w==$xc0tYoYOJ7PCB1qn6fVoWbOrU+qexLid2N+fLFncmCM=', 'INCIDENT_ADMIN', 'credentials', true, true, '{"regulator": true, "title": "Regulation & monitoring", "must_change_password": true}', CURRENT_TIMESTAMP),
    ('usr_regulator_gyanvir', 'Gyanvir', 'gyanvir@volentify.com', '', 'scrypt$Lyv+EY/8I3oG0pxqwNf6nw==$2X8rGpoZT8IsnAU6G2XTlKzQ1LtO8U2T3s6oh5nQ4UM=', 'INCIDENT_ADMIN', 'credentials', true, true, '{"regulator": true, "title": "Regulation & monitoring", "must_change_password": true}', CURRENT_TIMESTAMP),
    ('usr_regulator_himanshu', 'Himanshu', 'himanshu@volentify.com', '', 'scrypt$YFHnd+pNa+1hnlBNmBG+NA==$Qm9d5kbdPbNX6rb3e28kW0JjWT0skiyw9ggnirpKv1c=', 'INCIDENT_ADMIN', 'credentials', true, true, '{"regulator": true, "title": "Regulation & monitoring", "must_change_password": true}', CURRENT_TIMESTAMP),
    ('usr_regulator_rajveer', 'Rajveer', 'rajveer@volentify.com', '', 'scrypt$Lu5UdFMtho32PFdSTUVYmg==$Uu7/xGk2k5XCDTuoLbWD/Al93h46eE8MEGZht8Umu24=', 'INCIDENT_ADMIN', 'credentials', true, true, '{"regulator": true, "title": "Regulation & monitoring", "must_change_password": true}', CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO NOTHING;
