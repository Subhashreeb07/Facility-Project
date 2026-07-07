ALTER TABLE employees
    ADD COLUMN office_location VARCHAR(64) NOT NULL DEFAULT 'HYDERABAD';

UPDATE employees
SET office_location = 'HYDERABAD'
WHERE employee_id = 'EMP001';

UPDATE employees
SET office_location = 'KOLKATA'
WHERE employee_id = 'EMP002';

ALTER TABLE facilities
    ADD COLUMN target_locations VARCHAR(255);

UPDATE facilities
SET target_locations = 'HYDERABAD,KOLKATA'
WHERE target_locations IS NULL;
