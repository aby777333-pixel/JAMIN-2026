-- JAMIN Properties — 0070 live-agent hotline number.
-- When a customer wants a HUMAN (not the AI), the app shows a tap-to-call
-- "Talk to a live agent" number. Admin-editable in web admin → ☎️ Call desk
-- (system_config is already readable by the app and writable by admins).
-- Mock number for now — replace with the real hotline before launch.
insert into public.system_config (key, value)
values ('live_agent_phone', '"+91 98765 43210"'::jsonb)
on conflict (key) do nothing;
