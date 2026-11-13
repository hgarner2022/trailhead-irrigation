-- The consent history is append-only: a change is a new row, never an edit (wiring plan, decision 7).
CREATE FUNCTION consent_reject_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'consent rows are append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER consent_no_update BEFORE UPDATE ON consent FOR EACH ROW EXECUTE FUNCTION consent_reject_update();
