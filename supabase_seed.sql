-- RAYLANE EXPRESS v2 — SEED DATA (FINAL CLEAN)
-- Run AFTER schema.sql. All UUIDs valid RFC-4122. No bad JSONB.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DELETE FROM audit_log; DELETE FROM alerts;    DELETE FROM payouts;
DELETE FROM payments;  DELETE FROM bookings;  DELETE FROM seats;
DELETE FROM promotions;DELETE FROM parcels;   DELETE FROM trips;
DELETE FROM vehicles;  DELETE FROM users;     DELETE FROM operators;

INSERT INTO operators (id,name,email,phone,status,is_raylane_fleet,merchant_code,modules,commission_rate) VALUES
('a0000001-0000-4000-8000-000000000001','Raylane Own Fleet',  'fleet@raylane.ug', '+256700000001','ACTIVE', true, 'RAYLANE01',ARRAY['TRIPS','SEAT_MANAGEMENT','BOOKINGS','PARCELS','FINANCIAL','ANALYTICS'],0),
('a0000002-0000-4000-8000-000000000002','Gaaga Bus Services', 'gaaga@buses.ug',   '+256701234567','ACTIVE', false,'GAAGA001', ARRAY['TRIPS','SEAT_MANAGEMENT','BOOKINGS','PARCELS','FINANCIAL'],8),
('a0000003-0000-4000-8000-000000000003','Link Bus Company',   'link@buses.ug',    '+256702345678','ACTIVE', false,'LINK002',  ARRAY['TRIPS','SEAT_MANAGEMENT','BOOKINGS','PARCELS','FINANCIAL','ANALYTICS'],8),
('a0000004-0000-4000-8000-000000000004','Rapid Connect Ltd',  'rapid@buses.ug',   '+256703456789','PENDING',false,'',         ARRAY[]::TEXT[],8);

INSERT INTO users (id,email,password_hash,name,role,operator_id) VALUES
('b0000001-0000-4000-8000-000000000001','admin@raylane.ug', crypt('admin123',   gen_salt('bf',10)),'Raylane Admin', 'admin',   NULL),
('b0000002-0000-4000-8000-000000000002','gaaga@buses.ug',   crypt('operator123',gen_salt('bf',10)),'Moses Gaaga',   'operator','a0000002-0000-4000-8000-000000000002'),
('b0000003-0000-4000-8000-000000000003','link@buses.ug',    crypt('operator123',gen_salt('bf',10)),'Sarah Link',    'operator','a0000003-0000-4000-8000-000000000003'),
('b0000004-0000-4000-8000-000000000004','fleet@raylane.ug', crypt('fleet123',   gen_salt('bf',10)),'Fleet Manager', 'operator','a0000001-0000-4000-8000-000000000001');

DO $$ DECLARE ok BOOLEAN;
BEGIN
  SELECT (password_hash=crypt('admin123',password_hash))    INTO ok FROM users WHERE email='admin@raylane.ug';
  IF NOT ok THEN RAISE EXCEPTION 'admin hash FAILED'; END IF;
  SELECT (password_hash=crypt('operator123',password_hash)) INTO ok FROM users WHERE email='gaaga@buses.ug';
  IF NOT ok THEN RAISE EXCEPTION 'operator hash FAILED'; END IF;
  RAISE NOTICE 'Passwords OK';
END $$;

