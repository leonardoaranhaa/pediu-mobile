CREATE TABLE "pediu_account_roles" (
	"userId" integer NOT NULL,
	"role" varchar(32) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_account_roles_userId_role_pk" PRIMARY KEY("userId","role")
);
--> statement-breakpoint
CREATE TABLE "pediu_ad_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer NOT NULL,
	"balance" integer DEFAULT 3 NOT NULL,
	"lifetimeGranted" integer DEFAULT 3 NOT NULL,
	"lifetimeUsed" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_ad_credits_store_unique" UNIQUE("storeId")
);
--> statement-breakpoint
CREATE TABLE "pediu_admin_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorId" integer NOT NULL,
	"action" varchar(80) NOT NULL,
	"entityType" varchar(40) NOT NULL,
	"entityId" integer,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer,
	"userId" integer NOT NULL,
	"role" varchar(16) NOT NULL,
	"body" varchar(2000) NOT NULL,
	"idempotencyKey" varchar(160),
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_chat_message_idempotency_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "pediu_commission_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"paymentId" integer,
	"ruleId" integer,
	"grossAmount" numeric(10, 2) NOT NULL,
	"commissionAmount" numeric(10, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_commission_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer,
	"type" varchar(32) NOT NULL,
	"percentage" numeric(7, 4) DEFAULT '0.0000' NOT NULL,
	"fixedAmount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"activeFrom" timestamp DEFAULT now() NOT NULL,
	"activeUntil" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"type" varchar(16) NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"minSubtotal" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"maxDiscount" numeric(10, 2),
	"active" integer DEFAULT 1 NOT NULL,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pediu_courier_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"vehicleType" varchar(32) NOT NULL,
	"vehiclePlate" varchar(16),
	"phone" varchar(32),
	"availability" varchar(32) DEFAULT 'offline' NOT NULL,
	"locationConsentAt" timestamp,
	"approvedAt" timestamp,
	"statusReason" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_courier_profile_user_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "pediu_customer_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"label" varchar(40) NOT NULL,
	"recipientName" varchar(160) NOT NULL,
	"street" varchar(180) NOT NULL,
	"number" varchar(30) NOT NULL,
	"complement" varchar(120),
	"neighborhood" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(2) NOT NULL,
	"postalCode" varchar(8) NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"isDefault" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_customer_payment_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"pixEnabled" integer DEFAULT 1 NOT NULL,
	"cardEnabled" integer DEFAULT 0 NOT NULL,
	"cashEnabled" integer DEFAULT 1 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_customer_payment_preferences_user_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "pediu_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer NOT NULL,
	"userId" integer,
	"name" varchar(160) NOT NULL,
	"phone" varchar(32),
	"notes" text,
	"creditLimit" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_customers_store_user_unique" UNIQUE("storeId","userId")
);
--> statement-breakpoint
CREATE TABLE "pediu_delivery_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"courierId" integer NOT NULL,
	"courierName" varchar(160) NOT NULL,
	"courierPhone" varchar(32),
	"etaMinutes" integer,
	"status" varchar(32) DEFAULT 'assigned' NOT NULL,
	"currentLatitude" numeric(10, 7),
	"currentLongitude" numeric(10, 7),
	"lastLocationAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_delivery_assignment_order_unique" UNIQUE("orderId")
);
--> statement-breakpoint
CREATE TABLE "pediu_delivery_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"eventType" varchar(32) NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_delivery_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignmentId" integer NOT NULL,
	"orderId" integer NOT NULL,
	"courierId" integer NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"etaMinutes" integer,
	"idempotencyKey" varchar(160) NOT NULL,
	"capturedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_delivery_location_idempotency_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "pediu_delivery_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"storeId" integer NOT NULL,
	"courierUserId" integer NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"etaMinutes" integer,
	"message" varchar(255),
	"idempotencyKey" varchar(160) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"respondedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_delivery_offer_idempotency_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "pediu_email_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"verifiedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_email_verification_tokens_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "pediu_financial_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer NOT NULL,
	"orderId" integer,
	"paymentId" integer,
	"type" varchar(32) NOT NULL,
	"direction" varchar(32) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"referenceId" varchar(160),
	"note" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_generated_ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer NOT NULL,
	"productId" integer,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"headline" varchar(120) NOT NULL,
	"description" varchar(500) NOT NULL,
	"cta" varchar(80) NOT NULL,
	"offerLabel" varchar(120),
	"visualPrompt" text NOT NULL,
	"imageKey" varchar(512),
	"model" varchar(80),
	"generationCost" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"publishedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer NOT NULL,
	"customerId" integer NOT NULL,
	"orderId" integer,
	"type" varchar(32) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balanceAfter" numeric(10, 2),
	"note" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_notification_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"notificationId" integer NOT NULL,
	"userId" integer NOT NULL,
	"payload" text NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"attemptCount" integer DEFAULT 0 NOT NULL,
	"availableAt" timestamp DEFAULT now() NOT NULL,
	"lockedAt" timestamp,
	"lastError" varchar(500),
	"sentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_notification_outbox_notification_unique" UNIQUE("notificationId")
);
--> statement-breakpoint
CREATE TABLE "pediu_notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"orderUpdates" integer DEFAULT 1 NOT NULL,
	"supportMessages" integer DEFAULT 1 NOT NULL,
	"promotions" integer DEFAULT 1 NOT NULL,
	"pushEnabled" integer DEFAULT 1 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_notification_preferences_user_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "pediu_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"type" varchar(40) DEFAULT 'general' NOT NULL,
	"actionPath" varchar(255),
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"productId" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unitPrice" numeric(10, 2) NOT NULL,
	"note" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "pediu_order_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"userId" integer NOT NULL,
	"target" varchar(16) NOT NULL,
	"productId" integer,
	"rating" integer NOT NULL,
	"comment" text,
	"idempotencyKey" varchar(160),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_review_unique" UNIQUE("orderId","userId","target","productId"),
	CONSTRAINT "pediu_review_idempotency_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "pediu_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" integer NOT NULL,
	"storeId" integer NOT NULL,
	"status" varchar(32) DEFAULT 'Pendente' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"couponCode" varchar(40),
	"discount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"deliveryAddress" varchar(255),
	"fulfillmentMode" varchar(32) DEFAULT 'delivery' NOT NULL,
	"deliveryFeeSnapshot" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"idempotencyKey" varchar(160),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_orders_idempotency_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "pediu_payment_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer NOT NULL,
	"provider" varchar(40) NOT NULL,
	"providerAccountId" varchar(160),
	"onboardingStatus" varchar(32) DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_payment_accounts_store_unique" UNIQUE("storeId"),
	CONSTRAINT "pediu_payment_accounts_provider_account_unique" UNIQUE("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "pediu_payment_reconciliation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"runId" integer NOT NULL,
	"providerTransactionId" varchar(160) NOT NULL,
	"paymentId" integer,
	"orderId" integer,
	"classification" varchar(32) NOT NULL,
	"providerStatus" varchar(32) NOT NULL,
	"internalStatus" varchar(32),
	"providerAmount" numeric(10, 2) NOT NULL,
	"internalAmount" numeric(10, 2),
	"currency" varchar(3) NOT NULL,
	"details" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_payment_reconciliation_run_transaction_unique" UNIQUE("runId","providerTransactionId")
);
--> statement-breakpoint
CREATE TABLE "pediu_payment_reconciliation_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(40) NOT NULL,
	"idempotencyKey" varchar(160) NOT NULL,
	"periodStart" timestamp NOT NULL,
	"periodEnd" timestamp NOT NULL,
	"status" varchar(32) DEFAULT 'running' NOT NULL,
	"matchedCount" integer DEFAULT 0 NOT NULL,
	"mismatchCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	CONSTRAINT "pediu_payment_reconciliation_provider_idempotency_unique" UNIQUE("provider","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "pediu_payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"paymentId" integer NOT NULL,
	"provider" varchar(40) NOT NULL,
	"providerTransactionId" varchar(160),
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"gatewayFee" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"idempotencyKey" varchar(160),
	"externalReference" varchar(255),
	"qrCode" text,
	"qrCodeBase64" text,
	"ticketUrl" varchar(1024),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_payment_transactions_provider_tx_unique" UNIQUE("provider","providerTransactionId"),
	CONSTRAINT "pediu_payment_transactions_idempotency_unique" UNIQUE("provider","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "pediu_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"method" varchar(32) DEFAULT 'pix' NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"pixKey" varchar(255),
	"transactionId" varchar(120),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_payments_transaction_unique" UNIQUE("transactionId")
);
--> statement-breakpoint
CREATE TABLE "pediu_payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer NOT NULL,
	"provider" varchar(40) NOT NULL,
	"providerPayoutId" varchar(160),
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"grossAmount" numeric(10, 2) NOT NULL,
	"fees" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"netAmount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"scheduledAt" timestamp,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_payouts_provider_payout_unique" UNIQUE("provider","providerPayoutId")
);
--> statement-breakpoint
CREATE TABLE "pediu_privacy_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"kind" varchar(40) NOT NULL,
	"version" varchar(20) NOT NULL,
	"acceptedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_privacy_consent_unique" UNIQUE("userId","kind","version")
);
--> statement-breakpoint
CREATE TABLE "pediu_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer NOT NULL,
	"name" varchar(180) NOT NULL,
	"category" varchar(80) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"available" integer DEFAULT 1 NOT NULL,
	"inventoryTracked" integer DEFAULT 0 NOT NULL,
	"stockQuantity" integer DEFAULT 0 NOT NULL,
	"reservedQuantity" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"platform" varchar(32) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "pediu_rate_limit_buckets" (
	"bucketKey" varchar(255) PRIMARY KEY NOT NULL,
	"requestCount" integer DEFAULT 0 NOT NULL,
	"windowStartedAt" timestamp NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"paymentId" integer NOT NULL,
	"orderId" integer NOT NULL,
	"provider" varchar(40) NOT NULL,
	"providerRefundId" varchar(160),
	"idempotencyKey" varchar(160) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"reason" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	CONSTRAINT "pediu_refunds_provider_refund_unique" UNIQUE("provider","providerRefundId"),
	CONSTRAINT "pediu_refunds_provider_idempotency_unique" UNIQUE("provider","idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "pediu_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer NOT NULL,
	"customerId" integer,
	"orderId" integer,
	"total" numeric(10, 2) NOT NULL,
	"paymentMethod" varchar(32) NOT NULL,
	"note" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pediu_store_couriers" (
	"id" serial PRIMARY KEY NOT NULL,
	"storeId" integer NOT NULL,
	"courierUserId" integer NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"invitedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_store_courier_unique" UNIQUE("storeId","courierUserId")
);
--> statement-breakpoint
CREATE TABLE "pediu_stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"phone" varchar(32),
	"address" varchar(255),
	"pixKey" varchar(255),
	"deliveryFee" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"deliveryEnabled" integer DEFAULT 1 NOT NULL,
	"pickupEnabled" integer DEFAULT 0 NOT NULL,
	"deliveryRadiusKm" numeric(6, 2) DEFAULT '10.00' NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"isOpen" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_stores_owner_unique" UNIQUE("ownerId")
);
--> statement-breakpoint
CREATE TABLE "pediu_support_ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticketId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" varchar(16) NOT NULL,
	"body" varchar(4000) NOT NULL,
	"idempotencyKey" varchar(160),
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_support_message_idempotency_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "pediu_support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"orderId" integer,
	"subject" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(32) DEFAULT 'user' NOT NULL,
	"themePreference" varchar(16) DEFAULT 'classic' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "pediu_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(40) NOT NULL,
	"providerEventId" varchar(160) NOT NULL,
	"eventType" varchar(100) NOT NULL,
	"status" varchar(32) DEFAULT 'received' NOT NULL,
	"payload" text,
	"processedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pediu_webhook_events_provider_event_unique" UNIQUE("provider","providerEventId")
);
--> statement-breakpoint
ALTER TABLE "pediu_account_roles" ADD CONSTRAINT "pediu_account_roles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_ad_credits" ADD CONSTRAINT "pediu_ad_credits_storeId_pediu_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."pediu_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_chat_messages" ADD CONSTRAINT "pediu_chat_messages_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_chat_messages" ADD CONSTRAINT "pediu_chat_messages_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_courier_profiles" ADD CONSTRAINT "pediu_courier_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_customer_addresses" ADD CONSTRAINT "pediu_customer_addresses_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_customer_payment_preferences" ADD CONSTRAINT "pediu_customer_payment_preferences_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_delivery_assignments" ADD CONSTRAINT "pediu_delivery_assignments_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_delivery_assignments" ADD CONSTRAINT "pediu_delivery_assignments_courierId_users_id_fk" FOREIGN KEY ("courierId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_delivery_events" ADD CONSTRAINT "pediu_delivery_events_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_delivery_locations" ADD CONSTRAINT "pediu_delivery_locations_assignmentId_pediu_delivery_assignments_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."pediu_delivery_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_delivery_locations" ADD CONSTRAINT "pediu_delivery_locations_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_delivery_locations" ADD CONSTRAINT "pediu_delivery_locations_courierId_users_id_fk" FOREIGN KEY ("courierId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_delivery_offers" ADD CONSTRAINT "pediu_delivery_offers_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_delivery_offers" ADD CONSTRAINT "pediu_delivery_offers_storeId_pediu_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."pediu_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_delivery_offers" ADD CONSTRAINT "pediu_delivery_offers_courierUserId_users_id_fk" FOREIGN KEY ("courierUserId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_email_verification_tokens" ADD CONSTRAINT "pediu_email_verification_tokens_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_generated_ads" ADD CONSTRAINT "pediu_generated_ads_storeId_pediu_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."pediu_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_generated_ads" ADD CONSTRAINT "pediu_generated_ads_productId_pediu_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."pediu_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_notification_outbox" ADD CONSTRAINT "pediu_notification_outbox_notificationId_pediu_notifications_id_fk" FOREIGN KEY ("notificationId") REFERENCES "public"."pediu_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_notification_outbox" ADD CONSTRAINT "pediu_notification_outbox_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_notification_preferences" ADD CONSTRAINT "pediu_notification_preferences_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_notifications" ADD CONSTRAINT "pediu_notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_order_items" ADD CONSTRAINT "pediu_order_items_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_order_items" ADD CONSTRAINT "pediu_order_items_productId_pediu_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."pediu_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD CONSTRAINT "pediu_orders_customerId_users_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_orders" ADD CONSTRAINT "pediu_orders_storeId_pediu_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."pediu_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_payment_reconciliation_items" ADD CONSTRAINT "pediu_payment_reconciliation_items_runId_pediu_payment_reconciliation_runs_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."pediu_payment_reconciliation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_payments" ADD CONSTRAINT "pediu_payments_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_privacy_consents" ADD CONSTRAINT "pediu_privacy_consents_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_products" ADD CONSTRAINT "pediu_products_storeId_pediu_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."pediu_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_store_couriers" ADD CONSTRAINT "pediu_store_couriers_storeId_pediu_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."pediu_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_store_couriers" ADD CONSTRAINT "pediu_store_couriers_courierUserId_users_id_fk" FOREIGN KEY ("courierUserId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_store_couriers" ADD CONSTRAINT "pediu_store_couriers_invitedBy_users_id_fk" FOREIGN KEY ("invitedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_stores" ADD CONSTRAINT "pediu_stores_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_support_ticket_messages" ADD CONSTRAINT "pediu_support_ticket_messages_ticketId_pediu_support_tickets_id_fk" FOREIGN KEY ("ticketId") REFERENCES "public"."pediu_support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_support_ticket_messages" ADD CONSTRAINT "pediu_support_ticket_messages_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_support_tickets" ADD CONSTRAINT "pediu_support_tickets_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pediu_support_tickets" ADD CONSTRAINT "pediu_support_tickets_orderId_pediu_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."pediu_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pediu_admin_audit_created_idx" ON "pediu_admin_audit_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "pediu_chat_order_created_idx" ON "pediu_chat_messages" USING btree ("orderId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_courier_status_availability_idx" ON "pediu_courier_profiles" USING btree ("status","availability");--> statement-breakpoint
CREATE INDEX "pediu_customers_store_idx" ON "pediu_customers" USING btree ("storeId");--> statement-breakpoint
CREATE INDEX "pediu_delivery_assignment_courier_idx" ON "pediu_delivery_assignments" USING btree ("courierId","status");--> statement-breakpoint
CREATE INDEX "pediu_delivery_events_order_created_idx" ON "pediu_delivery_events" USING btree ("orderId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_delivery_location_assignment_created_idx" ON "pediu_delivery_locations" USING btree ("assignmentId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_delivery_location_order_captured_idx" ON "pediu_delivery_locations" USING btree ("orderId","capturedAt","id");--> statement-breakpoint
CREATE INDEX "pediu_delivery_offer_courier_status_idx" ON "pediu_delivery_offers" USING btree ("courierUserId","status","expiresAt");--> statement-breakpoint
CREATE INDEX "pediu_delivery_offer_order_status_idx" ON "pediu_delivery_offers" USING btree ("orderId","status");--> statement-breakpoint
CREATE INDEX "pediu_email_verification_user_idx" ON "pediu_email_verification_tokens" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_generated_ads_store_status_created_idx" ON "pediu_generated_ads" USING btree ("storeId","status","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_generated_ads_product_status_idx" ON "pediu_generated_ads" USING btree ("productId","status");--> statement-breakpoint
CREATE INDEX "pediu_ledger_store_customer_created_idx" ON "pediu_ledger_entries" USING btree ("storeId","customerId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_notification_outbox_status_available_idx" ON "pediu_notification_outbox" USING btree ("status","availableAt","id");--> statement-breakpoint
CREATE INDEX "pediu_notifications_user_read_created_idx" ON "pediu_notifications" USING btree ("userId","readAt","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_order_items_order_idx" ON "pediu_order_items" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "pediu_review_order_idx" ON "pediu_order_reviews" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "pediu_orders_customer_created_idx" ON "pediu_orders" USING btree ("customerId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_orders_store_status_created_idx" ON "pediu_orders" USING btree ("storeId","status","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_payment_reconciliation_run_created_idx" ON "pediu_payment_reconciliation_items" USING btree ("runId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_payments_order_status_idx" ON "pediu_payments" USING btree ("orderId","status");--> statement-breakpoint
CREATE INDEX "pediu_privacy_consent_user_idx" ON "pediu_privacy_consents" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "pediu_products_inventory_idx" ON "pediu_products" USING btree ("storeId","inventoryTracked","available");--> statement-breakpoint
CREATE INDEX "pediu_push_tokens_user_idx" ON "pediu_push_tokens" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "pediu_rate_limit_expires_idx" ON "pediu_rate_limit_buckets" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "pediu_sales_store_created_idx" ON "pediu_sales" USING btree ("storeId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_store_courier_status_idx" ON "pediu_store_couriers" USING btree ("courierUserId","status");--> statement-breakpoint
CREATE INDEX "pediu_stores_open_idx" ON "pediu_stores" USING btree ("isOpen");--> statement-breakpoint
CREATE INDEX "pediu_support_message_ticket_created_idx" ON "pediu_support_ticket_messages" USING btree ("ticketId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_support_user_created_idx" ON "pediu_support_tickets" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "pediu_support_order_idx" ON "pediu_support_tickets" USING btree ("orderId");