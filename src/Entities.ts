export interface Era {
    index: number,
    name: string,
    year: number
};

export interface Faction {
    id: string,
    name: string,
    color: string,
    founding?: number,
    dissolution?: number
};

export interface Point2D {
    x: number,
    y: number
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
    eraAffiliations: any[],
    eraCapitalLevels: any[],
    eraNames: any[]
};

export interface Nebula extends InterstellarObject {
    centerX: number,
    centerY: number,
    width: number,
    height: number
};
