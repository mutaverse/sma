import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useShopDatabase } from '@/db/database';
import { listRecentProducts, searchProducts } from '@/db/repositories/products';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { normalizeName } from '@/lib/normalize';
import type { Product } from '@/types/domain';

const SEARCH_DELAY_MS = 80;

export function useCatalogSearch(query: string) {
  const db = useShopDatabase();
  const debounced = useDebouncedValue(query, SEARCH_DELAY_MS);
  const [products, setProducts] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [ready, setReady] = useState(false);

  const normalized = normalizeName(debounced);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const next = normalized
          ? await searchProducts(db, normalized)
          : await listRecentProducts(db);
        if (!cancelled) {
          setProducts(next);
          setSearching(normalized.length > 0);
          setReady(true);
        }
      }

      void load();
      return () => {
        cancelled = true;
      };
    }, [db, normalized]),
  );

  return { products, searching, ready, activeQuery: normalized };
}
