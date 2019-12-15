import {Logger} from './Logger';
import Delaunator from 'delaunator';
import {Point2D, circumcenter, distance} from './Utils';
import {System} from './Entities';

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
    length: number
}

export interface BorderEdgeLoop {
    edges: BorderEdge[];
    minEdgeIdx: number
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

    /**
     * Runs the algorithm for the provided array of points.
     *
     * @param vertices The delaunay vertices (systems and noise points) to calculate the diagram for
     * @param cellMode The cell mode to use ('CIRCUMCENTERS' or 'CENTROIDS'), default is 'CIRCUMCENTERS'
     * @param borderSeparation The desired distance between border lines, in global space units, default is 0.5
     */
    public static calculate(vertices: DelaunayVertex[], cellMode: CellMode = 'CIRCUMCENTERS', borderSeparation: number = 0.5) {
        const voronoiNodes: VoronoiNode[] = [];
        const borderNodeIndices: Map<Color,number[]> = new Map();
        const borderEdges: Map<Color,BorderEdge[]> = new Map();

        // Step 1a: Put the systems / dummy points into the format that Delaunator needs
        const delaunatorPoints: number[][] = [];
        for(let vertex of vertices) {
            vertex.adjacentTriIndices = [];
            delaunatorPoints.push([vertex.x, vertex.y]);
        }
        // Step 1b: Run Delaunator with those points.
        const delaunay = Delaunator.from(delaunatorPoints);

        // Step 2: We've now got delaunay triangles, formatted as a flat array with
        // vertex indices in groups of threes.
        // Iterate over all triangles and generate voronoi nodes (center of each triangle).
        // While doing so, keep track of all incident triangles for each object
        for(let vertexIdx = 0; vertexIdx < delaunay.triangles.length; vertexIdx += 3) {
            let voronoiNode = {
                x: Infinity, // initialize with infinity, will be corrected later
                y: Infinity, // initialize with infinity, will be corrected later
                vertex1Idx: delaunay.triangles[vertexIdx],
                vertex2Idx: delaunay.triangles[vertexIdx+1],
                vertex3Idx: delaunay.triangles[vertexIdx+2],
                neighborNodeIndices: [],
                borderColors: {}
            }

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

        // Step 3: Iterate over voronoi nodes and:
        //   a) connect neighboring nodes
        //   b) mark node as border node and create a border edge if the node is adjacent to different-colored vertices
        //
        // When reading this algorithm, keep in mind that there are exactly as many voronoi nodes as
        // there are delaunay triangles, which means that the voronoi node with index i corresponds
        // to the triangle with index i*3.
        for(let nodeIdx = 0, triIdx = 0; nodeIdx < voronoiNodes.length; nodeIdx++, triIdx += 3) {
            let voronoiNode = voronoiNodes[nodeIdx];
            // Find all (<= 3) adjacent triangles for the current node
            // We do not need to consider all triangles as potential neighbors here.
            // Since we've remembered each vertex's adjacent triangles in the first
            // pass, we'll just look at those triangles and look for edges they share
            // with the current triangle.
            // The way to find a shared edge is looking at each triangle adjacent
            // to the current triangle's vertex A and checking if it is also adjacent
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
                // in order to add edges to the list only once, skip all neighbors that have already been searched themselves
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

        const borderLoops = VoronoiBorder.generateBorderLoops(borderEdges);
    }

    /**
     * Sorts the border edge arrays and creates border edge loops such that each
     * edge in a loop is either followed by its next clockwise neighbor, or -
     * if no such neighbor can be found - by another edge loop's random starting
     * edge. It should be possible to iterate over the edges via
     * edge1.node2 = edge2.node1, edge2.node2 = edge3.node1 etc.
     *
     * @param borderEdges The border edges map
     * @returns The map, by color, of all border loops
     */
    private static generateBorderLoops(borderEdges: Map<Color,BorderEdge[]>) {
        const borderLoops: Map<Color,BorderEdgeLoop[]> = new Map();

        for(let [color,edges] of borderEdges) {
            while(edges.length > 0) {
                
            }
        }

        return borderLoops;
    }

    /**
     * Reverses a given border edge loop in-place.
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
     * Swaps the given edges nodes, in-place.
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
}