INSERT INTO vehicles (id,operator_id,registration,make,model,year,vehicle_type,capacity,status,purchase_price,current_mileage,last_service_date,next_service_date,insurance_expiry,fitness_expiry) VALUES
('f1000001-0000-4000-8000-000000000001','a0000001-0000-4000-8000-000000000001','UAA 001A','Toyota',  'Coaster', 2022,'MINI_BUS',14,'ACTIVE',      85000000, 45000,CURRENT_DATE-90, CURRENT_DATE+30, CURRENT_DATE+180,CURRENT_DATE+90),
('f1000002-0000-4000-8000-000000000002','a0000001-0000-4000-8000-000000000001','UAA 002B','Yutong',  'ZK6900',  2021,'COACH',   67,'ACTIVE',     220000000, 82000,CURRENT_DATE-30, CURRENT_DATE+60, CURRENT_DATE+300,CURRENT_DATE+180),
('f1000003-0000-4000-8000-000000000003','a0000001-0000-4000-8000-000000000001','UAA 003C','Higer',   'KLQ6125', 2020,'COACH',   67,'MAINTENANCE',200000000,105000,CURRENT_DATE-180,CURRENT_DATE-5,  CURRENT_DATE+60, CURRENT_DATE+30),
('f1000004-0000-4000-8000-000000000004','a0000002-0000-4000-8000-000000000002','UBB 123A','Scania',  'Irizar',  2019,'COACH',   67,'ACTIVE',     180000000, 95000,CURRENT_DATE-60, CURRENT_DATE+120,CURRENT_DATE+150,CURRENT_DATE+60),
('f1000005-0000-4000-8000-000000000005','a0000002-0000-4000-8000-000000000002','UBB 456B','Toyota',  'Hiace',   2021,'MINI_BUS',14,'ACTIVE',      65000000, 38000,CURRENT_DATE-45, CURRENT_DATE+45, CURRENT_DATE+210,CURRENT_DATE+120),
('f1000006-0000-4000-8000-000000000006','a0000003-0000-4000-8000-000000000003','UBC 789C','Mercedes','Travego',  2022,'COACH',   67,'ACTIVE',     250000000, 55000,CURRENT_DATE-20, CURRENT_DATE+100,CURRENT_DATE+340,CURRENT_DATE+200);

INSERT INTO trips (id,operator_id,vehicle_id,from_city,to_city,departure_time,price,duration,vehicle,vehicle_type,total_seats,booked_seats,status,amenities) VALUES
('c0000001-0000-4000-8000-000000000001','a0000001-0000-4000-8000-000000000001','f1000002-0000-4000-8000-000000000002','Kampala','Gulu',   NOW()+interval'8 hours', 38000,'5h',    'UAA 002B','COACH',   67,10,'LIVE',  ARRAY['WiFi','AC','USB']),
('c0000002-0000-4000-8000-000000000002','a0000001-0000-4000-8000-000000000001','f1000001-0000-4000-8000-000000000001','Kampala','Jinja',  NOW()+interval'3 hours', 12000,'1h 30m','UAA 001A','MINI_BUS',14, 4,'LIVE',  ARRAY['WiFi','AC']),
('c0000003-0000-4000-8000-000000000003','a0000002-0000-4000-8000-000000000002','f1000004-0000-4000-8000-000000000004','Kampala','Mbale',  NOW()+interval'1 day',   25000,'4h 30m','UBB 123A','COACH',   67, 8,'PENDING',ARRAY['WiFi','AC']),
('c0000004-0000-4000-8000-000000000004','a0000002-0000-4000-8000-000000000002','f1000004-0000-4000-8000-000000000004','Kampala','Mbarara',NOW()+interval'6 hours', 22000,'3h 30m','UBB 123A','COACH',   67,20,'LIVE',  ARRAY['AC']),
('c0000005-0000-4000-8000-000000000005','a0000002-0000-4000-8000-000000000002','f1000005-0000-4000-8000-000000000005','Kampala','Masaka', NOW()+interval'2 days',  15000,'2h',    'UBB 456B','MINI_BUS',14, 5,'LIVE',  ARRAY['WiFi']),
('c0000006-0000-4000-8000-000000000006','a0000003-0000-4000-8000-000000000003','f1000006-0000-4000-8000-000000000006','Kampala','Lira',   NOW()+interval'5 hours', 40000,'6h',    'UBC 789C','COACH',   67, 4,'LIVE',  ARRAY['WiFi','AC','USB']),
('c0000007-0000-4000-8000-000000000007','a0000003-0000-4000-8000-000000000003','f1000006-0000-4000-8000-000000000006','Kampala','Kabale', NOW()+interval'2 days',  30000,'5h 30m','UBC 789C','COACH',   67, 7,'LIVE',  ARRAY['AC']),
('c0000008-0000-4000-8000-000000000008','a0000003-0000-4000-8000-000000000003','f1000006-0000-4000-8000-000000000006','Mbale',  'Kampala',NOW()+interval'1 day',   25000,'4h 30m','UBC 789C','COACH',   67, 3,'LIVE',  ARRAY['AC','USB']);

DO $$ DECLARE r RECORD; i INT;
BEGIN
  FOR r IN SELECT id,total_seats,booked_seats FROM trips LOOP
    FOR i IN 1..r.total_seats LOOP
      INSERT INTO seats(trip_id,seat_number,status)
      VALUES(r.id,i,CASE WHEN i<=r.booked_seats THEN 'BOOKED' ELSE 'AVAILABLE' END)
      ON CONFLICT(trip_id,seat_number) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

