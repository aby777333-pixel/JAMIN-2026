-- JAMIN Properties — 0012 decouple audit_logs.actor_id from profiles.
-- audit_logs is append-only; an ON DELETE SET NULL cascade would attempt an UPDATE
-- that the immutability trigger blocks (and an audit trail should outlive the actor).
-- Keep actor_id as a bare uuid reference.
alter table public.audit_logs drop constraint if exists audit_logs_actor_id_fkey;
