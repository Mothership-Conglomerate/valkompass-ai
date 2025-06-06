import { NextRequest, NextResponse } from 'next/server'
import { trackApiCall } from '../posthog'
import { createHash } from 'crypto'

export function withAnalytics(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const method = req.method
    const endpoint = req.nextUrl.pathname
    
    // Generate a privacy-preserving user ID
    const distinctId = getPrivacyPreservingUserId(req)

    let response: NextResponse
    let statusCode: number

    try {
      response = await handler(req)
      statusCode = response.status
    } catch (error) {
      statusCode = 500
      console.error('API Error:', error)
      response = NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime

    // Track the API call with privacy-preserving properties
    await trackApiCall(
      distinctId,
      endpoint,
      method,
      statusCode,
      duration,
      {
        user_agent: getUserAgentInfo(req.headers.get('user-agent')),
        has_referer: !!req.headers.get('referer'),
        // No IP addresses logged
      }
    )

    return response
  }
}

// Helper function to create privacy-preserving user ID
export function getPrivacyPreservingUserId(req: NextRequest): string {
  // Try session-based IDs first (privacy-preserving)
  const explicitUserId = req.headers.get('x-user-id') || req.cookies.get('user_id')?.value
  
  if (explicitUserId) {
    return explicitUserId
  }

  // Create a session-stable but privacy-preserving ID
  // Hash combination of User-Agent and a daily salt to create consistent session IDs
  // without storing PII or IP addresses
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const dailySalt = getDailySalt()
  const sessionData = `${userAgent}-${dailySalt}`
  
  // Create a hash that's consistent for the day but changes daily
  const hash = createHash('sha256').update(sessionData).digest('hex')
  return `session_${hash.substring(0, 16)}`
}

// Get user agent info without logging full string
export function getUserAgentInfo(userAgent: string | null): object {
  if (!userAgent) {
    return { browser: 'unknown', mobile: false }
  }

  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)
  let browser = 'unknown'
  
  if (/Edg\//.test(userAgent)) browser = 'edge'
  else if (/Chrome/.test(userAgent)) browser = 'chrome'
  else if (/Firefox/.test(userAgent)) browser = 'firefox'
  else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) browser = 'safari'

  return { browser, mobile: isMobile }
}

// Generate a daily salt for session consistency
function getDailySalt(): string {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return `valkompass-${today}`
}

// Legacy function for backward compatibility
export function getUserId(req: NextRequest): string {
  return getPrivacyPreservingUserId(req)
} 