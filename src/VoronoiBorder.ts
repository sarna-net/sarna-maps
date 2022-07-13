import { Logger } from './Logger';
import Delaunator from 'delaunator';
import {
  Point2D,
    Vector2D,
    circumcenter,
    distance,
    pointsAreEqual,
    pointIsLeftOfLine,
    crossProduct,
    movePoint,
    addVectors,
    scaleVector,
    normalizeVector
} from './Math2D';
import { deepCopy } from "./Utils";

export declare type CellMode = 'CIRCUMCENTERS'|'CENTROIDS';

export declare type Color = string;

export interface DelaunayVertex extends Point2D {
    color: Color;
    adjacentTriIndices: number[];
}

export interface VoronoiNode extends Point2D {
    vertex1Idx: number;
    vertex2Idx: number;
    vertex3Idx: number;
    neighborNodeIndices: number[];
    borderColors: {[index:string]: boolean};
}

export interface BorderEdge {
    id: string,
    node1: VoronoiNode,
    node2: VoronoiNode,
    vertex1Idx: number,
    vertex2Idx: number,
    color1: Color,
    color2: Color,
    leftColor: Color,
    rightColor: Color,
    length: number,
    n1c1?: Point2D,
    n1c2?: Point2D,
    n2c1?: Point2D,
    n2c2?: Point2D
}

export interface BorderEdgeLoop {
    edges: BorderEdge[];
    minEdgeIdx: number;
    innerColor?: Color;
}

/**
 * An instance of this class calculates a Voronoi diagram for a given set of
 * "colored points", in our case the points are systems and the colors are
 * affiliations.
 *
 * The algorithm yields the following outputs (after running the calculate function):
 * TODO describe algorithm options and outputs
 */
export class VoronoiBorder {

    /**
     * Runs the border generation algorithm, based on the provided array of points.
     *
     * @param vertices The delaunay vertices (systems and noise points) that we want to calculate a voronoi diagram for
     * @param cellMode The cell mode to use ('CIRCUMCENTERS' or 'CENTROIDS') (default is 'CIRCUMCENTERS')
     * @param borderSeparation The desired distance between border lines, in global space units (default is 0.5)
     * @param controlPointTension The amount of control point tension (default is 0.35)
     * @returns The algorithm's result
     */
    public static calculateBorders(vertices: DelaunayVertex[], cellMode: CellMode = 'CIRCUMCENTERS',
                                   borderSeparation = 0.5, controlPointTension = 0.35) {
        // reset vertices' adjacency information
        vertices.forEach(vertex => { vertex.adjacentTriIndices = [] });
        // run delaunay triangulation (using the delaunator library)
        const delaunay = Delaunator.from(vertices.map(vertex => [vertex.x, vertex.y]));
        // create the voronoi nodes based on the triangulation
        const voronoiNodes = this.generateVoronoiNodes(delaunay, vertices, cellMode);
        // process the voronoi nodes and generate border edges
        const borderEdges = this.generateBorderEdges(voronoiNodes, vertices);
        // using the border edges, create proper border loops
        const borderLoops = this.generateBorderLoops(borderEdges, vertices);
        // separate borders and generate control points
        this.processBorderLoops(borderLoops, vertices, borderSeparation, controlPointTension);
        return borderLoops;
    }

