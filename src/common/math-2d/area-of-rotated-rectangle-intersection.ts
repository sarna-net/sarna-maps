import { Point2d, Rectangle2d } from './types';
import { deepCopy } from '../utils';
import { pointIsLeftOfLine } from './point-is-left-of-line';

enum SIDE {
  NONE = 0,
  LEFT = 1,
  TOP = 2,
  RIGHT = 3,
  BOTTOM = 4,
}

enum CODE {
  INSIDE = 0,
  LEFT = 1,
  RIGHT = 2,
  BOTTOM = 4,
  TOP = 8,
}

interface IntermediatePoint2d extends Point2d {
  _intermediate?: boolean;
}

/**
 * Calculate the overlapping polygon (intersection) of a x / y axis aligned rectangle with
 * another, rotated rectangle.
 *
 * @param rect A rectangle, defined by its bottom left corner (x,y) and its width and height (w,h)
 * @param rotatedRect A rotated rectangle, defined by its corners ("bl" = "bottom left" etc.)
 * @returns The overlapping polygon
 * @see https://en.wikipedia.org/wiki/Cohen%E2%80%93Sutherland_algorithm
 */
export function areaOfRotatedRectangleIntersection(
  rect: Rectangle2d,
  rotatedRect: { bl: Point2d; tl: Point2d; tr: Point2d; br: Point2d; },
): { l: Array<{ p0: Point2d, p1: Point2d }>, p: Array<Point2d> } {
  let curPt: IntermediatePoint2d;
  let nextPt: Point2d;
  let curSide: SIDE;
  let nextSide: SIDE;
  let iSide = SIDE.NONE;
  let currentlyInside = false;
  let clippedLines = [
    rectLineClip(rect, rotatedRect.tl, rotatedRect.tr),
    rectLineClip(rect, rotatedRect.tr, rotatedRect.br),
    rectLineClip(rect, rotatedRect.br, rotatedRect.bl),
    rectLineClip(rect, rotatedRect.bl, rotatedRect.tl),
  ];
  const nonNullClippedLines = clippedLines.filter((line) => line !== null);
  const corners = {
    bl: { x: rect.anchor.x, y: rect.anchor.y, _intermediate: true }, // bottom left
    tl: { x: rect.anchor.x, y: rect.anchor.y + rect.dimensions.height, _intermediate: true }, // top left
    tr: { x: rect.anchor.x + rect.dimensions.width, y: rect.anchor.y + rect.dimensions.height, _intermediate: true }, // top right
    br: { x: rect.anchor.x + rect.dimensions.width, y: rect.anchor.y, _intermediate: true }, // bottom right
  };
  // private helper function
  const turn = (side: SIDE) => (side % 4) + 1;
  // private helper function
  const pointIsOnSide = (p: Point2d) => {
    if (p.x === rect.anchor.x) {
      return SIDE.LEFT;
    } else if (p.x === rect.anchor.x + rect.dimensions.width) {
      return SIDE.RIGHT;
    } else if (p.y === rect.anchor.y) {
      return SIDE.BOTTOM;
    } else if (p.y === rect.anchor.y + rect.dimensions.height) {
      return SIDE.TOP;
    }
    return SIDE.NONE;
  }

  const polygon = [];
  for (let i = 0; i < clippedLines.length; i++) {
    if (!clippedLines[i]) {
      clippedLines.splice(i,1);
      i--;
    } else {
      // add points to the polygon
      polygon.push(clippedLines[i]!.p0);
      polygon.push(clippedLines[i]!.p1);
    }
  }

  // no intersections
  if (nonNullClippedLines.length === 0) {
    if (
      rotatedRect.tl.x > corners.bl.x &&
      rotatedRect.tl.x < corners.br.x &&
      rotatedRect.tl.y > corners.br.y &&
      rotatedRect.tl.y < corners.tr.y
    ) {
      // one rotated rectangle point is in the rectangle, no intersections
      // --> the entire rotated rectangle lies within the rectangle
      polygon.push(rotatedRect.bl, rotatedRect.tl, rotatedRect.tr, rotatedRect.br);
    } else if (
      pointIsLeftOfLine(corners.bl, rotatedRect.tr, rotatedRect.tl) &&
      pointIsLeftOfLine(corners.bl, rotatedRect.tl, rotatedRect.bl) &&
      pointIsLeftOfLine(corners.bl, rotatedRect.bl, rotatedRect.br) &&
      pointIsLeftOfLine(corners.bl, rotatedRect.br, rotatedRect.tr)
    ) {
      // one rectangle point is in the rotated rectangle, no intersections
      // --> the entire rectangle lies within the rotated rectangle
      polygon.push(corners.bl);
      polygon.push(corners.tl);
      polygon.push(corners.tr);
      polygon.push(corners.br);
    }
  }

  // clean up and complete the polygon
  for (let i = 0; i < polygon.length; i++) {
    curPt = polygon[i];
    nextPt = polygon[(i+1) % polygon.length];
    // remove identical next points
    while (curPt.x === nextPt.x && curPt.y === nextPt.y && polygon.length > 1) {
      if (i+1 < polygon.length) {
        polygon.splice(i+1,1);
      } else {
        polygon.splice(i,1);
        i--;
        curPt = polygon[i];
      }
      nextPt = polygon[(i+1) % polygon.length];
      //console.log('polygon length is '+polygon.length+', nextPt is now ' + ((i+1) % polygon.length), nextPt);
    }
    // check remaining point count
    if (polygon.length < 2) {
      // something's funky
      console.warn('polygon could not be built with one point');
      break;
    }
    // find out if the points lie on any of the rectangle's sides
    curSide = pointIsOnSide(curPt);
    nextSide = pointIsOnSide(nextPt);
    if(!curSide) {
      currentlyInside = true;
    } else if(!curPt._intermediate) {
      currentlyInside = !currentlyInside;
    }
    // if either point lies inside the rectangle, or if we have just entered the rectangle,
    // or if we are currently looking at an in-between point, there are no in-between points to insert
    if (!curSide || !nextSide || currentlyInside || curPt._intermediate) {
      continue;
    }
    // both points lie on the perimeter
    // if the points are on the same perimeter, there is no need for a connecting point
    if (curSide === nextSide) {
      continue;
    }
    // points lie on different sides. insert intermediate points at the corners in clockwise fashion
    iSide = curSide;
    let j = 0;
    do {
      iSide = turn(iSide);
      if(iSide === SIDE.RIGHT) {
        j++;
        polygon.splice(i+j, 0, deepCopy(corners.tr));
      } else if (iSide === SIDE.BOTTOM) {
        j++;
        polygon.splice(i+j, 0, deepCopy(corners.br));
      } else if (iSide === SIDE.LEFT) {
        j++;
        polygon.splice(i+j,0, deepCopy(corners.bl));
      } else if (iSide === SIDE.TOP) {
        j++;
        polygon.splice(i+j, 0, deepCopy(corners.tl));
      }
    } while (iSide !== nextSide && iSide !== curSide);
  }

  if (polygon.length < 2) {
    return {
      l: nonNullClippedLines,
      p: []
    };
  } else {
    return {
      l: nonNullClippedLines,
      p: polygon
    };
  }
}

