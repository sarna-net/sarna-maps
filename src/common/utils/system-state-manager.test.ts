import { describe, it, expect } from 'vitest';
import { SystemStateManager } from './system-state-manager';
import { System, Era, Faction } from '../types';

const MOCK_ERAS: Era[] = [
  { index: 0, name: 'Era1', year: 3025 },
  { index: 1, name: 'Era2', year: 3050 },
];

const MOCK_FACTIONS: Record<string, Faction> = {
  FWL: { id: 'FWL', name: 'Free Worlds League', color: '#purple', founding: 2271, dissolution: 3067 },
  DC: { id: 'DC', name: 'Draconis Combine', color: '#red', founding: 2271, dissolution: 3067 },
  LC: { id: 'LC', name: 'Lyran Commonwealth', color: '#blue', founding: 2271, dissolution: 3067 },
};

function createSystem(id: string, name: string, x: number, y: number, ...eraAffs: string[]): System {
  return {
    id,
    name,
    x,
    y,
    eraAffiliations: eraAffs,
    names: [],
    radiusX: 1,
    radiusY: 1,
    rotation: 0,
    areasOfInterest: [],
  } as System;
}

describe('SystemStateManager', () => {
  it('resolves basic single-faction affiliations', () => {
    const systems = [
      createSystem('1', 'Atreus', 0, 0, 'FWL', 'FWL'),
      createSystem('2', 'Luthien', 10, 10, 'DC', 'DC'),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 1);

    expect(manager.getAffiliation('1', 0)).toBe('FWL');
    expect(manager.getAffiliation('1', 1)).toBe('FWL');
    expect(manager.getAffiliation('2', 0)).toBe('DC');
    expect(manager.getAffiliation('2', 1)).toBe('DC');
  });

  it('treats U (unaffiliated) as inactive', () => {
    const systems = [
      createSystem('1', 'Nowhere', 0, 0, 'U', 'U'),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 1);

    expect(manager.isActive('1', 0)).toBe(false);
    expect(manager.isActive('1', 1)).toBe(false);
  });

  it('treats A (abandoned) as inactive', () => {
    const systems = [
      createSystem('1', 'Ghost', 0, 0, 'A', 'A'),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 1);

    expect(manager.isActive('1', 0)).toBe(false);
  });

  it('resolves empty string as inactive', () => {
    const systems = [
      createSystem('1', 'Empty', 0, 0, '', ''),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 1);

    expect(manager.isActive('1', 0)).toBe(false);
    expect(manager.getAffiliation('1', 0)).toBe('');
  });

  it('returns empty string for unknown system-era pair', () => {
    const manager = SystemStateManager.build([], MOCK_ERAS, MOCK_FACTIONS, 1);
    expect(manager.getAffiliation('nonexistent', 0)).toBe('');
    expect(manager.isActive('nonexistent', 0)).toBe(false);
  });

  it('resolves multi-level affiliations correctly', () => {
    const systems = [
      createSystem('1', 'Marik', 0, 0, 'FWL,Marik', 'FWL'),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 2);

    const level1 = manager.getAffiliationAtLevel('1', 0, 1);
    expect(level1).toBe('FWL');

    const level2 = manager.getAffiliationAtLevel('1', 0, 2);
    expect(level2).toBe('FWL,Marik');
  });

  it('resolves v3 pipe format affiliation', () => {
    const systems = [
      createSystem('1', 'Canopus', 0, 0, 'MoC|Canopus District', 'MoC'),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 1);

    // v3 format should strip the |decoration and return just "MoC"
    expect(manager.getAffiliation('1', 0)).toBe('MoC');
  });

  it('resolves disputed D(...) format', () => {
    const systems = [
      createSystem('1', 'Disputed', 0, 0, 'D(LC|DC)', 'D(LC|DC)'),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 1);

    const aff = manager.getAffiliation('1', 0);
    expect(aff).toBe('D-LC-DC');
  });

  it('detects active vs inactive systems correctly', () => {
    const systems = [
      createSystem('1', 'Active', 0, 0, 'FWL', 'U'),
      createSystem('2', 'Inactive', 10, 10, 'U', 'A'),
      createSystem('3', 'BecomeActive', 20, 20, '', 'DC'),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 1);

    expect(manager.isActive('1', 0)).toBe(true);
    expect(manager.isActive('1', 1)).toBe(false);
    expect(manager.isActive('2', 0)).toBe(false);
    expect(manager.isActive('2', 1)).toBe(false);
    expect(manager.isActive('3', 0)).toBe(false);
    expect(manager.isActive('3', 1)).toBe(true);
  });

  it('returns records for a specific era', () => {
    const systems = [
      createSystem('1', 'S1', 0, 0, 'FWL', 'DC'),
      createSystem('2', 'S2', 10, 10, 'LC', 'LC'),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 1);

    const era0Records = manager.getRecordsForEra(0);
    expect(era0Records.size).toBe(2);
    expect(era0Records.get('1_0')?.canonical).toBe('FWL');
    expect(era0Records.get('2_0')?.canonical).toBe('LC');

    const era1Records = manager.getRecordsForEra(1);
    expect(era1Records.size).toBe(2);
    expect(era1Records.get('1_1')?.canonical).toBe('DC');
  });

  it('getRaw returns the raw CSV string', () => {
    const systems = [
      createSystem('1', 'S1', 0, 0, 'FWL,Marik', 'DC'),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 2);

    expect(manager.getRaw('1', 0)).toBe('FWL,Marik');
    expect(manager.getRaw('1', 1)).toBe('DC');
  });

  it('validate does not crash on valid data', () => {
    const systems = [
      createSystem('1', 'S1', 0, 0, 'FWL', 'DC'),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 2);
    expect(() => manager.validate(systems, MOCK_ERAS)).not.toThrow();
  });

  it('consistency: isActive matches getAffiliation for non-ignored factions', () => {
    const systems = [
      createSystem('1', 'S1', 0, 0, 'FWL', 'DC'),
      createSystem('2', 'S2', 10, 10, 'LC', 'U'),
      createSystem('3', 'S3', 20, 20, 'U', 'A'),
    ];
    const manager = SystemStateManager.build(systems, MOCK_ERAS, MOCK_FACTIONS, 1);

    for (let eraIdx = 0; eraIdx < MOCK_ERAS.length; eraIdx++) {
      for (const system of systems) {
        const aff = manager.getAffiliation(system.id, eraIdx);
        const active = manager.isActive(system.id, eraIdx);
        if (aff === '' || aff === 'U' || aff === 'A') {
          expect(active).toBe(false);
        } else {
          expect(active).toBe(true);
        }
      }
    }
  });
});