    /**
     * Iterates over the the triangles and generate voronoi nodes (center of each triangle).
     *
     * Note that the delaunator result's triangles property is a flat array of vertex indices,
     * organized in groups of threes.
     *
     * @param delaunay The delaunay triangulation result
     * @param vertices The list of delaunay vertices / colored points. Will be modified.
     * @param cellMode The cell mode to use
     * @returns The list of generated voronoi nodes
     */
    private static generateVoronoiNodes(delaunay: Delaunator<ArrayLike<number>>, vertices: DelaunayVertex[], cellMode: CellMode) {
        const voronoiNodes: VoronoiNode[] = [];
        // When reading this function, keep in mind that there are exactly as many voronoi nodes as
        // there are delaunay triangles, which means that the voronoi node with index i corresponds
        // to the triangle with index i*3.
        for(let vertexIdx = 0; vertexIdx < delaunay.triangles.length; vertexIdx += 3) {
            let voronoiNode = {
                x: Infinity, // initialize with infinity, will be corrected later
                y: Infinity, // initialize with infinity, will be corrected later
                vertex1Idx: delaunay.triangles[vertexIdx],
                vertex2Idx: delaunay.triangles[vertexIdx+1],
                vertex3Idx: delaunay.triangles[vertexIdx+2],
                neighborNodeIndices: [],
                borderColors: {}
            };

            // vertex objects (a system or noise point)
            let vertex1 = vertices[voronoiNode.vertex1Idx];
            let vertex2 = vertices[voronoiNode.vertex2Idx];
            let vertex3 = vertices[voronoiNode.vertex3Idx];
            vertex1.adjacentTriIndices.push(vertexIdx);
            vertex2.adjacentTriIndices.push(vertexIdx);
            vertex3.adjacentTriIndices.push(vertexIdx);

            // calculate voronoi node coordinates, using the vertex object's positions
            if(cellMode === 'CIRCUMCENTERS') {
                let ccenter = circumcenter(vertex1, vertex2, vertex3);
                if(!ccenter) {
                    Logger.warn(`Cannot calculate circumcenter for voronoi node. ` +
                        `Using centroid instead. Vertices:`,
                        vertex1, vertex2, vertex3);
                } else {
                    voronoiNode.x = ccenter.x;
                    voronoiNode.y = ccenter.y;
                }
            }
            if(cellMode === 'CENTROIDS' || voronoiNode.x === Infinity) {
                voronoiNode.x = (vertex1.x + vertex2.x + vertex3.x) / 3;
                voronoiNode.y = (vertex1.y + vertex2.y + vertex3.y) / 3;
            }
            voronoiNodes.push(voronoiNode);
        }
        return voronoiNodes;
    }

