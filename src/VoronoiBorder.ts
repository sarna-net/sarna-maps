import {Logger} from './Logger';
import Delaunator from 'delaunator';
import {Point2D} from './Entities';

export declare type CellMode = 'CIRCUMCENTERS'|'CENTROIDS';

export interface VoronoiObject extends Point2D {
    name: string,
    color: string,
    adjacentTriIndices: number[]
}

/**
 * An instance of this class calculates a Voronoi diagram for a given set of
 * "colored points", in our case the points are systems and the colors are
 * affiliations.
 *
 * The algorithm yields the following outputs (after running the calculate function):
 *
 */
export class VoronoiBorder {

    constructor() {

    }

    /**
     * Runs the algorithm for the provided array of points.
     *
     * @param objects The points to calculate the diagram for
     * @param cellMode The cell mode to use ('CIRCUMCENTERS' or 'CENTROIDS'), default is 'CIRCUMCENTERS'
     * @param borderSeparation The desired distance between border lines, in global space units, default is 0.5
     */
    public calculate(objects: VoronoiObject[], cellMode: CellMode = 'CIRCUMCENTERS', borderSeparation: number = 0.5) {

        // Step 1: Put the objects into the format that Delaunator needs, then
        // run Delaunator with those points.
        const delaunatorPoints: number[][] = [];
        for(let object of objects) {
            object.adjacentTriIndices = [];
            delaunatorPoints.push([object.x, object.y]);
        }
        const delaunay = Delaunator.from(delaunatorPoints);

        // Step 2: We've now got delaunay triangles, formatted as a flat array with
        // vertex indices in groups of threes. Note that the triangles' vertices are
        // the objects (=systems) provided as this function's input.
        // Iterate over all triangles and generate voronoi nodes (center of each triangle).
        // While doing so, keep track of all incident triangles for each object
        for(let vertexIdx = 0; vertexIdx < delaunay.triangles.length; vertexIdx += 3) {
            let voronoiNode = {
                obj1Idx: delaunay.triangles[vertexIdx],
                obj2Idx: delaunay.triangles[vertexIdx+1],
                obj3Idx: delaunay.triangles[vertexIdx+2],
                x: 0,
                y: 0
            }

            // vertex objects
            let obj1 = objects[voronoiNode.obj1Idx];
            let obj2 = objects[voronoiNode.obj2Idx];
            let obj3 = objects[voronoiNode.obj3Idx];
            obj1.adjacentTriIndices.push(vertexIdx);
            obj2.adjacentTriIndices.push(vertexIdx);
            obj3.adjacentTriIndices.push(vertexIdx);

            // calculate voronoi node coordinates, using the vertex object's positions
            if(cellMode === 'CIRCUMCENTERS') {

            } else {
                voronoiNode.x = (obj1.x + obj2.x + obj3.x) / 3;
                voronoiNode.y = (obj1.y + obj2.y + obj3.y) / 3;
            }
        }
    }
}
