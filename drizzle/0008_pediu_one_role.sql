-- One account keeps the role from signup. Admin accounts stay as they are.
-- A store or courier profile opened within a day of the account is that signup.
-- A profile added later, on a customer account, is turned off.
WITH store_at AS (
  SELECT "ownerId" AS user_id, MIN("createdAt") AS created_at
  FROM "pediu_stores"
  GROUP BY "ownerId"
),
courier_at AS (
  SELECT "userId" AS user_id, MIN("createdAt") AS created_at
  FROM "pediu_courier_profiles"
  GROUP BY "userId"
),
decision AS (
  SELECT
    u.id,
    CASE
      WHEN u.role = 'admin' THEN 'admin'
      WHEN s.created_at IS NOT NULL
        AND c.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours'
        AND s.created_at <= c.created_at THEN 'merchant'
      WHEN s.created_at IS NOT NULL
        AND c.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at < s.created_at THEN 'courier'
      WHEN s.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours' THEN 'merchant'
      WHEN c.created_at IS NOT NULL
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours' THEN 'courier'
      WHEN u."usesCustomerApp" = 0
        AND s.created_at IS NOT NULL
        AND (c.created_at IS NULL OR s.created_at <= c.created_at) THEN 'merchant'
      WHEN u."usesCustomerApp" = 0 AND c.created_at IS NOT NULL THEN 'courier'
      WHEN u.role = 'merchant' AND s.created_at IS NOT NULL THEN 'merchant'
      WHEN u.role = 'courier' AND c.created_at IS NOT NULL THEN 'courier'
      ELSE 'customer'
    END AS kept
  FROM "users" u
  LEFT JOIN store_at s ON s.user_id = u.id
  LEFT JOIN courier_at c ON c.user_id = u.id
  WHERE u."loginMethod" IS DISTINCT FROM 'closed'
)
DELETE FROM "pediu_account_roles" ar
USING decision d
WHERE ar."userId" = d.id
  AND d.kept <> 'admin'
  AND ar.role <> d.kept;
--> statement-breakpoint
WITH store_at AS (
  SELECT "ownerId" AS user_id, MIN("createdAt") AS created_at
  FROM "pediu_stores"
  GROUP BY "ownerId"
),
courier_at AS (
  SELECT "userId" AS user_id, MIN("createdAt") AS created_at
  FROM "pediu_courier_profiles"
  GROUP BY "userId"
),
decision AS (
  SELECT
    u.id,
    CASE
      WHEN u.role = 'admin' THEN 'admin'
      WHEN s.created_at IS NOT NULL
        AND c.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours'
        AND s.created_at <= c.created_at THEN 'merchant'
      WHEN s.created_at IS NOT NULL
        AND c.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at < s.created_at THEN 'courier'
      WHEN s.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours' THEN 'merchant'
      WHEN c.created_at IS NOT NULL
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours' THEN 'courier'
      WHEN u."usesCustomerApp" = 0
        AND s.created_at IS NOT NULL
        AND (c.created_at IS NULL OR s.created_at <= c.created_at) THEN 'merchant'
      WHEN u."usesCustomerApp" = 0 AND c.created_at IS NOT NULL THEN 'courier'
      WHEN u.role = 'merchant' AND s.created_at IS NOT NULL THEN 'merchant'
      WHEN u.role = 'courier' AND c.created_at IS NOT NULL THEN 'courier'
      ELSE 'customer'
    END AS kept
  FROM "users" u
  LEFT JOIN store_at s ON s.user_id = u.id
  LEFT JOIN courier_at c ON c.user_id = u.id
  WHERE u."loginMethod" IS DISTINCT FROM 'closed'
)
INSERT INTO "pediu_account_roles" ("userId", "role")
SELECT d.id, d.kept
FROM decision d
WHERE d.kept <> 'admin'
ON CONFLICT ("userId", "role") DO NOTHING;
--> statement-breakpoint
WITH store_at AS (
  SELECT "ownerId" AS user_id, MIN("createdAt") AS created_at
  FROM "pediu_stores"
  GROUP BY "ownerId"
),
courier_at AS (
  SELECT "userId" AS user_id, MIN("createdAt") AS created_at
  FROM "pediu_courier_profiles"
  GROUP BY "userId"
),
decision AS (
  SELECT
    u.id,
    CASE
      WHEN u.role = 'admin' THEN 'admin'
      WHEN s.created_at IS NOT NULL
        AND c.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours'
        AND s.created_at <= c.created_at THEN 'merchant'
      WHEN s.created_at IS NOT NULL
        AND c.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at < s.created_at THEN 'courier'
      WHEN s.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours' THEN 'merchant'
      WHEN c.created_at IS NOT NULL
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours' THEN 'courier'
      WHEN u."usesCustomerApp" = 0
        AND s.created_at IS NOT NULL
        AND (c.created_at IS NULL OR s.created_at <= c.created_at) THEN 'merchant'
      WHEN u."usesCustomerApp" = 0 AND c.created_at IS NOT NULL THEN 'courier'
      WHEN u.role = 'merchant' AND s.created_at IS NOT NULL THEN 'merchant'
      WHEN u.role = 'courier' AND c.created_at IS NOT NULL THEN 'courier'
      ELSE 'customer'
    END AS kept
  FROM "users" u
  LEFT JOIN store_at s ON s.user_id = u.id
  LEFT JOIN courier_at c ON c.user_id = u.id
  WHERE u."loginMethod" IS DISTINCT FROM 'closed'
)
UPDATE "users" u
SET
  role = CASE d.kept
    WHEN 'merchant' THEN 'merchant'
    WHEN 'courier' THEN 'courier'
    WHEN 'admin' THEN 'admin'
    ELSE 'user'
  END,
  "usesCustomerApp" = CASE WHEN d.kept = 'customer' THEN 1 ELSE 0 END