    /**
     * Iterates over the provided list of voronoi nodes and
     *   a) connects neighboring nodes
     *   b) identifies and marks border nodes based on vertex colors
     *   c) creates and returns border edges
     *
     * Note that the provided voronoi nodes will be enriched with additional data,
     * i.e. modified.
     *
     * @param voronoiNodes The list of voronoi nodes - will be modified
     * @param vertices The list of vertex objects (systems / noise points)
     * @returns The list of border edges
     */
    private static generateBorderEdges(voronoiNodes: VoronoiNode[], vertices: DelaunayVertex[]) {
        const borderNodeIndices: Map<Color,number[]> = new Map();
        const borderEdges: Map<Color,BorderEdge[]> = new Map();

        for(let nodeIdx = 0, triIdx = 0; nodeIdx < voronoiNodes.length; nodeIdx++, triIdx += 3) {
            let voronoiNode = voronoiNodes[nodeIdx];
            // Find all (<= 3) adjacent triangles for the current node
            // We do not need to consider all triangles as potential neighbors here.
            // Since we've remembered each vertex's adjacent triangles during previous
            // steps, we'll just look at those triangles and look for edges they share
            // with the current triangle.
            // The way to find a shared edge is checking each triangle adjacent
            // to the current triangle's vertex A and testing if it is also adjacent
            // to vertex B or C. This finds all neighbor triangles along the A-B
            // and A-C edges. The same principle is then applied to the B-C edge.
            //
            // This is slightly more complicated than just iterating over all
            // triangles again, but reduces the algorithm's big-O complexity.
            let vertex1 = vertices[voronoiNode.vertex1Idx];
            let vertex2 = vertices[voronoiNode.vertex2Idx];
            let vertex3 = vertices[voronoiNode.vertex3Idx];

            // A-B and A-C edges:
            for(let vert1AdjTriIndex of vertex1.adjacentTriIndices) {
                // trivially, the current triangle is not its own neighbor
                if(vert1AdjTriIndex === triIdx) { continue; }
                for(let vert2AdjTriIndex of vertex2.adjacentTriIndices) {
                    if(vert1AdjTriIndex === vert2AdjTriIndex) {
                        voronoiNode.neighborNodeIndices.push(vert1AdjTriIndex / 3);
                    }
                }
                for(let vert3AdjTriIndex of vertex3.adjacentTriIndices) {
                    if(vert1AdjTriIndex === vert3AdjTriIndex) {
                        voronoiNode.neighborNodeIndices.push(vert1AdjTriIndex / 3);
                    }
                }
            }
            // B-C edges
            for(let vert2AdjTriIndex of vertex2.adjacentTriIndices) {
                if(vert2AdjTriIndex === triIdx) { continue; }
                for(let vert3AdjTriIndex of vertex3.adjacentTriIndices) {
                    if(vert2AdjTriIndex === vert3AdjTriIndex) {
                        voronoiNode.neighborNodeIndices.push(vert2AdjTriIndex / 3);
                    }
                }
            }

            // Iterate over the current node's vertices and mark the node as a border node
            // if not all vertices have the same color.
            // Also remember all adjacent colors for each node.
            if(!borderNodeIndices.has(vertex1.color)) { borderNodeIndices.set(vertex1.color, []) }
            if(!borderNodeIndices.has(vertex2.color)) { borderNodeIndices.set(vertex2.color, []) }
            if(!borderNodeIndices.has(vertex3.color)) { borderNodeIndices.set(vertex3.color, []) }

            // case 1: all objects share the same color (no border)
            if(vertex1.color === vertex2.color && vertex2.color === vertex3.color) {
                // do nothing
            // case 2: vertex 1 and 2 share color, vertex 3 has different color
            } else if(vertex1.color === vertex2.color && vertex1.color !== vertex3.color) {
                (borderNodeIndices.get(vertex1.color) as number[]).push(nodeIdx);
                voronoiNode.borderColors[vertex1.color] = true;
                (borderNodeIndices.get(vertex3.color) as number[]).push(nodeIdx);
                voronoiNode.borderColors[vertex3.color] = true;
            // case 3: vertex 1 and 3 share color, vertex 2 has different color
            } else if(vertex1.color === vertex3.color && vertex1.color !== vertex2.color) {
                (borderNodeIndices.get(vertex1.color) as number[]).push(nodeIdx);
                voronoiNode.borderColors[vertex1.color] = true;
                (borderNodeIndices.get(vertex2.color) as number[]).push(nodeIdx);
                voronoiNode.borderColors[vertex2.color] = true;
            // case 4: vertex 2 and 3 share color, vertex 1 has different color
            } else if(vertex2.color === vertex3.color && vertex1.color !== vertex2.color) {
                (borderNodeIndices.get(vertex1.color) as number[]).push(nodeIdx);
                voronoiNode.borderColors[vertex1.color] = true;
                (borderNodeIndices.get(vertex2.color) as number[]).push(nodeIdx);
                voronoiNode.borderColors[vertex2.color] = true;
            // case 5: each vertex has a different color
            } else {
                (borderNodeIndices.get(vertex1.color) as number[]).push(nodeIdx);
                voronoiNode.borderColors[vertex1.color] = true;
                (borderNodeIndices.get(vertex2.color) as number[]).push(nodeIdx);
                voronoiNode.borderColors[vertex2.color] = true;
                (borderNodeIndices.get(vertex3.color) as number[]).push(nodeIdx);
                voronoiNode.borderColors[vertex3.color] = true;
            }

            // Finally, create a border edge between this node and each of its different-colored neighbors
            for(let neighborIdx of voronoiNode.neighborNodeIndices) {
                // in order to make sure we add edges to the list only once, skip all neighbors that
                // have already been searched themselves
                if(nodeIdx >= neighborIdx) {
                    continue;
                }
                let neighborNode = voronoiNodes[neighborIdx];
                // find the vertices shared by the node and its neighbor
                let nodeVertexIndices = [voronoiNode.vertex1Idx, voronoiNode.vertex2Idx, voronoiNode.vertex3Idx];
                let neighborVertexIndices = [neighborNode.vertex1Idx, neighborNode.vertex2Idx, neighborNode.vertex3Idx];
                let sharedVertexIndices = nodeVertexIndices.filter(idx => neighborVertexIndices.includes(idx));
                if(sharedVertexIndices.length >= 2) {
                    let color1 = vertices[sharedVertexIndices[0]].color;
                    let color2 = vertices[sharedVertexIndices[1]].color;
                    if(color1 !== color2) {
                        let borderEdge = {
                            id: `${nodeIdx}-${neighborIdx}`,
                            node1: voronoiNode,
                            node2: neighborNode,
                            vertex1Idx: sharedVertexIndices[0],
                            vertex2Idx: sharedVertexIndices[1],
                            color1,
                            color2,
                            leftColor: '', // will be calculated later
                            rightColor: '', // will be calculated later
                            length: distance(voronoiNode, neighborNode)
                        };
                        if(!borderEdges.has(color1)) { borderEdges.set(color1, []); }
                        if(!borderEdges.has(color2)) { borderEdges.set(color2, []); }
                        (borderEdges.get(color1) as BorderEdge[]).push(borderEdge);
                    }
                }
            }
        }
        return borderEdges;
    }

