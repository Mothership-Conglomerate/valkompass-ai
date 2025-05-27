import { NextRequest, NextResponse } from 'next/server'
import { trackApiCall } from '../posthog'

export function withAnalytics(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const method = req.method
    const endpoint = req.nextUrl.pathname
    
    // Generate a user ID from request headers
    const distinctId = getUserId(req)

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

    // Track the API call (backend only)
    await trackApiCall(
      distinctId,
      endpoint,
      method,
      statusCode,
      duration,
      {
        user_agent: req.headers.get('user-agent'),
        referer: req.headers.get('referer'),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      }
    )

    return response
  }
}

// Helper function to get user ID from request
export function getUserId(req: NextRequest): string {
  // Try to get user ID from various sources
  const userId = req.headers.get('x-user-id') || 
                req.cookies.get('user_id')?.value ||
                req.headers.get('x-forwarded-for') || 
                req.headers.get('x-real-ip') ||
                'anonymous'
  
  return userId
} 