-- JAMIN Properties — 0106 master Indian property taxonomy. ADDITIVE ONLY.
-- property_types gains a `category` so ~130 types stay navigable (grouped
-- pickers in app + admin); existing 24 types are categorised in place; the
-- industry-standard list is seeded idempotently (on conflict slug do nothing).
-- Prefixes are distinct so per-prefix plot counters never interleave.

alter table public.property_types
  add column if not exists category text not null default 'Residential';

-- Categorise the existing rows (idempotent by slug).
update public.property_types set category = c.cat
from (values
  ('land', 'Land'), ('plot', 'Land'), ('commercial_plot', 'Land'),
  ('industrial_land', 'Industrial'), ('agricultural', 'Agricultural'), ('farm_land', 'Agricultural'),
  ('villa', 'Residential'), ('apartment', 'Residential'), ('independent_house', 'Residential'),
  ('flat', 'Residential'), ('studio_apartment', 'Residential'), ('builder_floor', 'Residential'),
  ('commercial', 'Commercial'), ('office_space', 'Commercial'), ('shop', 'Commercial'),
  ('retail_space', 'Commercial'), ('coworking', 'Commercial'),
  ('warehouse', 'Industrial'), ('factory', 'Industrial'),
  ('hotel', 'Hospitality'), ('resort', 'Hospitality'),
  ('rental', 'Investment'), ('mixed_use', 'Mixed Use')
) as c(slug, cat)
where property_types.slug = c.slug;

