import { PostHog } from 'posthog-node'

let postHogClient: PostHog | null = null

export function getPostHogClient(): PostHog {
  if (!postHogClient) {
    const apiKey = process.env.POSTHOG_API_KEY || 'phc_IE197mA4DKVyht5ZJCKTqUz7OUpAYCPXXLVUPKjSiSL'
    const host = process.env.POSTHOG_HOST || 'https://eu.i.posthog.com'
    
    postHogClient = new PostHog(
      apiKey,
      {
        host,
        // Flush events every 30 seconds or when 20 events are queued
        flushAt: 20,
        flushInterval: 30000,
      }
    )
  }
  return postHogClient
}

export async function trackEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  try {
    const client = getPostHogClient()
    client.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('PostHog tracking error:', error)
  }
}

export async function trackApiCall(
  distinctId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  duration?: number,
  properties?: Record<string, unknown>
) {
  await trackEvent(distinctId, 'api_call', {
    endpoint,
    method,
    status_code: statusCode,
    duration_ms: duration,
    ...properties
  })
}

// Graceful shutdown
export async function shutdownPostHog() {
  if (postHogClient) {
    await postHogClient.shutdown()
  }
} 