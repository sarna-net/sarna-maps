import { describe, it, expect } from 'vitest';
import { CsvParser } from './csv-parser';

describe('CsvParser.parse', () => {
  const parser = new CsvParser({ delimiter: ',', quote: '"', escape: '\\', skipEmptyLines: true });

  it('parses a basic CSV with a header row', () => {
    const records = parser.parse('id,name,x\n1,New Avalon,0\n2,Tharkad,10\n');
    expect(records).toHaveLength(2);
    expect(records[0].id).toBe('1');
    expect(records[0].name).toBe('New Avalon');
    expect(records[1].name).toBe('Tharkad');
  });

  it('handles quoted fields that span multiple lines', () => {
    const csv = 'id,note\n1,"line one\nline two"\n2,plain\n';
    const records = parser.parse(csv);
    expect(records).toHaveLength(2);
    expect(records[0].note).toBe('line one\nline two');
  });

  it('handles CRLF line endings', () => {
    const csv = 'id,name\r\n1,A\r\n2,B\r\n';
    const records = parser.parse(csv);
    expect(records).toHaveLength(2);
    expect(records[1].name).toBe('B');
  });

  it('tolerates an unterminated trailing quote without throwing', () => {
    const csv = 'id,name\n1,"unterminated\n2,ok\n';
    const records = parser.parse(csv);
    expect(records.length).toBeGreaterThan(0);
  });

  it('treats a quoted quote escape correctly', () => {
    const csv = 'id,name\n1,"say \\"hi\\""\n';
    const records = parser.parse(csv);
    expect(records[0].name).toBe('say "hi"');
  });
});