    /**
     * Sorts the border edge arrays and creates border edge loops such that each
     * edge in a loop is either followed by its next clockwise neighbor, or -
     * if no such neighbor can be found - by another edge loop's random starting
     * edge. It should be possible to iterate over the edges via
     * edge1.node2 = edge2.node1, edge2.node2 = edge3.node1 etc.
     *
     * @param borderEdges The border edges map
     * @param vertices The vertices (= systems and noise points) that the voronoi diagram is based on
     * @returns The map, by color, of all border loops
     */
    private static generateBorderLoops(borderEdges: Map<Color,BorderEdge[]>, vertices: DelaunayVertex[]) {
        const borderLoops: Map<Color,BorderEdgeLoop[]> = new Map();

        for(let [color, originalEdges] of borderEdges) {
            // The array of unprocessed edges (a clone of the original edges).
            // It's actually important to clone the edge objects here, because each color's
            // loops will be modified separately (and differently) at a later stage.
            let unprocessedEdges = deepCopy<BorderEdge[]>(originalEdges);
            // the array of loops for the current color
            if(!borderLoops.has(color)) {
                borderLoops.set(color, []);
            }
            let currentColorLoops = borderLoops.get(color) as BorderEdgeLoop[];
            //let edges = deepCopy<BorderEdge[]>(originalEdges);

            let currentLoop: BorderEdgeLoop = {
                edges: [],
                minEdgeIdx: -1
            };
            let previousEdge: BorderEdge|void = void 0;
            let currentEdge: BorderEdge|void = void 0;
            // While there are still any unprocessed edges for the current color ...
            while(unprocessedEdges.length > 0) {
                if(!currentEdge) {
                    // This should happen at the start of the algorithm:
                    // No current edge has been picked yet, so just choose
                    // the first edge in the array.
                    currentEdge = unprocessedEdges.shift();
                } else {
                    // An edge has finished being processed. The next step is to attempt
                    // finding that edge's next unprocessed neighbor, make sure that we have
                    // a traversable linked list of edges (e1.n2 == e2.n1, e2.n2 == e3.n1 etc.)
                    // If a neighbor is found, it will be processed next.
                    previousEdge = currentEdge;
                    currentEdge = void 0;
                    for(let unprocessedEdgeIdx = 0; unprocessedEdgeIdx < unprocessedEdges.length; unprocessedEdgeIdx++) {
                        let potentialNeighborEdge = unprocessedEdges[unprocessedEdgeIdx];
                        let neighborFound = false;
                        // look for a neighbor and make sure it is connected correctly
                        if(pointsAreEqual(previousEdge.node1, potentialNeighborEdge.node1)) {
                            // There is a neighbor link, but it's e1.n1 == e2.n1. Swap e1's nodes to
                            // resolve the problem.
                            this.swapEdgeNodes(previousEdge);
                            neighborFound = true;
                        } else if(pointsAreEqual(previousEdge.node1, potentialNeighborEdge.node2)) {
                            // There is a neighbor link, but it's e1.n1 == e2.n2. Swap both edges'
                            // nodes to resolve the problem.
                            this.swapEdgeNodes(previousEdge);
                            this.swapEdgeNodes(potentialNeighborEdge);
                            neighborFound = true;
                        } else if(pointsAreEqual(previousEdge.node2, potentialNeighborEdge.node2)) {
                            // There is a neighbor link, but it's e2.n2 == e2.n2. Swap e2's nodes to
                            // resolve the problem.
                            this.swapEdgeNodes(potentialNeighborEdge);
                            neighborFound = true;
                        } else if(pointsAreEqual(previousEdge.node2, potentialNeighborEdge.node1)) {
                            // perfect case - edges do not need to be modified
                            neighborFound = true;
                        }
                        // if a neighbor has been identified, process that neighboring edge next
                        if(neighborFound) {
                            currentEdge = potentialNeighborEdge;
                            // remove neighbor edge from unprocessed edges
                            unprocessedEdges.splice(unprocessedEdgeIdx, 1);
                            break;
                        }
                    }
                    // If the neighbor search has not yielded any neighboring edges,
                    // we'll start a new edge loop.
                    if(!currentEdge) {
                        currentEdge = unprocessedEdges.shift();
                        // finalize previous loop
                        if(currentLoop.edges.length > 0) {
                            currentColorLoops.push(currentLoop);
                        }
                        // instantiate new loop
                        currentLoop = {
                            edges: [],
                            minEdgeIdx: -1
                        };
                    }
                }

                if(!currentEdge) {
                    throw new Error(`Error while generating border loops for ${color}: ` +
                        `No current edge object with ${unprocessedEdges.length} unprocessed edges remaining.`);
                }

                // At this point, we should have a current edge and the edge loop that it belongs to.
                // Check if the current edge's node2 point is the leftmost, bottom point in its loop.
                // If it is, mark this edge as the loop's "minimum" edge. This gives us an edge that is
                // guaranteed to be on the loop's convex hull, thus making it a possible pivot point
                // to check the loop's orientation (CW / CCW).
                if(currentLoop.minEdgeIdx < 0
                    || currentEdge.node2.x  < currentLoop.edges[currentLoop.minEdgeIdx].node2.x) {
                    currentLoop.minEdgeIdx = currentLoop.edges.length;
                } else if(currentEdge.node2.x === currentLoop.edges[currentLoop.minEdgeIdx].node2.x
                    && currentEdge.node2.y < currentLoop.edges[currentLoop.minEdgeIdx].node2.y) {
                    currentLoop.minEdgeIdx = currentLoop.edges.length;
                }
                // find the color to the left and right of the current edge
                if(pointIsLeftOfLine(vertices[currentEdge.vertex1Idx], currentEdge.node1, currentEdge.node2)) {
                    currentEdge.leftColor = currentEdge.color1;
                    currentEdge.rightColor = currentEdge.color2;
                } else {
                    currentEdge.leftColor = currentEdge.color2;
                    currentEdge.rightColor = currentEdge.color1;
                }

                // finally, actually add the edge to the current loop
                currentLoop.edges.push(currentEdge);
            }
            // Edge processing done. Add last processed loop to the current color's edge loop array
            if(currentLoop && currentLoop.edges.length > 0) {
                currentColorLoops.push(currentLoop);
            }

            // We now have neat loops for the current color, but we still need to make sure their edges are in
            // clockwise order.
            currentColorLoops.forEach(loop => this.ensureEdgeLoopClockwiseOrder(loop));

            // Edge loop generation finished for the current color.
        }
        return borderLoops;
    }

