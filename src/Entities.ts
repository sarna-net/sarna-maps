import {Point2D} from './Math2D';

export interface Era {
    index: number,
    name: string,
    year: number
}

export interface Faction {
    id: string,
    name: string,
    color: string,
    founding?: number,
    dissolution?: number
}

export interface InterstellarObject extends Point2D {
    name: string,
    radiusX: number,
    radiusY: number,
    rotation: number
}

export interface System extends InterstellarObject {
    fullName: string,
    isCluster: boolean,
    eraAffiliations: string[],
    eraCapitalLevels: number[],
    eraNames: string[]
}

export interface Nebula extends InterstellarObject {
    centerX: number,
    centerY: number,
    width: number,
    height: number
}
