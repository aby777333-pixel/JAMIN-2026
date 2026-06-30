-- JAMIN Properties — 0053 shared-ad video playback.
-- The Poster Maker can now publish the source video alongside the branded poster;
-- the shared /ad/<slug> page plays it inline (poster image is the fallback/cover).
-- Single additive column; the user-media bucket is already public + mime-open.

alter table public.shared_ads add column if not exists video_url text;
