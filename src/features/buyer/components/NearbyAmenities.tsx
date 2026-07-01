import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

/**
 * Nearby Amenities (§5.04) — live POIs around a property from the OpenStreetMap
 * Overpass API (free, no key). Categories are data-driven; results are the closest
 * few with distance + a one-tap directions link. Dynamic, nothing hardcoded per site.
 */
type Category = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; selectors: string[] };

const CATEGORIES: Category[] = [
  { key: 'school', label: 'Schools', icon: 'school', selectors: ['["amenity"="school"]', '["amenity"="college"]'] },
  { key: 'health', label: 'Health', icon: 'medkit', selectors: ['["amenity"="hospital"]', '["amenity"="clinic"]', '["amenity"="pharmacy"]'] },
  { key: 'bank', label: 'Banks', icon: 'card', selectors: ['["amenity"="bank"]', '["amenity"="atm"]'] },
  { key: 'food', label: 'Food', icon: 'restaurant', selectors: ['["amenity"="restaurant"]', '["amenity"="cafe"]'] },
  { key: 'transport', label: 'Transport', icon: 'bus', selectors: ['["highway"="bus_stop"]', '["railway"="station"]'] },
  { key: 'shop', label: 'Shopping', icon: 'cart', selectors: ['["shop"="supermarket"]', '["shop"="mall"]', '["amenity"="marketplace"]'] },
];

interface Poi {
  id: number;
  name: string;
  lat: number;
  lng: number;
  meters: number;
}

const R = 2500; // search radius (m)

function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
}

// Overpass mirrors — the main endpoint is often rate-limited/down, so we try
// several in turn (each with a client-side timeout) before giving up.
const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

async function postWithTimeout(url: string, body: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNearby(lat: number, lng: number, cat: Category): Promise<Poi[]> {
  const body =
    `[out:json][timeout:20];(` +
    cat.selectors.map((s) => `nwr${s}(around:${R},${lat},${lng});`).join('') +
    `);out center 30;`;

  // Try each mirror until one returns valid JSON (some return an HTML error page
  // with a 200, so we validate the parsed body and fall through on failure).
  let json: { elements?: any[] } | null = null;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const r = await postWithTimeout(url, body, 15000);
      if (!r.ok) continue;
      const parsed = (await r.json()) as { elements?: any[] };
      if (parsed && Array.isArray(parsed.elements)) {
        json = parsed;
        break;
      }
    } catch {
      /* bad response / not JSON / timeout — try the next mirror */
    }
  }
  if (!json) throw new Error('Could not load nearby places');
  const seen = new Set<string>();
  const pois: Poi[] = [];
  for (const el of json.elements ?? []) {
    const name = el.tags?.name as string | undefined;
    if (!name) continue;
    const pLat = el.lat ?? el.center?.lat;
    const pLng = el.lon ?? el.center?.lon;
    if (pLat == null || pLng == null) continue;
    const dedupe = name.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    pois.push({ id: el.id, name, lat: pLat, lng: pLng, meters: haversine(lat, lng, pLat, pLng) });
  }
  return pois.sort((a, b) => a.meters - b.meters).slice(0, 6);
}

function dist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function NearbyAmenities({ lat, lng }: { lat: number; lng: number }) {
  const [cat, setCat] = useState<Category>(CATEGORIES[0]);
  const { data: pois = [], isLoading, isError } = useQuery({
    queryKey: ['nearby', lat, lng, cat.key],
    queryFn: () => fetchNearby(lat, lng, cat),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  return (
    <View className="gap-2">
      <Text variant="label">Nearby amenities</Text>
      <View className="flex-row flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = c.key === cat.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => setCat(c)}
              className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                active ? 'border-red bg-red/10' : 'border-line bg-surface'
              }`}>
              <Ionicons name={c.icon} size={14} color={active ? color.red : color.muted} />
              <Text className={`text-[12px] font-semibold ${active ? 'text-red' : 'text-ink'}`}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card className="gap-2">
        {isLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator color={color.red} />
          </View>
        ) : isError ? (
          <Text variant="caption" className="py-2 text-center">
            Couldn&apos;t load nearby places right now. Pull to refresh or try another category.
          </Text>
        ) : pois.length === 0 ? (
          <Text variant="caption" className="py-2 text-center">
            No {cat.label.toLowerCase()} found within {R / 1000} km.
          </Text>
        ) : (
          pois.map((p) => (
            <Pressable
              key={p.id}
              onPress={() =>
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`)
              }
              className="flex-row items-center gap-3">
              <Ionicons name={cat.icon} size={16} color={color.muted} />
              <Text variant="body" numberOfLines={1} className="flex-1">
                {p.name}
              </Text>
              <Text className="font-mono text-[12px] text-gold-deep">{dist(p.meters)}</Text>
              <Ionicons name="navigate-outline" size={15} color={color.red} />
            </Pressable>
          ))
        )}
      </Card>
      <Text variant="caption">Distances are straight-line, from OpenStreetMap. Tap a place for directions.</Text>
    </View>
  );
}
