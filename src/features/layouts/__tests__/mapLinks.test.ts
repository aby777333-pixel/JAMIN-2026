import { describe, expect, it } from '@jest/globals';

import { formatCoords, mapLinks } from '../mapLinks';

/**
 * These URLs are the only thing standing between a buyer and the wrong piece of
 * land, so the shapes are pinned. All four use Google's documented Maps URLs
 * scheme — no API key — and the inline map is a keyless OpenStreetMap embed.
 */

const EDAPPADI = { latitude: 11.5871928, longitude: 77.8193972 };

describe('layout map links', () => {
  it('returns nothing until the layout has a pin', () => {
    expect(mapLinks(null)).toBeNull();
    expect(mapLinks(undefined)).toBeNull();
    expect(mapLinks({})).toBeNull();
    expect(mapLinks({ latitude: 11.5, longitude: null })).toBeNull();
    // 0,0 is Null Island, not a site — treat it as unset
    expect(mapLinks({ latitude: 0, longitude: 0 })).toBeNull();
  });

  it('builds all four destinations from the pin', () => {
    const l = mapLinks(EDAPPADI)!;
    expect(l.maps).toBe('https://www.google.com/maps/search/?api=1&query=11.587193,77.819397');
    expect(l.satellite).toContain('basemap=satellite');
    expect(l.satellite).toContain('center=11.587193,77.819397');
    expect(l.streetView).toContain('map_action=pano');
    expect(l.streetView).toContain('viewpoint=11.587193,77.819397');
    expect(l.earth).toBe('https://earth.google.com/web/@11.587193,77.819397,0a,800d,35y,0h,45t,0r');
    for (const url of [l.maps, l.satellite, l.streetView, l.earth, l.embed]) {
      expect(url.startsWith('https://')).toBe(true);
      expect(url).not.toContain('undefined');
      expect(url).not.toContain('NaN');
    }
  });

  it('brackets the site in the inline map', () => {
    const l = mapLinks(EDAPPADI)!;
    const bbox = new URL(l.embed).searchParams.get('bbox')!.split(',').map(Number);
    const [west, south, east, north] = bbox;
    expect(west).toBeLessThan(EDAPPADI.longitude);
    expect(east).toBeGreaterThan(EDAPPADI.longitude);
    expect(south).toBeLessThan(EDAPPADI.latitude);
    expect(north).toBeGreaterThan(EDAPPADI.latitude);
    // roughly a 700 m window — enough for a 13,420 m² site plus its approach
    expect(east - west).toBeCloseTo(0.0064, 4);
    expect(new URL(l.embed).searchParams.get('marker')).toBe('11.587193,77.819397');
  });

  it('lets an admin override Maps and Street View, but not the derived pair', () => {
    const l = mapLinks({
      ...EDAPPADI,
      mapsUrl: 'https://maps.app.goo.gl/custom',
      streetViewUrl: 'https://example.test/pano',
    })!;
    expect(l.maps).toBe('https://maps.app.goo.gl/custom');
    expect(l.streetView).toBe('https://example.test/pano');
    // satellite and Earth always follow the pin, so they cannot drift from it
    expect(l.satellite).toContain('11.587193,77.819397');
    expect(l.earth).toContain('11.587193,77.819397');
  });

  it('formats the pin with hemispheres', () => {
    expect(formatCoords(EDAPPADI)).toBe('11.587193° N, 77.819397° E');
    expect(formatCoords({ latitude: -33.8688, longitude: -151.2093 })).toBe(
      '-33.868800° S, -151.209300° W',
    );
    expect(formatCoords({})).toBeNull();
  });
});