INSERT INTO promotions (id,operator_id,promo_name,route_from,route_to,discount_type,discount_value,start_date,end_date,conditions,status,approved_by) VALUES
('d0000001-0000-4000-8000-000000000001','a0000002-0000-4000-8000-000000000002','Weekend Saver','Kampala','Mbarara','PERCENTAGE',10,  CURRENT_DATE,CURRENT_DATE+7, 'Weekends only',          'APPROVED',        'b0000001-0000-4000-8000-000000000001'),
('d0000002-0000-4000-8000-000000000002','a0000003-0000-4000-8000-000000000003','Early Bird',  'Kampala','Lira',   'FIXED',     3000,CURRENT_DATE,CURRENT_DATE+14,'Book 3+ days in advance','APPROVED',        'b0000001-0000-4000-8000-000000000001'),
('d0000003-0000-4000-8000-000000000003','a0000002-0000-4000-8000-000000000002',NULL,          'Kampala','Mbale',  'PERCENTAGE',15,  CURRENT_DATE,CURRENT_DATE+5, NULL,                     'PENDING_APPROVAL', NULL);

INSERT INTO bookings (id,trip_id,seat_number,passenger_name,passenger_phone,booking_type,status,amount_total,amount_paid,balance_due,payment_method,payment_verified,ticket_code,promo_discount) VALUES
('e0000001-0000-4000-8000-000000000001','c0000004-0000-4000-8000-000000000004',5, 'Alice Nakato',  '+256770111222','FULL',   'CONFIRMED',22000,22000,0,    'MTN_MOMO',   true,'RL-A1B2-C3D4',0),
('e0000002-0000-4000-8000-000000000002','c0000004-0000-4000-8000-000000000004',12,'John Ssemakula','+256780222333','FULL',   'CONFIRMED',22000,22000,0,    'AIRTEL_MOMO',true,'RL-E5F6-G7H8',0),
('e0000003-0000-4000-8000-000000000003','c0000001-0000-4000-8000-000000000001',3, 'Grace Achieng', '+256750333444','ADVANCE','CONFIRMED',38000,7600, 30400,'MTN_MOMO',   true,'RL-G3H4-I5J6',0);

INSERT INTO payments (booking_id,trip_id,operator_id,amount,commission,operator_net,status,method,verified,idempotency_key) VALUES
('e0000001-0000-4000-8000-000000000001','c0000004-0000-4000-8000-000000000004','a0000002-0000-4000-8000-000000000002',22000,1760,20240,'HELD','MTN_MOMO',   true,'idem-e1'),
('e0000002-0000-4000-8000-000000000002','c0000004-0000-4000-8000-000000000004','a0000002-0000-4000-8000-000000000002',22000,1760,20240,'HELD','AIRTEL_MOMO',true,'idem-e2'),
('e0000003-0000-4000-8000-000000000003','c0000001-0000-4000-8000-000000000001','a0000001-0000-4000-8000-000000000001',7600, 0,   7600, 'HELD','MTN_MOMO',   true,'idem-e3');

INSERT INTO alerts (type,message,entity_type,priority,read) VALUES
('APPROVAL', 'Trip Kampala to Mbale pending approval from Gaaga Bus Services','trip',   'HIGH',  false),
('OPERATOR', 'New operator application: Rapid Connect Ltd',                   'operator','NORMAL',false),
('PROMO',    'Promo request: Kampala to Mbale 15% OFF from Gaaga',            'promo',  'NORMAL',false),
('VEHICLE',  'UAA 003C is in MAINTENANCE — schedule repairs',                 'vehicle','HIGH',  false),
('VEHICLE',  'UBB 123A fitness certificate expires in 60 days',               'vehicle','NORMAL',false),
('FINANCIAL','Payments held for Kampala to Mbarara — 2 bookings',            'payment','NORMAL',true);

INSERT INTO audit_log (actor_email,actor_role,action,entity_type,metadata) VALUES
('system','system','SEED_COMPLETE','database',jsonb_build_object('version','v2','ts',NOW()::text));

SELECT 'Seed complete' AS status,
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM operators) AS operators,
  (SELECT COUNT(*) FROM vehicles) AS vehicles,
  (SELECT COUNT(*) FROM trips WHERE status='LIVE') AS live_trips,
  (SELECT COUNT(*) FROM seats) AS seats,
  (SELECT COUNT(*) FROM bookings) AS bookings;