FROM decision d
WHERE u.id = d.id
  AND d.kept <> 'admin';
--> statement-breakpoint
WITH store_at AS (
  SELECT "ownerId" AS user_id, MIN("createdAt") AS created_at
  FROM "pediu_stores"
  GROUP BY "ownerId"
),
courier_at AS (
  SELECT "userId" AS user_id, MIN("createdAt") AS created_at
  FROM "pediu_courier_profiles"
  GROUP BY "userId"
),
decision AS (
  SELECT
    u.id,
    CASE
      WHEN u.role = 'admin' THEN 'admin'
      WHEN s.created_at IS NOT NULL
        AND c.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours'
        AND s.created_at <= c.created_at THEN 'merchant'
      WHEN s.created_at IS NOT NULL
        AND c.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at < s.created_at THEN 'courier'
      WHEN s.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours' THEN 'merchant'
      WHEN c.created_at IS NOT NULL
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours' THEN 'courier'
      WHEN u."usesCustomerApp" = 0
        AND s.created_at IS NOT NULL
        AND (c.created_at IS NULL OR s.created_at <= c.created_at) THEN 'merchant'
      WHEN u."usesCustomerApp" = 0 AND c.created_at IS NOT NULL THEN 'courier'
      WHEN u.role = 'merchant' AND s.created_at IS NOT NULL THEN 'merchant'
      WHEN u.role = 'courier' AND c.created_at IS NOT NULL THEN 'courier'
      ELSE 'customer'
    END AS kept
  FROM "users" u
  LEFT JOIN store_at s ON s.user_id = u.id
  LEFT JOIN courier_at c ON c.user_id = u.id
  WHERE u."loginMethod" IS DISTINCT FROM 'closed'
)
UPDATE "pediu_stores" s
SET "isOpen" = 0
FROM decision d
WHERE s."ownerId" = d.id
  AND d.kept NOT IN ('merchant', 'admin');
--> statement-breakpoint
WITH store_at AS (
  SELECT "ownerId" AS user_id, MIN("createdAt") AS created_at
  FROM "pediu_stores"
  GROUP BY "ownerId"
),
courier_at AS (
  SELECT "userId" AS user_id, MIN("createdAt") AS created_at
  FROM "pediu_courier_profiles"
  GROUP BY "userId"
),
decision AS (
  SELECT
    u.id,
    CASE
      WHEN u.role = 'admin' THEN 'admin'
      WHEN s.created_at IS NOT NULL
        AND c.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours'
        AND s.created_at <= c.created_at THEN 'merchant'
      WHEN s.created_at IS NOT NULL
        AND c.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours'
        AND c.created_at < s.created_at THEN 'courier'
      WHEN s.created_at IS NOT NULL
        AND s.created_at >= u."createdAt" - interval '1 minute'
        AND s.created_at <= u."createdAt" + interval '24 hours' THEN 'merchant'
      WHEN c.created_at IS NOT NULL
        AND c.created_at >= u."createdAt" - interval '1 minute'
        AND c.created_at <= u."createdAt" + interval '24 hours' THEN 'courier'
      WHEN u."usesCustomerApp" = 0
        AND s.created_at IS NOT NULL
        AND (c.created_at IS NULL OR s.created_at <= c.created_at) THEN 'merchant'
      WHEN u."usesCustomerApp" = 0 AND c.created_at IS NOT NULL THEN 'courier'
      WHEN u.role = 'merchant' AND s.created_at IS NOT NULL THEN 'merchant'
      WHEN u.role = 'courier' AND c.created_at IS NOT NULL THEN 'courier'
      ELSE 'customer'
    END AS kept
  FROM "users" u
  LEFT JOIN store_at s ON s.user_id = u.id
  LEFT JOIN courier_at c ON c.user_id = u.id
  WHERE u."loginMethod" IS DISTINCT FROM 'closed'
)
UPDATE "pediu_courier_profiles" c
SET status = 'suspended', availability = 'offline'
FROM decision d
WHERE c."userId" = d.id
  AND d.kept NOT IN ('courier', 'admin')
  AND c.status <> 'suspended';
