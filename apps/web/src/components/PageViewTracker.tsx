'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/track'

export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    void trackEvent('page_view', { pagePath: pathname })
  }, [pathname])

  return null
}
