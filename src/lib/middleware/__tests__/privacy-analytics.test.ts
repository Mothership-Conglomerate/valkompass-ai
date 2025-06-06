import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { getPrivacyPreservingUserId, getUserAgentInfo } from '../analytics'

describe('Privacy-Preserving Analytics Implementation', () => {
  describe('User ID Generation', () => {
    it('should create consistent session IDs based on user agent and daily salt', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      
      const req1 = new NextRequest('http://localhost:3000', {
        headers: { 'user-agent': userAgent },
      })
      
      const req2 = new NextRequest('http://localhost:3000', {
        headers: { 'user-agent': userAgent },
      })

      const userId1 = getPrivacyPreservingUserId(req1)
      const userId2 = getPrivacyPreservingUserId(req2)

      // Should be consistent for same user agent on same day
      expect(userId1).toBe(userId2)
      // Should be in session format
      expect(userId1).toMatch(/^session_[a-f0-9]{16}$/)
    })

    it('should never use IP addresses as user identifiers', () => {
      const req = new NextRequest('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'x-real-ip': '10.0.0.50',
          'cf-connecting-ip': '203.0.113.1',
        },
      })

      const userId = getPrivacyPreservingUserId(req)
      
      // Should not contain any IP addresses
      expect(userId).not.toContain('192.168.1.100')
      expect(userId).not.toContain('10.0.0.50')
      expect(userId).not.toContain('203.0.113.1')
      expect(userId).not.toContain('192.168')
      expect(userId).not.toContain('10.0')
      expect(userId).not.toContain('203.0')
      
      // Should be in privacy-preserving format
      expect(userId).toMatch(/^session_[a-f0-9]{16}$/)
    })

    it('should prefer explicit user IDs when provided', () => {
      const req = new NextRequest('http://localhost:3000', {
        headers: {
          'x-user-id': 'explicit-user-123',
          'x-forwarded-for': '192.168.1.1', // This should be ignored
        },
      })

      const userId = getPrivacyPreservingUserId(req)
      expect(userId).toBe('explicit-user-123')
    })

    it('should use cookie-based user ID when available', () => {
      const req = new NextRequest('http://localhost:3000', {
        headers: {
          Cookie: 'user_id=cookie-user-456; other=value',
          'x-forwarded-for': '192.168.1.1', // This should be ignored
        },
      })

      const userId = getPrivacyPreservingUserId(req)
      expect(userId).toBe('cookie-user-456')
    })
  })

  describe('User Agent Processing', () => {
    it('should extract browser info without logging full user agent string', () => {
      const fullUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      
      const result = getUserAgentInfo(fullUserAgent)

      expect(result).toEqual({
        browser: 'chrome',
        mobile: false,
      })

      // Ensure the result doesn't contain identifiable information
      const resultStr = JSON.stringify(result)
      expect(resultStr).not.toContain('Mozilla')
      expect(resultStr).not.toContain('Windows')
      expect(resultStr).not.toContain('AppleWebKit')
      expect(resultStr).not.toContain('120.0.0.0')
    })

    it('should detect mobile devices', () => {
      const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
      
      const result = getUserAgentInfo(mobileUserAgent)

      expect(result).toEqual({
        browser: 'safari',
        mobile: true,
      })
    })

    it('should handle unknown browsers gracefully', () => {
      const unknownUserAgent = 'SomeCustomBot/1.0'
      
      const result = getUserAgentInfo(unknownUserAgent)

      expect(result).toEqual({
        browser: 'unknown',
        mobile: false,
      })
    })

    it('should handle null user agent', () => {
      const result = getUserAgentInfo(null)

      expect(result).toEqual({
        browser: 'unknown',
        mobile: false,
      })
    })
  })

  describe('Privacy Compliance', () => {
    it('should ensure hashed user IDs cannot be reverse-engineered to original data', () => {
      const testUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/17.2',
        'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0',
      ]

      const userIds = testUserAgents.map(ua => {
        const req = new NextRequest('http://localhost:3000', {
          headers: { 'user-agent': ua },
        })
        return getPrivacyPreservingUserId(req)
      })

      // All should be in session format
      userIds.forEach(id => {
        expect(id).toMatch(/^session_[a-f0-9]{16}$/)
      })

      // None should contain original user agent information
      userIds.forEach(id => {
        expect(id).not.toContain('Mozilla')
        expect(id).not.toContain('Windows')
        expect(id).not.toContain('Macintosh')
        expect(id).not.toContain('Linux')
        expect(id).not.toContain('Chrome')
        expect(id).not.toContain('Safari')
        expect(id).not.toContain('Firefox')
      })

      // All should be different (no collisions)
      expect(new Set(userIds).size).toBe(3)
    })

    it('should rotate user IDs daily for enhanced privacy', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      
      // Mock different dates by changing the daily salt generation
      const originalDate = Date.prototype.toISOString
      
      // Day 1
      Date.prototype.toISOString = function() {
        return '2024-01-15T10:00:00.000Z'
      }
      const req1 = new NextRequest('http://localhost:3000', {
        headers: { 'user-agent': userAgent },
      })
      const userId1 = getPrivacyPreservingUserId(req1)

      // Day 2
      Date.prototype.toISOString = function() {
        return '2024-01-16T10:00:00.000Z'
      }
      const req2 = new NextRequest('http://localhost:3000', {
        headers: { 'user-agent': userAgent },
      })
      const userId2 = getPrivacyPreservingUserId(req2)

      // Restore original
      Date.prototype.toISOString = originalDate

      // IDs should be different for different days
      expect(userId1).not.toBe(userId2)
      expect(userId1).toMatch(/^session_[a-f0-9]{16}$/)
      expect(userId2).toMatch(/^session_[a-f0-9]{16}$/)
    })
  })
})