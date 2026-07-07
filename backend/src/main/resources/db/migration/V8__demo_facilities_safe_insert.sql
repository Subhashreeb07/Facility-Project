-- Safely insert demo facilities if they don't already exist
INSERT INTO facilities (facility_name, description, category, icon, status, published, created_at, updated_at, target_locations)
SELECT 'Lunch Booking', 'Daily meal booking system', 'Food', 'utensils', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'HYDERABAD,KOLKATA'
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE LOWER(facility_name) = LOWER('Lunch Booking'));

INSERT INTO facilities (facility_name, description, category, icon, status, published, created_at, updated_at, target_locations)
SELECT 'Cab Booking', 'Commute cab booking system', 'Transportation', 'bus', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'HYDERABAD,KOLKATA'
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE LOWER(facility_name) = LOWER('Cab Booking'));

INSERT INTO facilities (facility_name, description, category, icon, status, published, created_at, updated_at, target_locations)
SELECT 'Desk Booking', 'Office desk reservation system', 'Workspace', 'badge', false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'HYDERABAD,KOLKATA'
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE LOWER(facility_name) = LOWER('Desk Booking'));