/**
 * Uses the Cohen Sutherland line clip algorithm to find the clipped line within
 * a rectangle.
 *
 * @param rect The unrotated rectangle
 * @param pFrom Starting point of the line
 * @param pTo End point of the line
 * @returns An array of the two end points of the clipped line segment, or null
 * @see https://en.wikipedia.org/wiki/Cohen%E2%80%93Sutherland_algorithm
 */
function rectLineClip(rect: Rectangle2d, pFrom: Point2d, pTo: Point2d) {
  const xMin = rect.anchor.x;
  const xMax = rect.anchor.x + rect.dimensions.width;
  const yMin = rect.anchor.y;
  const yMax = rect.anchor.y + rect.dimensions.height;
  //console.log('xMin ' + xMin.toFixed(2) + ', xMax ' + xMax.toFixed(2) );
  //console.log('yMin ' + yMin.toFixed(2) + ', yMax ' + yMax.toFixed(2) );
  //console.log('pFrom ' + pFrom.x + ',' + pFrom.y);
  //console.log('pTo ' + pTo.x + ',' + pTo.y);
  const p0 = deepCopy(pFrom);
  const p1 = deepCopy(pTo);
  let x: number;
  let y: number;
  let outcode0: CODE;
  let outcode1: CODE;
  let outcodeOut: CODE;
  let accept: boolean;

  // private helper function
  const computeOutcode = (lx: number, ly: number) => {
    let code = CODE.INSIDE;
    if (lx < xMin) {
      code = code | CODE.LEFT;
    } else if (lx > xMax) {
      code = code | CODE.RIGHT;
    }
    if (ly < yMin) {
      code = code | CODE.BOTTOM;
    } else if (ly > yMax) {
      code = code | CODE.TOP;
    }
    return code;
  };

  outcode0 = computeOutcode(p0.x, p0.y);
  outcode1 = computeOutcode(p1.x, p1.y);
  accept = false;
  while (true) {
    if (!(outcode0 | outcode1)) {
      // bitwise OR is 0: both points inside window; trivially accept and exit loop
      accept = true;
      break;
    } else if (outcode0 & outcode1) {
      // bitwise AND is not 0: both points share an outside zone (LEFT, RIGHT, TOP,
      // or BOTTOM), so both must be outside window; exit loop (accept is false)
      break;
    } else {
      // At least one endpoint is outside the clip rectangle; pick it.
      outcodeOut = outcode0 !== CODE.INSIDE ? outcode0 : outcode1;

      // Now find the intersection point;
      // use formulas:
      //   slope = (y1 - y0) / (x1 - x0)
      //   x = x0 + (1 / slope) * (ym - y0), where ym is ymin or ymax
      //   y = y0 + slope * (xm - x0), where xm is xmin or xmax
      // No need to worry about divide-by-zero because, in each case, the
      // outcode bit being tested guarantees the denominator is non-zero
      if (outcodeOut & CODE.TOP) {           // point is above the clip window
        x = p0.x + (p1.x - p0.x) * (yMax - p0.y) / (p1.y - p0.y);
        y = yMax;
      } else if (outcodeOut & CODE.BOTTOM) { // point is below the clip window
        x = p0.x + (p1.x - p0.x) * (yMin - p0.y) / (p1.y - p0.y);
        y = yMin;
      } else if (outcodeOut & CODE.RIGHT) {  // point is to the right of clip window
        y = p0.y + (p1.y - p0.y) * (xMax - p0.x) / (p1.x - p0.x);
        x = xMax;
      } else if (outcodeOut & CODE.LEFT) {   // point is to the left of clip window
        y = p0.y + (p1.y - p0.y) * (xMin - p0.x) / (p1.x - p0.x);
        x = xMin;
      } else {
        x = Infinity;
        y = Infinity;
      }

      // Now we move outside point to intersection point to clip
      // and get ready for next pass.
      if (x !== Infinity && y !== Infinity) {
        if (outcodeOut == outcode0) {
          p0.x = x as number;
          p0.y = y as number;
          outcode0 = computeOutcode(x, y);
        } else {
          p1.x = x;
          p1.y = y;
          outcode1 = computeOutcode(x, y);
        }
      }
    }
  }
  if (accept) {
    return {
      p0: p0,
      p1: p1
    };
  }
  return null;
}
