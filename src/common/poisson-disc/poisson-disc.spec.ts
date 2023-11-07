import 'mocha';
import { expect } from 'chai';
import { PoissonDisc } from './poisson-disc';

describe('Poisson Disc algorithm class', () => {

  const defaultPoint = { x: 0, y: 0, affiliation: 'EMPTY', };

  it('should be instantiated properly with different sets of parameters', () => {
    const pdisc1 = new PoissonDisc({}, defaultPoint);
    const pdisc2 = new PoissonDisc(
      {
        origin: { x: 100, y: 100 },
        dimensions: { width: 200, height: 200 },
        radius: 30,
      },
      defaultPoint,
    );
    const pdisc3 = new PoissonDisc(
      {
        origin: { x: 0, y: 0 },
        dimensions: { width: 100, height: 50 },
        radius: 10,
        maxSamples: 20,
        seed: 'pdisc3',
      },
      defaultPoint,
    );
    const pdisc4 = new PoissonDisc(
      {
        origin: { x: -50, y: -123.45 },
        dimensions: { width: 123.34, height: 45.65 },
        radius: 10,
        maxSamples: 5,
        seed: 'pdisc4',
      },
      defaultPoint,
      [],
    );
    expect(pdisc1.aggregatedPoints).to.be.empty;
    expect(pdisc2.aggregatedPoints).to.be.empty;
    expect(pdisc3.aggregatedPoints).to.be.empty;
    expect(pdisc4.aggregatedPoints).to.be.empty;
  });

  it('should run the algorithm and generate seeded points reliably', () => {
    const pdisc = new PoissonDisc(
      {
        origin: { x: 0, y: 0 },
        dimensions: { width: 100, height: 100 },
        radius: 10,
        maxSamples: 30,
        seed: 'test',
      },
      defaultPoint,
    ).run();
    expect(pdisc.aggregatedPoints.length).to.equal(69);
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 0, y: 0, affiliation: 'EMPTY' });
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 33.11955592053844, y: 99.583100039161, affiliation: 'EMPTY' });
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 98.70916965380187, y: 32.74853081848726, affiliation: 'EMPTY' });
  });

  it('should reserve points properly', () => {
    const pdisc = new PoissonDisc(
      {
        origin: { x: 0, y: 0 },
        dimensions: { width: 100, height: 100 },
        radius: 10,
        maxSamples: 30,
        seed: 'test',
      },
      defaultPoint,
      [
        { x: 0.1, y: -0.1, affiliation: '' },
        { x: 33, y: 99.58, affiliation: '' },
        { x: 98.71, y: 32.75, affiliation: '' },
      ],
    ).run();
    expect(pdisc.aggregatedPoints.length).to.equal(69);
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 0.1, y: -0.1, affiliation: '' });
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 33, y: 99.58, affiliation: '' });
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 98.71, y: 32.75, affiliation: '' });
    expect(pdisc.aggregatedPoints).to.not.deep.include({ x: 0, y: 0, affiliation: 'EMPTY' });
    expect(pdisc.aggregatedPoints).to.not.deep.include({ x: 33.11955592053844, y: 99.583100039161, affiliation: 'EMPTY' });
    expect(pdisc.aggregatedPoints).to.not.deep.include({ x: 98.70916965380187, y: 32.74853081848726, affiliation: 'EMPTY' });
  });

  it('should work for large areas with many points', () => {
    const pdisc = new PoissonDisc(
      {
        origin: { x: 0, y: 0 },
        dimensions: { width: 10000, height: 10000 },
        radius: 30,
      },
      defaultPoint,
    ).run();
    expect(pdisc.aggregatedPoints.length).to.equal(68555);
  }).slow('3s').timeout('6s');
});
