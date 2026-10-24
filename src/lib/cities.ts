/** Turkish cities used by the becayis seed, with coordinates for the map. */
export type City = { name: string; lat: number; lon: number };

/** The 11 cities that form the guaranteed ring in the seed data. */
export const RING_CITIES: City[] = [
  { name: "Hakkari", lat: 37.5744, lon: 43.7408 },
  { name: "Ankara", lat: 39.9334, lon: 32.8597 },
  { name: "Izmir", lat: 38.4237, lon: 27.1428 },
  { name: "Trabzon", lat: 41.0027, lon: 39.7168 },
  { name: "Gaziantep", lat: 37.0662, lon: 37.3833 },
  { name: "Van", lat: 38.4891, lon: 43.4089 },
  { name: "Bursa", lat: 40.1826, lon: 29.0665 },
  { name: "Konya", lat: 37.8746, lon: 32.4932 },
  { name: "Samsun", lat: 41.2867, lon: 36.33 },
  { name: "Diyarbakir", lat: 37.9144, lon: 40.2306 },
  { name: "Antalya", lat: 36.8969, lon: 30.7133 },
];

/** Extra cities so the graph looks like a real board, not just one ring. */
export const NOISE_CITIES: City[] = [
  { name: "Istanbul", lat: 41.0082, lon: 28.9784 },
  { name: "Adana", lat: 37.0, lon: 35.3213 },
  { name: "Eskisehir", lat: 39.7767, lon: 30.5206 },
  { name: "Kayseri", lat: 38.7312, lon: 35.4787 },
  { name: "Erzurum", lat: 39.9043, lon: 41.2679 },
  { name: "Mersin", lat: 36.8121, lon: 34.6415 },
  { name: "Sanliurfa", lat: 37.1591, lon: 38.7969 },
  { name: "Malatya", lat: 38.3552, lon: 38.3095 },
  { name: "Denizli", lat: 37.7765, lon: 29.0864 },
];

export const ALL_CITIES: City[] = [...RING_CITIES, ...NOISE_CITIES];

export const CITY_BY_NAME: Record<string, City> = Object.fromEntries(
  ALL_CITIES.map((c) => [c.name, c])
);

/** Item labels are "City / Branch" -- pull the city back out for the map. */
export function cityOfLabel(label: string): City | undefined {
  const name = label.split("/")[0]?.trim();
  return name ? CITY_BY_NAME[name] : undefined;
}

/** Simple equirectangular projection into a 0..width / 0..height box. */
export function project(
  city: City,
  width: number,
  height: number,
  pad = 24
): { x: number; y: number } {
  const LON_MIN = 25.5,
    LON_MAX = 45.0;
  const LAT_MIN = 35.8,
    LAT_MAX = 42.2;
  const x = pad + ((city.lon - LON_MIN) / (LON_MAX - LON_MIN)) * (width - 2 * pad);
  const y = pad + ((LAT_MAX - city.lat) / (LAT_MAX - LAT_MIN)) * (height - 2 * pad);
  return { x, y };
}
