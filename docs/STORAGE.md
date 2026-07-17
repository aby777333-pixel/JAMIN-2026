# JAMIN storage architecture (2026-07-17 review)

Four Supabase Storage buckets, each with one clear role and a per-entity
folder hierarchy, so capacity scales by adding objects — never by changing
structure.

| Bucket | Role | Hierarchy | Write access |
|---|---|---|---|
| `property-media` | Curated listing gallery (photos + videos shown in the app) | `<property_id>/<ts>_<file>` | Admin only |
| `property-assets` | Heavy structured assets: floor plans, brochures, drone videos, 360° media, legal documents (0108) | `<property_id>/{floor-plans,brochures,drone,360,legal}/…` | Admin only |
| `property-submissions` | Partner/seller capture uploads pending review | `<user_id>/<ts>_<file>` | Owner inserts, admin deletes |
| `user-media` | Per-user files: profile, ads, posters, notes, loan docs, payment proofs, forms | `<user_id>/{profile,ads,brand,notes,loan-docs,payments,forms}/…` | Owner (folder = own uid) |

All buckets are public-read (listing assets are public by nature; user files
are unguessable timestamped paths). Reads for previews go through the
Supabase image CDN (`/render/image/public/…?width=…`) so social crawlers and
lists never download originals.

Capacity notes
- Supabase Storage itself is object-storage backed — no practical structural
  ceiling; growth is billing, not schema.
- ⚠️ The project-wide max upload size is set in Dashboard → Storage settings
  (Kong enforces it; uploads over it fail 413 regardless of bucket). Raise it
  there before expecting large drone videos / high-res 360° files to upload.
- New asset kinds need no migration: add a new folder segment under
  `property-assets/<property_id>/…` and store the URL on the property's
  `attrs` (the admin "Media & tours" fields already do this).
