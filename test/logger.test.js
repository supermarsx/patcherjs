import fs from 'fs';
import os from 'os';
import { join } from 'path';
import { jest } from '@jest/globals';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => {
  delete process.env.LOG_LEVEL;
  delete process.env.LOG_TIMESTAMPS;
});

describe('Logger file output', () => {
  test('writes messages to file when configured', async () => {
    jest.resetModules();
    const { Logger } = await import('../source/lib/auxiliary/logger.ts');
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'logger-'));
    const file = join(dir, 'out.log');
    Logger.setConfig({ level: 'info', filePath: file });
    Logger.logInfo('hello file');
    expect(fs.existsSync(file)).toBe(false);
    await delay(20);
    const content = await fs.promises.readFile(file, 'utf8');
    expect(content.trim()).toBe('hello file');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('respects configured log level', async () => {
    jest.resetModules();
    const { Logger } = await import('../source/lib/auxiliary/logger.ts');
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'logger-'));
    const file = join(dir, 'out.log');
    Logger.setConfig({ level: 'error', filePath: file });
    Logger.logWarn('skip this');
    await delay(20);
    expect(fs.existsSync(file)).toBe(false);
    Logger.logError('boom');
    await delay(20);
    const content = await fs.promises.readFile(file, 'utf8');
    expect(content.trim()).toBe('boom');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('falls back to info for invalid LOG_LEVEL', async () => {
    process.env.LOG_LEVEL = 'nope';
    jest.resetModules();
    const { Logger } = await import('../source/lib/auxiliary/logger.ts');
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'logger-'));
    const file = join(dir, 'out.log');
    Logger.setConfig({ filePath: file });
    Logger.logInfo('invalid level');
    await delay(20);
    const content = await fs.promises.readFile(file, 'utf8');
    expect(content.trim()).toBe('invalid level');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('prepends timestamps when enabled', async () => {
    jest.resetModules();
    const { Logger } = await import('../source/lib/auxiliary/logger.ts');
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'logger-'));
    const file = join(dir, 'out.log');
    Logger.setConfig({ level: 'info', filePath: file, timestamps: true });
    Logger.logInfo('timed');
    await delay(20);
    const content = await fs.promises.readFile(file, 'utf8');
    expect(content.trim()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z timed$/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
