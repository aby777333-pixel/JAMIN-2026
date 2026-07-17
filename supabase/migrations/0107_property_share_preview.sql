-- 0107 — public share-preview RPC for /p/<id> links.
--
-- The Netlify function that injects Open Graph tags for shared property links
-- (WhatsApp/Telegram/FB/X/LinkedIn thumbnails) runs as anon, and properties is
-- RLS-guarded. Expose ONLY the preview fields (code, price, media, project
-- name/location) for listings that are approved, visible and not archived —
-- the same subset the public agent pages already surface (0052 pattern).

create or replace function public.property_share_preview(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'plot_code', p.plot_code,
    'price', p.price,
    'media', p.media,
    'project', pj.name,
    'location', pj.location
  )
  from public.properties p
  left join public.projects pj on pj.id = p.project_id
  where p.id = p_id
    and p.approval_status = 'approved'
    and coalesce(p.is_hidden, false) = false
    and p.archived_at is null
  limit 1;
$$;

revoke execute on function public.property_share_preview(uuid) from public;
grant execute on function public.property_share_preview(uuid) to anon, authenticated;
