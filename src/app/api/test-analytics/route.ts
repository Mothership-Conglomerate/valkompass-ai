import { NextRequest, NextResponse } from 'next/server'
import { withAnalytics, getUserId } from '@/lib/middleware/analytics'
import { trackEvent } from '@/lib/posthog'

async function testHandler(req: NextRequest) {
  const userId = getUserId(req)
  
  // Track a custom event (backend only)
  await trackEvent(userId, 'test_api_called', {
    timestamp: new Date().toISOString(),
    test_data: 'PostHog backend integration working!',
  })

  return NextResponse.json({ 
    message: 'Backend analytics test successful!',
    userId,
    timestamp: new Date().toISOString(),
    note: 'This event was tracked server-side only'
  })
}

export const GET = withAnalytics(testHandler) 