    /**
     * Ensures that the given loop has its linked list of edges ordered in a clockwise fashion.
     * Once a loop is guaranteed to be clockwise, its inner color can be determined by looking
     * at any edge's right side vertex.
     *
     * Modifies the provided edge loop in-place.
     *
     * @param edgeLoop
     */
    private static ensureEdgeLoopClockwiseOrder(edgeLoop: BorderEdgeLoop) {
        let minEdge = edgeLoop.edges[edgeLoop.minEdgeIdx];
        let nextEdge = edgeLoop.edges[(edgeLoop.minEdgeIdx + 1) % edgeLoop.edges.length];
        let node1 = minEdge.node1;
        let node2 = minEdge.node2;
        let node3 = nextEdge.node2;
        let crossP = crossProduct(
            { a: node1.x - node2.x, b: node1.y - node2.y },
            { a: node3.x - node2.x, b: node3.y - node2.y }
        );
        if(crossP < 0) {
            // loop's order is counter-clockwise
            // reverse loop's edges to make their order clockwise
            this.reverseEdgeLoop(edgeLoop);
        }
        // set loop object's inner color information
        edgeLoop.innerColor = edgeLoop.edges[0].rightColor;
    }

    /**
     * Reverses a given border edge loop in-place. This means the passed object will be modified.
     *
     * @param edgeLoop The loop to reverse
     */
    private static reverseEdgeLoop(edgeLoop: BorderEdgeLoop) {
        edgeLoop.edges.reverse();
        for(let edgeIdx = 0; edgeIdx < edgeLoop.edges.length; edgeIdx++) {
            VoronoiBorder.swapEdgeNodes(edgeLoop.edges[edgeIdx]);
            if(edgeLoop.edges[edgeLoop.minEdgeIdx].node2.x >= edgeLoop.edges[edgeIdx].node2.x
               && edgeLoop.edges[edgeLoop.minEdgeIdx].node2.y >= edgeLoop.edges[edgeIdx].node2.y) {
                edgeLoop.minEdgeIdx = edgeIdx;
            }
        }
    }

