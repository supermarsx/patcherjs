import { Parser } from '../source/lib/patches/parser.ts';

describe('Parser.parsePatchFile', () => {
  test('parses patch data into objects', async () => {
    const data = '00000000: 00 01\n00000001: 02 03';
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches).toEqual([
      { offset: 0x00000000n, previousValue: 0x00, newValue: 0x01 },
      { offset: 0x00000001n, previousValue: 0x02, newValue: 0x03 }
    ]);
  });

  test('parses 64-bit offsets', async () => {
    const data = '100000000: 00 01';
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches[0].offset).toBe(0x100000000n);
  });
});
