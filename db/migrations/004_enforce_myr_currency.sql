UPDATE scholarships
SET currency = 'MYR'
WHERE currency IS DISTINCT FROM 'MYR';

ALTER TABLE scholarships
DROP CONSTRAINT IF EXISTS scholarships_currency_myr_check;

ALTER TABLE scholarships
ADD CONSTRAINT scholarships_currency_myr_check
CHECK (currency = 'MYR');
