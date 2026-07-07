ALTER TABLE employees
    ADD COLUMN work_mode VARCHAR(32) NOT NULL DEFAULT 'HYBRID';

ALTER TABLE employees
    ADD COLUMN preference_tag VARCHAR(64);

UPDATE employees
SET work_mode = 'WFO', preference_tag = 'MEAL_VEG'
WHERE employee_id = 'EMP001';

UPDATE employees
SET work_mode = 'HYBRID', preference_tag = 'MEAL_NON_VEG'
WHERE employee_id = 'EMP002';

UPDATE employees
SET work_mode = 'WFO', preference_tag = 'ADMIN'
WHERE employee_id = 'ADMIN001';