    /**
     * Swaps the given edge's nodes, in-place.
     *
     * @param edge The edge
     */
    private static swapEdgeNodes(edge: BorderEdge) {
        edge.id = edge.id.split('-').reverse().join('-');
        let tmpNode = edge.node1;
        edge.node1 = edge.node2;
        edge.node2 = tmpNode;
        let tmpColor = edge.leftColor;
        edge.leftColor = edge.rightColor;
        edge.rightColor = tmpColor;
    }

    /**
     * Pulls each edge slightly closer to its same-color vertex. This is optional, but works well when border strokes
     * have a certain thickness.
     *
     * Note that the provided edge loops, specifically the edges they contain, will be modified by this function.
     * All loops should be in clockwise order.
     *
     * @param borderEdgeLoops The map of border edge loops, by color
     * @param vertices The algorithm's delaunay vertices / systems
     * @param borderSeparation The amount of distance that any given edge will be pulled
     * @param controlPointTension The control point tension value
     */
    private static processBorderLoops(borderEdgeLoops: Map<Color,BorderEdgeLoop[]>, vertices: DelaunayVertex[], borderSeparation: number, controlPointTension: number) {
        // ignore border separation values under a certain threshold
        if(Math.abs(borderSeparation) < 0.01) { return; }
        for(let [color, edgeLoops] of borderEdgeLoops) {
            edgeLoops.forEach(loop => {
                this.pullEdgeLoop(loop, vertices, borderSeparation);
                this.generateEdgeControlPoints(loop, controlPointTension);
            });
        }
    }

