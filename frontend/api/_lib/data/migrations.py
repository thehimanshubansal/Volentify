"""Idempotent database migrations, applied automatically on the first connection of each API instance.

  2026-11-live-feeds   columns recording where an incident came from (source, source_url, external_id) and the
                       feed_state / feed_cache tables used by the live hazard feeds.
  2026-11-purge-demo   removes the demonstration rows the earlier seed script inserted (Cyclone "Remal", the
                       Brahmaputra/Wayanad/Chamoli/Delhi incidents, nine sample volunteers, sample missions, alerts,
                       mesh nodes and reports, and five sample organisation records). Rows created by real users are
                       kept; missions and evidence attached to the removed sample incidents go with them, and
                       alerts or mesh reports that pointed at them are unlinked.
  2026-11-ops-v4       mission lifecycle (accepted/started/completed times, start position, people helped, outcome),
                       volunteer reviews, the audit log, quarantined mesh nodes and the REJECTED review state.
  2026-11-rate-limits  the rate_limits table: sign-in lockout and registration limits shared by every API instance.
  2026-11-regulators   the four platform regulator accounts (data/regulators.py). An existing account with one of
                       those addresses is taken over: role, verification and password are reset to the provisioned
                       values, so an account registered with the address by someone else cannot keep access.

Each migration runs once, inside a transaction holding an advisory lock, and is recorded in volentify_migrations.
"""

from __future__ import annotations

from typing import Callable

LOCK_ID = 727275

LIVE_FEEDS_SQL = """
ALTER TABLE "disasters" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "disasters" ADD COLUMN IF NOT EXISTS "source_url" TEXT;
ALTER TABLE "disasters" ADD COLUMN IF NOT EXISTS "external_id" TEXT;
CREATE INDEX IF NOT EXISTS "disasters_source_idx" ON "disasters"("source");
CREATE INDEX IF NOT EXISTS "disasters_status_idx" ON "disasters"("status");
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
"""

# Identifiers inserted by the old demonstration seed (api/_lib/data/seed.py before November 2026).
DEMO_DISASTERS = ["dis_remal_puri", "dis_brahmaputra_ghy", "dis_wayanad_slide", "dis_chamoli_fire", "dis_delhi_heat"]
DEMO_ALERTS = ["alt_remal", "alt_brah", "alt_wyd", "alt_chm", "alt_del"]
DEMO_TASKS = ["tsk_puri_evac", "tsk_aiims_triage", "tsk_paradip_food", "tsk_barpeta_boats", "tsk_ghy_drone",
              "tsk_wyd_debris", "tsk_del_water"]
DEMO_MESH_EVENTS = ["d4a1b8c2-3e5f-4a7b-9c1d-2e4f6a8b0c2e", "0b6e2f1a-77c4-4d1e-9a52-31c0de9b7a11",
                    "5c9d3a7e-1f2b-4e8a-b6c4-9d0e1f2a3b4c", "e7f8a9b0-c1d2-4e3f-a4b5-c6d7e8f9a0b1"]
DEMO_MESH_NODES = ["7a2c4e6b-8d0f-4a2c-b4e6-8d0f2a4c6e8b", "8f3b6c20-a19e-4c7b-b8f2-5d9c2e0a4f11",
                   "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f"]
DEMO_VOLUNTEERS = [f"vol_{i:03d}" for i in range(1, 10)]
DEMO_USERS = ["usr_system_command"] + [f"usr_{v}" for v in DEMO_VOLUNTEERS]
DEMO_ORGS = ["org_ndrf", "org_osdma", "org_asdma", "org_ircs", "org_goonj"]


