export declare type Era = {
    index: number,
    name: string,
    year: number
};

export declare type Faction = {
    id: string,
    name: string,
    color: string,
    founding?: number,
    dissolution?: number
};

export declare type System = {
    name: string,
    fullName: string,
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    isCluster: boolean,
    affiliations: any[],
    capitalLevels: any[],
    names: any[]
};

export declare type Nebula = {
    name: string,
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    radiusX: number,
    radiusY: number
};