insert into public.property_types (slug, name, code_prefix, category) values
  -- Residential
  ('luxury_villa', 'Luxury Villa', 'LXV', 'Residential'),
  ('duplex', 'Duplex', 'DPX', 'Residential'),
  ('triplex', 'Triplex', 'TPX', 'Residential'),
  ('penthouse', 'Penthouse', 'PHS', 'Residential'),
  ('row_house', 'Row House / Townhouse', 'RWH', 'Residential'),
  ('bungalow', 'Bungalow', 'BGL', 'Residential'),
  ('farm_house', 'Farm House', 'FMH', 'Residential'),
  ('cottage', 'Cottage', 'CTG', 'Residential'),
  ('gated_community_plot', 'Gated Community Plot', 'GCP', 'Residential'),
  ('serviced_apartment', 'Serviced Apartment', 'SVA', 'Residential'),
  ('vacation_home', 'Vacation Home', 'VCH', 'Residential'),
  ('retirement_home', 'Retirement Home', 'RTH', 'Residential'),
  ('coliving', 'Co-living Property', 'CLV', 'Residential'),
  -- Commercial
  ('it_park_office', 'IT Park Office', 'ITP', 'Commercial'),
  ('showroom', 'Showroom', 'SRM', 'Commercial'),
  ('shopping_mall_unit', 'Shopping Mall Unit', 'SMU', 'Commercial'),
  ('commercial_complex', 'Commercial Complex', 'CCX', 'Commercial'),
  ('business_centre', 'Business Centre', 'BCN', 'Commercial'),
  ('corporate_office', 'Corporate Office', 'CPO', 'Commercial'),
  ('motel', 'Motel', 'MTL', 'Commercial'),
  ('guest_house', 'Guest House', 'GSH', 'Commercial'),
  ('restaurant', 'Restaurant', 'RES', 'Commercial'),
  ('cafe', 'Café', 'CAF', 'Commercial'),
  ('cinema_multiplex', 'Cinema / Multiplex', 'CNM', 'Commercial'),
  ('banquet_hall', 'Banquet Hall', 'BQH', 'Commercial'),
  ('convention_centre', 'Convention Centre', 'CVC', 'Commercial'),
  -- Industrial
  ('logistics_park', 'Logistics Park', 'LGP', 'Industrial'),
  ('industrial_shed', 'Industrial Shed', 'ISH', 'Industrial'),
  ('manufacturing_unit', 'Manufacturing Unit', 'MFU', 'Industrial'),
  ('cold_storage', 'Cold Storage', 'CST', 'Industrial'),
  ('distribution_centre', 'Distribution Centre', 'DBC', 'Industrial'),
  ('sez_property', 'SEZ Property', 'SEZ', 'Industrial'),
  -- Agricultural
  ('plantation', 'Plantation', 'PLN', 'Agricultural'),
  ('tea_estate', 'Tea Estate', 'TEA', 'Agricultural'),
  ('coffee_estate', 'Coffee Estate', 'COF', 'Agricultural'),
  ('rubber_plantation', 'Rubber Plantation', 'RBP', 'Agricultural'),
  ('coconut_farm', 'Coconut Farm', 'CCF', 'Agricultural'),
  ('mango_orchard', 'Mango Orchard', 'MGO', 'Agricultural'),
  ('organic_farm', 'Organic Farm', 'ORF', 'Agricultural'),
  ('dairy_farm', 'Dairy Farm', 'DYF', 'Agricultural'),
  ('poultry_farm', 'Poultry Farm', 'PYF', 'Agricultural'),
  ('fish_farm', 'Fish Farm', 'FSF', 'Agricultural'),
  ('goat_farm', 'Goat Farm', 'GTF', 'Agricultural'),
  -- Institutional
  ('school', 'School', 'SCH', 'Institutional'),
  ('college', 'College', 'CLG', 'Institutional'),
  ('university', 'University', 'UNV', 'Institutional'),
  ('hospital', 'Hospital', 'HSP', 'Institutional'),
  ('clinic', 'Clinic', 'CLN', 'Institutional'),
  ('nursing_home', 'Nursing Home', 'NSH', 'Institutional'),
  ('medical_centre', 'Medical Centre', 'MDC', 'Institutional'),
  ('research_facility', 'Research Facility', 'RSF', 'Institutional'),
  ('religious_property', 'Religious Property', 'RLP', 'Institutional'),
  ('community_hall', 'Community Hall', 'CMH', 'Institutional'),
  -- Hospitality
  ('luxury_hotel', 'Luxury Hotel', 'LXH', 'Hospitality'),
  ('boutique_hotel', 'Boutique Hotel', 'BTQ', 'Hospitality'),
  ('holiday_villa', 'Holiday Villa', 'HDV', 'Hospitality'),
  ('beach_resort', 'Beach Resort', 'BCR', 'Hospitality'),
  ('hill_resort', 'Hill Resort', 'HLR', 'Hospitality'),
  ('homestay', 'Homestay', 'HMS', 'Hospitality'),
  ('hostel', 'Hostel', 'HSL', 'Hospitality'),
  ('lodge', 'Lodge', 'LDG', 'Hospitality'),
  -- Mixed Use
  ('residential_commercial_complex', 'Residential + Commercial Complex', 'RCC', 'Mixed Use'),
  ('integrated_township', 'Integrated Township', 'ITS', 'Mixed Use'),
  ('smart_city_development', 'Smart City Development', 'SCD', 'Mixed Use'),
  ('retail_office_complex', 'Retail + Office Complex', 'ROC', 'Mixed Use'),
  -- Land
  ('township_land', 'Township Land', 'TWL', 'Land'),
  ('hill_view_plot', 'Hill View Plot', 'HVP', 'Land'),
  ('riverfront_plot', 'Riverfront Plot', 'RVP', 'Land'),
  ('lakefront_plot', 'Lakefront Plot', 'LKP', 'Land'),
  ('beachfront_plot', 'Beachfront Plot', 'BFP', 'Land'),
  ('corner_plot', 'Corner Plot', 'CRP', 'Land'),
  ('highway_frontage', 'Highway Frontage Land', 'HWF', 'Land'),
  -- Luxury
  ('mansion', 'Mansion', 'MSN', 'Luxury'),
  ('palace', 'Palace', 'PLE', 'Luxury'),
  ('waterfront_villa', 'Waterfront Villa', 'WFV', 'Luxury'),
  ('sky_villa', 'Sky Villa', 'SKV', 'Luxury'),
  ('golf_villa', 'Golf Villa', 'GLV', 'Luxury'),
  ('smart_home', 'Smart Home', 'SMH', 'Luxury'),
  ('heritage_property', 'Heritage Property', 'HGP', 'Luxury'),
  -- Investment
  ('income_property', 'Income Property', 'ICP', 'Investment'),
  ('reit_asset', 'REIT Asset', 'RIT', 'Investment'),
  ('distressed_property', 'Distressed Property', 'DSP', 'Investment'),
  ('auction_property', 'Auction Property', 'AUP', 'Investment'),
  ('foreclosed_property', 'Foreclosed Property', 'FCL', 'Investment'),
  ('fractional_property', 'Fractional Ownership Property', 'FRP', 'Investment'),
  -- Special
  ('mining_land', 'Mining Land', 'MNL', 'Special'),
  ('quarry', 'Quarry', 'QRY', 'Special'),
  ('solar_farm', 'Solar Farm', 'SLF', 'Special'),
  ('wind_farm', 'Wind Farm', 'WNF', 'Special'),
  ('telecom_tower_site', 'Telecom Tower Site', 'TTS', 'Special'),
  ('data_centre', 'Data Centre', 'DTC', 'Special'),
  ('parking_complex', 'Parking Complex', 'PKC', 'Special'),
  ('petrol_pump', 'Petrol Pump', 'PTP', 'Special'),
  ('ev_charging_station', 'EV Charging Station', 'EVC', 'Special'),
  ('marina', 'Marina', 'MRA', 'Special'),
  ('airport_land', 'Airport Land', 'APL', 'Special'),
  ('port_property', 'Port Property', 'PPT', 'Special')
on conflict (slug) do nothing;

insert into public.app_features (key, name, description, category, icon, sort_order) values
  ('property_taxonomy', 'Master Property Taxonomy', '11 categories, 100+ Indian property types (Residential to Special Purpose) — grouped pickers everywhere; admin adds more at runtime.', 'admin', 'layers', 196)
on conflict (key) do nothing;