    /**
     * Pulls each edge of a single edge loop closer to its same-color vertex.
     *
     * Note that the edges (and their nodes) within the provided edge loop will be modified by this function.
     * The loop should be in clockwise order.
     *
     * @param loop The loop to modify
     * @param borderSeparation The amount of distance that any given edge will be pulled
     */
    private static pullEdgeLoop(loop: BorderEdgeLoop, vertices: DelaunayVertex[], borderSeparation: number) {
        const originalEdges = deepCopy<BorderEdge[]>(loop.edges);
        for(let curEdgeIdx = 0; curEdgeIdx < loop.edges.length; curEdgeIdx++) {
            // We're always looking at the current edge's second node (node2), which is identical to the
            // loop's next edge's first node. The node will be pulled towards the two right-side vertices
            // Not that the loop's edges are in clockwise order, so the "inner" vertices are the same color as the edge loop.
            let currentEdge = loop.edges[curEdgeIdx];
            let originalEdge = originalEdges[curEdgeIdx];
            let nextEdge = loop.edges[(curEdgeIdx + 1) % loop.edges.length];
            let rightSideVertexIdx = currentEdge.color1 === currentEdge.rightColor ? currentEdge.vertex1Idx : currentEdge.vertex2Idx;
            // TODO remove let rightSideVertex = vertices[rightSideVertexIdx];
            let translationVector: Vector2D = { a: 0, b: 0 };

            let point1 = originalEdge.node1;
            let point2 = originalEdge.node2;
            let point3 = nextEdge.node2;

            let vector1 = { a: point2.x - point1.x, b: point2.y - point1.y };
            let vector2 = { a: point3.x - point2.x, b: point3.y - point2.y };

            // right-side perpendicular vectors
            let pVector1 = { a: vector1.b, b: -vector1.a };
            let pVector2 = { a: vector2.b, b: -vector2.a };

            normalizeVector(pVector1);
            normalizeVector(pVector2);
            addVectors(translationVector, pVector1);
            addVectors(translationVector, pVector2);
            scaleVector(translationVector, borderSeparation);

            // move the point in question
            // note that the original point is cached, so that these operations do not
            // have an effect on the next iteration
            movePoint(currentEdge.node2, translationVector);
            movePoint(nextEdge.node1, translationVector);
            // TODO remove currentEdge.node2.x = nextEdge.node1.x = originalEdge.node2.x + moveByVector.a;
            // TODO remove currentEdge.node2.y = nextEdge.node1.y = originalEdge.node2.y + moveByVector.a;
        }
    }

    /**
     * For each node of the given loop, generate two bezier control points. The goal is to have rounded
     * border edges.
     *
     * Edges must be sorted.
     *
     * @param loop The loop to generate control points for
     * @param tension The control point tension value
     */
    private static generateEdgeControlPoints(loop: BorderEdgeLoop, tension: number) {
        for(let edgeIndex = 0; edgeIndex < loop.edges.length; edgeIndex++) {
            let currentEdge = loop.edges[edgeIndex];
            let nextEdge = loop.edges[(edgeIndex + 1) % loop.edges.length];

            let point1 = currentEdge.node1;
            let point2 = nextEdge.node1;
            let point3 = nextEdge.node2;

            // border edge nodes that border on 3 different colors have their control points set to the nodes themselves
            if(Object.keys(currentEdge.node2.borderColors).length > 2 && !currentEdge.node2.borderColors['DUMMY'] && !currentEdge.node2.borderColors['I']) {
                currentEdge.n1c2 = { x: point1.x, y: point1.y };
                currentEdge.n2c1 = currentEdge.n2c2 = nextEdge.n1c1 = nextEdge.n1c2 = { x: point2.x, y: point2.y };
                nextEdge.n2c1 = { x: point3.x, y: point3.y};
            }

            let dist12 = distance(point1, point2);
            let dist23 = distance(point2, point3);

            // generate two control points for the looked at point (p2)
            // see http://walter.bislins.ch/blog/index.asp?page=JavaScript%3A+Bezier%2DSegmente+f%FCr+Spline+berechnen
            let fa = tension * dist12 / (dist12 + dist23);
            let fb = tension * dist23 / (dist12 + dist23);

            let w = point3.x - point1.x;
            let h = point3.y - point1.y;

            if(!currentEdge.n2c1 && !nextEdge.n1c1) {
                currentEdge.n2c1 = nextEdge.n1c1 = {
                    x: point2.x - fa * w,
                    y: point2.y - fa * h
                };
            } else {
                currentEdge.n2c1 = nextEdge.n1c1 = (currentEdge.n2c1 || nextEdge.n1c1);
            }
            if(!currentEdge.n2c2 && !nextEdge.n1c2) {
                currentEdge.n2c2 = nextEdge.n1c2 = {
                    x: point2.x + fb * w,
                    y: point2.y + fb * h
                };
            } else {
                currentEdge.n2c2 = nextEdge.n1c2 = (currentEdge.n2c2 || nextEdge.n1c2);
            }
        }
    }
}
