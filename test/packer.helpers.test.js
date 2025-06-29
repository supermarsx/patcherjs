import { Packer } from '../source/lib/filedrops/packer.ts';
import { basename, extname } from 'path';

describe('Packer helper functions', () => {
  const paths = [
    '/usr/local/bin/file.txt',
    'C:\\Program Files\\app\\file.exe',
    '/path/to/archive.tar.gz',
    'C:\\path\\archive.tar.gz',
    '/path/README',
    'C:\\noext'
  ];

  test.each(paths)('getFilename returns basename for %s', (p) => {
    expect(Packer.getFilename({ filePath: p })).toBe(basename(p));
  });

  test.each(paths)('getFilenameWithoutExtension returns name without ext for %s', (p) => {
    const expected = basename(p, extname(p));
    expect(Packer.getFilenameWithoutExtension({ filePath: p })).toBe(expected);
  });

  test.each(paths)('getPackedFilename appends .pack for %s', (p) => {
    const expected = `${basename(p, extname(p))}.pack`;
    expect(Packer.getPackedFilename({ filePath: p })).toBe(expected);
  });

  test.each(paths)('getPackedPath adds .pack extension to path for %s', (p) => {
    const expected = `${p}.pack`;
    expect(Packer.getPackedPath({ filePath: p })).toBe(expected);
  });
});
