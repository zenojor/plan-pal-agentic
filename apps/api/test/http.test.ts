import { describe, expect, it } from 'vitest'
import { toPublicError } from '../src/http'

describe('API public errors', () => {
  it('redacts BYOK secrets from public error messages', () => {
    const message = toPublicError(
      new Error('Provider rejected sk-secret-for-test with Bearer abc.def/ghi='),
    )

    expect(message).toBe('Provider rejected [redacted] with Bearer [redacted]')
    expect(message).not.toContain('sk-secret-for-test')
    expect(message).not.toContain('abc.def')
  })
})
