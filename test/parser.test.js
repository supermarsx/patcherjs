import { Parser } from '../source/lib/patches/parser.ts';

describe('Parser.parsePatchFile', () => {
  test('parses patch data into objects', async () => {
    const data = '00000000: 00 01\n00000001: 02 03';
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches).toEqual([
      { offset: 0x00000000n, previousValue: 0x00, newValue: 0x01, byteLength: 1 },
      { offset: 0x00000001n, previousValue: 0x02, newValue: 0x03, byteLength: 1 }
    ]);
  });

  test('parses 64-bit offsets', async () => {
    const data = '100000000: 00 01';
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches[0].offset).toBe(0x100000000n);
    expect(patches[0].byteLength).toBe(1);
  });

  test('parses variable-length values', async () => {
    const data = [
      '00000000: 0001 0002',
      '00000002: 00000003 00000004',
      '00000006: 0000000000000005 0000000000000006'
    ].join('\n');
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches).toEqual([
      { offset: 0x0n, previousValue: 0x0001, newValue: 0x0002, byteLength: 2 },
      { offset: 0x2n, previousValue: 0x00000003, newValue: 0x00000004, byteLength: 4 },
      { offset: 0x6n, previousValue: 0x0000000000000005n, newValue: 0x0000000000000006n, byteLength: 8 }
    ]);
  });

  test('trailing newline does not produce extra patch', async () => {
    const data = '00000000: 00 01\n';
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches).toEqual([
      { offset: 0x00000000n, previousValue: 0x00, newValue: 0x01, byteLength: 1 }
    ]);
  });
});
