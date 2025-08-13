import fs from 'fs';
import os from 'os';
import { join } from 'path';

let Logger;

beforeAll(async () => {
  ({ Logger } = await import('../source/lib/auxiliary/logger.ts'));
});

afterEach(() => {
  Logger.setConfig({ level: 'info', filePath: undefined });
});

describe('Logger file output', () => {
  test('writes messages to file when configured', () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'logger-'));
    const file = join(dir, 'out.log');
    Logger.setConfig({ level: 'info', filePath: file });
    Logger.logInfo('hello file');
    const content = fs.readFileSync(file, 'utf8');
    expect(content.trim()).toBe('hello file');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('respects configured log level', () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'logger-'));
    const file = join(dir, 'out.log');
    Logger.setConfig({ level: 'error', filePath: file });
    Logger.logWarn('skip this');
    expect(fs.existsSync(file)).toBe(false);
    Logger.logError('boom');
    const content = fs.readFileSync(file, 'utf8');
    expect(content.trim()).toBe('boom');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
