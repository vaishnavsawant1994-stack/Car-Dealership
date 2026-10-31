-- Synthetic-only P0-04 fixtures. Not a source dealership data import.
INSERT INTO "Brand" ("id","name","slug","logoUrl","logoAlt","description","country","featured","updatedAt") VALUES
('cd-audi','Audi','audi','/images/brands/audi.svg','Audi','Fictional demonstration vehicles','Germany',true,now()),
('cd-bmw','BMW','bmw','/images/brands/bmw.svg','BMW','Fictional demonstration vehicles','Germany',true,now()),
('cd-mercedes','Mercedes-Benz','mercedes-benz','/images/brands/mercedes-benz.svg','Mercedes-Benz','Fictional demonstration vehicles','Germany',true,now()),
('cd-landrover','Land Rover','land-rover','/images/brands/land-rover.svg','Land Rover','Fictional demonstration vehicles','United Kingdom',true,now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "BodyType" ("id","name","slug","description","updatedAt") VALUES
('cd-sedan','Sedan','sedan','Demonstration sedan',now()),
('cd-suv','SUV','suv','Demonstration SUV',now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Vehicle" ("id","slug","stockNumber","brandId","bodyTypeId","model","variant","shortTitle","year","price","mileage","fuelType","transmission","exteriorColor","shortDescription","description","status","published","featured","publishedAt","updatedAt") VALUES
('cd-vehicle-audi','demo-audi-rs7','CD-DEMO-1001','cd-audi','cd-sedan','RS7','Sportback','Sample Audi RS7',2022,9200000,18000,'Petrol','Automatic','Grey','Illustrative vehicle only','Fictional demo data. No actual vehicle is offered for sale.','AVAILABLE',true,true,now(),now()),
('cd-vehicle-bmw','demo-bmw-520d','CD-DEMO-1002','cd-bmw','cd-sedan','520d','Luxury Line','Sample BMW 520d',2023,4850000,22000,'Diesel','Automatic','White','Illustrative vehicle only','Fictional demo data. No actual vehicle is offered for sale.','AVAILABLE',true,true,now(),now()),
('cd-vehicle-mercedes','demo-mercedes-s-class','CD-DEMO-1003','cd-mercedes','cd-sedan','S-Class','S 350d','Sample Mercedes S-Class',2021,8750000,26000,'Diesel','Automatic','White','Illustrative vehicle only','Fictional demo data. No actual vehicle is offered for sale.','AVAILABLE',true,false,now(),now()),
('cd-vehicle-defender','demo-land-rover-defender','CD-DEMO-1004','cd-landrover','cd-suv','Defender','110','Sample Defender 110',2024,11500000,9000,'Diesel','Automatic','Green','Illustrative vehicle only','Fictional demo data. No actual vehicle is offered for sale.','AVAILABLE',true,true,now(),now())
ON CONFLICT ("id") DO NOTHING;

-- Internal QA can use retained repo vehicle photos; asset licensing before external demo.
INSERT INTO "VehicleImage" ("id","vehicleId","url","altText","category","isPrimary","updatedAt") VALUES
('cd-photo-audi','cd-vehicle-audi','/images/hero/hero-audi-rs7-nardo-grey.webp','Illustrative Audi listing','EXTERIOR',true,now()),
('cd-photo-bmw','cd-vehicle-bmw','/images/hero/hero-bmw-5-series-white.webp','Illustrative BMW listing','EXTERIOR',true,now()),
('cd-photo-mercedes','cd-vehicle-mercedes','/images/hero/hero-mercedes-s-class-white.webp','Illustrative Mercedes listing','EXTERIOR',true,now()),
('cd-photo-defender','cd-vehicle-defender','/images/hero/hero-defender-110-green.webp','Illustrative Defender listing','EXTERIOR',true,now())
ON CONFLICT ("id") DO NOTHING;

-- The .test addresses are non-deliverable and no user has a login password.
INSERT INTO "User" ("id","name","email","role","status","updatedAt") VALUES
('cd-customer-one','Example Customer One','customer.one@car-dealership.test','CUSTOMER','ACTIVE',now()),
('cd-customer-two','Example Customer Two','customer.two@car-dealership.test','CUSTOMER','ACTIVE',now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Inquiry" ("id","referenceNumber","userId","vehicleId","name","phone","email","message","consent","status","priority","updatedAt") VALUES
('cd-inquiry-one','CD-ENQ-DEMO-0001','cd-customer-one','cd-vehicle-audi','Example Customer One','0000000000','customer.one@car-dealership.test','Fictional enquiry for CRM demonstration',false,'NEW','NORMAL',now()),
('cd-inquiry-two','CD-ENQ-DEMO-0002','cd-customer-two','cd-vehicle-bmw','Example Customer Two','0000000000','customer.two@car-dealership.test','Fictional high-priority lead',false,'CONTACTED','HIGH',now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "TestDrive" ("id","referenceNumber","userId","vehicleId","name","phone","email","preferredDate","preferredTime","consent","message","status","updatedAt") VALUES
('cd-test-drive-one','CD-TD-DEMO-0001','cd-customer-one','cd-vehicle-audi','Example Customer One','0000000000','customer.one@car-dealership.test','2026-11-10T10:30:00Z','16:00',false,'Fictional appointment, no real car or customer','REQUESTED',now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "SellRequest" ("id","referenceNumber","status","name","email","phone","make","model","year","mileage","city","message","updatedAt") VALUES
('cd-sell-one','CD-SELL-DEMO-0001','SUBMITTED','Example Seller','example.seller@car-dealership.test','0000000000','BMW','320d',2021,33000,'Demo','Fictional seller request',now())
ON CONFLICT ("id") DO NOTHING;

-- Safe, deliberately DISABLED staff identities. No passwords or verified emails.
-- Activation requires a one-time reviewed administrator command with a unique secret.
INSERT INTO "User" ("id","name","email","role","status","updatedAt") VALUES
('cd-demo-superadmin','Demo Super Administrator','demo.admin@car-dealership.test','SUPER_ADMIN','DISABLED',now()),
('cd-demo-manager','Demo General Manager','demo.manager@car-dealership.test','ADMIN','DISABLED',now()),
('cd-demo-sales','Demo Sales Representative','demo.sales@car-dealership.test','SALES','DISABLED',now()),
('cd-demo-operations','Demo Operations Specialist','demo.operations@car-dealership.test','OPERATIONS','DISABLED',now()),
('cd-demo-content','Demo Content Editor','demo.content@car-dealership.test','CONTENT_MANAGER','DISABLED',now())
ON CONFLICT ("id") DO NOTHING;
