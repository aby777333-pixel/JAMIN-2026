-- 0113: Set the Edappadi site pin.
--
-- Lights up the Map / Satellite / Street View / Google Earth links on the plot
-- sheet and the inline map on the public plan. All four are derived from these
-- coordinates via Google's Maps URLs scheme (no API key); the inline map is a
-- keyless OpenStreetMap embed. `maps_url` and `street_view_url` stay NULL so
-- the derived links apply — set either one to override just that button.
--
-- ⚠️ This is the owner's confirmed Edappadi pin. The layout itself is at
-- Poolavari village (S.No. 214/1B, 214/2, 215/1), so the pin may be a few
-- hundred metres off the actual plot. Correct it in
-- Admin -> Plot layouts -> Layout details once the site has been walked;
-- every link re-derives from the new value with no code change.

update public.layouts
   set latitude  = 11.5871928,
       longitude = 77.8193972
 where slug = 'edappadi-poolavari'
   and latitude is null;
