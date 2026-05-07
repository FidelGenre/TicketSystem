'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

export interface Category {
  id: string;
  slug: string;
  labelEs: string;
  labelEn: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  getCategoryInfo: (slug: string) => Category | undefined;
}

const CategoryContext = createContext<CategoryContextType>({
  categories: [],
  loading: true,
  getCategoryInfo: () => undefined,
});

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Solo carga categorías activas
    api.get('/categories')
      .then((res) => {
        setCategories(res.data);
      })
      .catch((err) => {
        console.error('Failed to load categories', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const getCategoryInfo = (slug: string) => {
    return categories.find(c => c.slug === slug);
  };

  return (
    <CategoryContext.Provider value={{ categories, loading, getCategoryInfo }}>
      {children}
    </CategoryContext.Provider>
  );
}

export const useCategories = () => useContext(CategoryContext);
