import { describe, it, expect } from 'vitest';
import { haversineDistance } from './geo';

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    const point = { lat: 13.0827, lng: 80.2707 };
    expect(haversineDistance(point, point)).toBe(0);
  });

  it('matches the known distance between Chennai and Bengaluru (~290km) within 5%', () => {
    const chennai = { lat: 13.0827, lng: 80.2707 };
    const bengaluru = { lat: 12.9716, lng: 77.5946 };
    const distanceMeters = haversineDistance(chennai, bengaluru);
    const expectedMeters = 290_000;
    expect(Math.abs(distanceMeters - expectedMeters) / expectedMeters).toBeLessThan(0.05);
  });

  it('is symmetric', () => {
    const a = { lat: 13.05, lng: 80.2 };
    const b = { lat: 13.09, lng: 80.25 };
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 6);
  });
});
