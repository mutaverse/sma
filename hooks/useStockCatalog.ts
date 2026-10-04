import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useShopDatabase } from '@/db/database';
import { listCategories } from '@/db/repositories/categories';
import {
  listCatalog,
  type CatalogSort,
  type CatalogScope,
  type CategoryFilter,
} from '@/db/repositories/products';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { normalizeName } from '@/lib/normalize';
import type { Category, Product } from '@/types/domain';

const SEARCH_DELAY_MS = 80;

export function useStockCatalog(
  query: string,
  category: CategoryFilter,
  scope: CatalogScope,
  sort: CatalogSort,
) {
  const db = useShopDatabase();
  const debounced = useDebouncedValue(query, SEARCH_DELAY_MS);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ready, setReady] = useState(false);
  const normalized = normalizeName(debounced);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const [nextProducts, nextCategories] = await Promise.all([
          listCatalog(db, {
            query: normalized,
            category,
            scope,
            sort,
          }),
          listCategories(db),
        ]);
        if (!cancelled) {
          setProducts(nextProducts);
          setCategories(nextCategories);
          setReady(true);
        }
      }

      void load();
      return () => {
        cancelled = true;
      };
    }, [db, normalized, category, scope, sort]),
  );

  return {
    products,
    categories,
    ready,
    searching: normalized.length > 0,
    activeQuery: normalized,
  };
}
