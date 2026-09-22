'use client';

import { useDemoStore } from '@/store/demo-store';
import { useEffect } from 'react';

export function StoreHydrator() {
  useEffect(() => {
    void useDemoStore.persist.rehydrate();
  }, []);

  return null;
}
