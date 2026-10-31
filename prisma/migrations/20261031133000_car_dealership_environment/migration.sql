-- Car-Dealership P0-04: independently verified database identity and neutral
-- demonstration settings. Historical source migrations remain unchanged.

CREATE TABLE "CarDealershipEnvironment" (
    "id" TEXT NOT NULL,
    "application" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "instanceId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CarDealershipEnvironment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CarDealershipEnvironment_application_check" CHECK ("application" = 'car-dealership'),
    CONSTRAINT "CarDealershipEnvironment_environment_check" CHECK ("environment" IN ('local', 'test', 'preview', 'staging', 'demo', 'commercial'))
);

-- Original business contacts were inserted by a historical migration.
-- Remove them on clean Car-Dealership databases without deleting schema history.
INSERT INTO "SiteSetting" ("id", "key", "value", "category", "version", "updatedAt")
VALUES
  ('cd-demo-site-name', 'site_name', 'Car Dealership Demo', 'general', 1, CURRENT_TIMESTAMP),
  ('cd-demo-legal-name', 'legal_company_name', 'Car Dealership Demo — non-operational software example', 'general', 1, CURRENT_TIMESTAMP),
  ('cd-demo-site-tagline', 'site_tagline', 'Automotive retail platform — demonstration', 'general', 1, CURRENT_TIMESTAMP),
  ('cd-demo-primary-phone', 'primary_phone', '', 'contact', 1, CURRENT_TIMESTAMP),
  ('cd-demo-secondary-phone', 'support_phone', '', 'contact', 1, CURRENT_TIMESTAMP),
  ('cd-demo-sales-email', 'sales_email', 'demo@car-dealership.test', 'contact', 1, CURRENT_TIMESTAMP),
  ('cd-demo-support-email', 'support_email', 'support@car-dealership.test', 'contact', 1, CURRENT_TIMESTAMP),
  ('cd-demo-whatsapp', 'whatsapp', '', 'contact', 1, CURRENT_TIMESTAMP),
  ('cd-demo-location', 'inventory_location', 'Demonstration showroom — no physical location', 'general', 1, CURRENT_TIMESTAMP),
  ('cd-demo-instagram', 'instagram_url', '', 'social', 1, CURRENT_TIMESTAMP),
  ('cd-demo-youtube', 'youtube_url', '', 'social', 1, CURRENT_TIMESTAMP),
  ('cd-demo-seo-title', 'seo_default_title', 'Car Dealership Demo | Automotive Retail Platform', 'seo', 1, CURRENT_TIMESTAMP),
  ('cd-demo-seo-desc', 'seo_default_description', 'Software demonstration with fictional vehicles and customers.', 'seo', 1, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "value" = EXCLUDED."value",
  "category" = EXCLUDED."category",
  "version" = "SiteSetting"."version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP;

-- Do not retain legacy showroom contact details from earlier seed runs.
UPDATE "Showroom"
SET "name" = 'Car Dealership Demo',
    "address" = 'Demonstration location — no physical showroom',
    "city" = 'Demo',
    "state" = 'Demo',
    "postalCode" = '000000',
    "phone" = '',
    "email" = 'demo@car-dealership.test',
    "phones" = '[]'::jsonb,
    "emails" = '[]'::jsonb,
    "whatsapp" = NULL,
    "mapUrl" = NULL,
    "latitude" = NULL,
    "longitude" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "isPrimary" = true OR "id" = 'main-showroom';
