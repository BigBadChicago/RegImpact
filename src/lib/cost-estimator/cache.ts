import type { CostDriver, CostEstimate } from '../../types/cost-estimate';

const costDriverCache = new Map<string, CostDriver[]>();
const estimateCache = new Map<string, CostEstimate>();

export function getCachedDrivers(key: string): CostDriver[] | undefined {
  return costDriverCache.get(key);
}

export function setCachedDrivers(key: string, drivers: CostDriver[]): void {
  costDriverCache.set(key, drivers);
}

export function getCachedEstimate(key: string): CostEstimate | undefined {
  return estimateCache.get(key);
}

export function setCachedEstimate(key: string, estimate: CostEstimate): void {
  estimateCache.set(key, estimate);
}

export function getCacheStats(): {
  driverCacheSize: number;
  estimateCacheSize: number;
} {
  return {
    driverCacheSize: costDriverCache.size,
    estimateCacheSize: estimateCache.size,
  };
}
