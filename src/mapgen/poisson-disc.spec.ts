import { expect } from 'chai';
import PoissonDisc from './poisson-disc';
import 'mocha';

describe('Poisson Disc algorithm class', () => {

  it('should be instantiated properly with different sets of parameters', () => {
    const pdisc1 = new PoissonDisc(100, 100, 200, 200, 30);
    const pdisc2 = new PoissonDisc(0, 0, 100, 50, 10, 20, 'pdisc2');
    const pdisc3 = new PoissonDisc(-50, -123.45, 123.34, 45.65, 10, 5, 'pdisc3', [
      { x: 0, y: 0 }, { x: 1.23, y: -2.34 }
    ]);
    expect(pdisc1.aggregatedPoints).to.be.empty;
    expect(pdisc2.aggregatedPoints).to.be.empty;
    expect(pdisc3.aggregatedPoints).to.be.empty;
  });

  it('should run the algorithm and generate seeded points reliably', () => {
    const pdisc = new PoissonDisc(0, 0, 100, 100, 10, 30, 'test').run();
    expect(pdisc.aggregatedPoints.length).to.equal(69);
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 0, y: 0 });
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 33.11955592053844, y: 99.583100039161 });
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 98.70916965380187, y: 32.74853081848726 });
  });

  it('should reserve points properly', () => {
    const pdisc = new PoissonDisc(0, 0, 100, 100, 10, 30, 'test', [
      { x: 0.1, y: -0.1 },
      { x: 33, y: 99.58 },
      { x: 98.71, y: 32.75 }
    ]).run();
    //expect(pdisc.aggregatedPoints)
    expect(pdisc.aggregatedPoints.length).to.equal(69);
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 0.1, y: -0.1 });
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 33, y: 99.58 });
    expect(pdisc.aggregatedPoints).to.deep.include({ x: 98.71, y: 32.75 });
    expect(pdisc.aggregatedPoints).to.not.deep.include({ x: 0, y: 0 });
    expect(pdisc.aggregatedPoints).to.not.deep.include({ x: 33.11955592053844, y: 99.583100039161 });
    expect(pdisc.aggregatedPoints).to.not.deep.include({ x: 98.70916965380187, y: 32.74853081848726 });
  });

  it('should work for large areas with many points', () => {
    const pdisc = new PoissonDisc(0, 0, 10000, 10000, 30).run();
    expect(pdisc.aggregatedPoints.length).to.equal(68555);
  }).slow('3s').timeout('6s');
});
