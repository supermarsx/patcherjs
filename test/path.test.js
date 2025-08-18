import { Path } from '../source/lib/auxiliary/path.ts';
const { resolveEnvPath } = Path;

describe('resolveEnvPath', () => {
  test('substitutes ${VAR} placeholders', () => {
    process.env.MY_VAR = 'value';
    const result = resolveEnvPath({ path: '${MY_VAR}/file.txt' });
    expect(result).toBe('value/file.txt');
    delete process.env.MY_VAR;
  });

  test('expands leading ~ using HOME', () => {
    const home = process.env.HOME;
    const result = resolveEnvPath({ path: '~/file.txt' });
    expect(result).toBe(`${home}/file.txt`);
  });

  test('substitutes %VAR% placeholders', () => {
    process.env.MY_PERCENT = 'value';
    const result = resolveEnvPath({ path: '%MY_PERCENT%/file.txt' });
    expect(result).toBe('value/file.txt');
    delete process.env.MY_PERCENT;
  });
});
