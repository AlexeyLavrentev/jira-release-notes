import { describe, it, expect } from 'vitest';
import { ConfigSchema } from '../../shared/schemas/config.js';

describe('ConfigSchema', () => {
  it('parses a valid config with all fields', () => {
    const result = ConfigSchema.safeParse({
      jiraBaseUrl: 'https://jira.example.com',
      jiraPat: 'token-123',
      releaseNoteField: 'customfield_10050',
      port: 8080,
      logLevel: 'debug',
      requestTimeoutMs: 60000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.port).toBe(8080);
      expect(result.data.releaseNoteField).toBe('customfield_10050');
    }
  });

  it('applies defaults for optional fields', () => {
    const result = ConfigSchema.safeParse({
      jiraBaseUrl: 'https://jira.example.com',
      jiraPat: 'token',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.releaseNoteField).toBe('customfield_10000');
      expect(result.data.port).toBe(3000);
      expect(result.data.logLevel).toBe('info');
      expect(result.data.requestTimeoutMs).toBe(30000);
    }
  });

  it('rejects config missing required jiraBaseUrl', () => {
    const result = ConfigSchema.safeParse({ jiraPat: 'token' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('jiraBaseUrl');
    }
  });

  it('rejects empty jiraPat', () => {
    const result = ConfigSchema.safeParse({
      jiraBaseUrl: 'https://jira.example.com',
      jiraPat: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid URL for jiraBaseUrl', () => {
    const result = ConfigSchema.safeParse({
      jiraBaseUrl: 'not-a-url',
      jiraPat: 'token',
    });
    expect(result.success).toBe(false);
  });
});
