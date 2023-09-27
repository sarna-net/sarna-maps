import { Point2d } from '../../math-2d';
import { Color } from './color';
import { VoronoiNode } from './voronoi-node';

export interface BorderEdge {
    id: string,
    node1: VoronoiNode;
    node2: VoronoiNode;
    vertex1Idx: number;
    vertex2Idx: number;
    color1: Color;
    color2: Color;
    leftColor: Color;
    rightColor: Color;
    length: number;
    n1c1?: Point2d;
    n1c2?: Point2d;
    n2c1?: Point2d;
    n2c2?: Point2d;
}
