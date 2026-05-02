import type { Address } from '../types';

export interface Coordinates {
  lat: number;
  lng: number;
}

export const toGoogleMapsUrl = ({ lat, lng }: Coordinates) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

export const extractCoordsFromUrl = (value?: string | null): Coordinates | null => {
  if (!value) return null;

  const match = value.match(/q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;

  return {
    lat: Number(match[1]),
    lng: Number(match[2]),
  };
};

export const getAddressCoordinates = (address: Address): Coordinates | null =>
  address.coords || extractCoordsFromUrl(address.location);

export const haversineDistanceKm = (a: Coordinates, b: Coordinates) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const findDuplicateAddress = (
  addresses: Address[],
  coords: Coordinates,
  thresholdKm = 0.1
) =>
  addresses.find((address) => {
    const existing = getAddressCoordinates(address);
    if (!existing) return false;
    return haversineDistanceKm(existing, coords) <= thresholdKm;
  }) || null;