def _purge_demo(conn) -> None:
    steps = [
        ('DELETE FROM "mesh_events" WHERE "event_id" = ANY(%s)', DEMO_MESH_EVENTS),
        ('DELETE FROM "mesh_nodes" WHERE "node_uuid" = ANY(%s) AND NOT EXISTS '
         '(SELECT 1 FROM "mesh_events" e WHERE e."origin_node_id" = "mesh_nodes"."node_uuid")', DEMO_MESH_NODES),
        ('DELETE FROM "alerts" WHERE "id" = ANY(%s)', DEMO_ALERTS),
        ('DELETE FROM "tasks" WHERE "id" = ANY(%s)', DEMO_TASKS),
        ('DELETE FROM "disasters" WHERE "id" = ANY(%s)', DEMO_DISASTERS),
        ('DELETE FROM "volunteer_profiles" WHERE "id" = ANY(%s)', DEMO_VOLUNTEERS),
        ('DELETE FROM "users" WHERE "id" = ANY(%s) AND NOT EXISTS '
         '(SELECT 1 FROM "tasks" t WHERE t."created_by_id" = "users"."id")', DEMO_USERS),
        ('DELETE FROM "organizations" WHERE "id" = ANY(%s)', DEMO_ORGS),
    ]
    for sql, ids in steps:
        with conn.transaction():  # savepoint: one blocked delete must not undo the others
            conn.execute(sql, (ids,))


def _live_feeds(conn) -> None:
    conn.execute(LIVE_FEEDS_SQL)


OPS_V4_SQL = """
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "start_lat" DOUBLE PRECISION;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "start_lng" DOUBLE PRECISION;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "people_helped" INTEGER;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "outcome_note" TEXT;
CREATE INDEX IF NOT EXISTS "tasks_assigned_to_id_idx" ON "tasks"("assigned_to_id");
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
CREATE TABLE IF NOT EXISTS "blocked_nodes" (
    "node_uuid" TEXT PRIMARY KEY,
    "reason" TEXT NOT NULL,
    "blocked_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def _ops_v4(conn) -> None:
    conn.execute(OPS_V4_SQL)


def _rate_limits(conn) -> None:
    conn.execute('CREATE TABLE IF NOT EXISTS "rate_limits" ("key" TEXT PRIMARY KEY, '
                 '"window_start" TIMESTAMPTZ NOT NULL DEFAULT now(), "hits" INTEGER NOT NULL DEFAULT 0)')


REGULATOR_PROFILE = {"regulator": True, "title": "Regulation & monitoring", "must_change_password": True}


def _regulators(conn) -> None:
    from psycopg.types.json import Jsonb

    from .regulators import REGULATORS

    for r in REGULATORS:
        conn.execute(
            'INSERT INTO "users" ("id", "name", "email", "phone", "password_hash", "role", "provider", "is_verified", '
            '"onboarded", "profile_data", "updated_at") VALUES (%s, %s, %s, \'\', %s, \'INCIDENT_ADMIN\', '
            '\'credentials\', true, true, %s, now()) ON CONFLICT ("email") DO UPDATE SET '
            '"password_hash" = EXCLUDED."password_hash", "role" = \'INCIDENT_ADMIN\', "is_verified" = true, '
            '"onboarded" = true, "google_id" = NULL, "provider" = \'credentials\', '
            '"profile_data" = "users"."profile_data" || EXCLUDED."profile_data", "updated_at" = now()',
            (r["id"], r["name"], r["email"], r["password_hash"], Jsonb(REGULATOR_PROFILE)))


MIGRATIONS: list[tuple[str, Callable]] = [
    ("2026-11-live-feeds", _live_feeds),
    ("2026-11-purge-demo", _purge_demo),
    ("2026-11-ops-v4", _ops_v4),
    ("2026-11-regulators", _regulators),
    ("2026-11-rate-limits", _rate_limits),
]


def apply(conn) -> list[str]:
    """Run pending migrations; returns the names applied (empty on the fast path)."""
    names = [n for n, _ in MIGRATIONS]
    conn.execute('CREATE TABLE IF NOT EXISTS "volentify_migrations" '
                 '("name" TEXT PRIMARY KEY, "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now())')
    done = {r["name"] for r in conn.execute('SELECT "name" FROM "volentify_migrations" WHERE "name" = ANY(%s)',
                                            (names,)).fetchall()}
    if len(done) == len(names):
        return []
    applied = []
    with conn.transaction():
        conn.execute("SELECT pg_advisory_xact_lock(%s)", (LOCK_ID,))
        done = {r["name"] for r in conn.execute('SELECT "name" FROM "volentify_migrations"').fetchall()}
        for name, fn in MIGRATIONS:
            if name in done:
                continue
            fn(conn)
            conn.execute('INSERT INTO "volentify_migrations" ("name") VALUES (%s)', (name,))
            applied.append(name)
    return applied
