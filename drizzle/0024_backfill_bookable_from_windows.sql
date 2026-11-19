-- Data only: until the engine reads a service's own dates (step 7), a kind's window lives in settings.windows. Give each service whose
-- dates are both empty the month and day of its kind's window, so Settings > Services reads what the scheduler runs on. A service that
-- already has a date is never touched, and a second run changes nothing (nothing is left with both dates empty).
update "service" sv
set "bookable_from" = substr(w.value->>'opensOn', 6, 5),
    "bookable_to" = substr(w.value->>'closesOn', 6, 5)
from "organization" o,
  jsonb_array_elements(case when jsonb_typeof(o."settings"->'windows') = 'array' then o."settings"->'windows' else '[]'::jsonb end) as w(value)
where sv."organization_id" = o."id"
  and sv."bookable_from" is null
  and sv."bookable_to" is null
  and w.value->>'kind' = sv."kind"::text
  and w.value->>'opensOn' ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
  and w.value->>'closesOn' ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$';
