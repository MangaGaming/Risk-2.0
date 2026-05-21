import type { Territory, Continent } from '@/types/game';

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function countTerritories(territories: Record<string, Territory>, playerIdx: number): number {
  return Object.values(territories).filter((t) => t.owner === playerIdx).length;
}

export function getContinentForTerritory(
  name: string,
  continents: Record<string, Continent>
): string | null {
  for (const [cont, data] of Object.entries(continents)) {
    if (data.territories.includes(name)) return cont;
  }
  return null;
}
