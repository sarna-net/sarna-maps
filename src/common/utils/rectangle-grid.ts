import { areaOfRectangleIntersection, Coordinates2d, Rectangle2d } from '../math-2d';
import { clampNumber } from './clamp-number';
import { IdentifiableRectangle } from '../types';

const DEFAULT_GRID_CELL_SIZE = 10;

interface RectangleGridCell {
  bbox: Rectangle2d;
  occupants: Array<IdentifiableRectangle>;
}

/**
 * An instance of this class represents a grid filled with rectangular items.
 * It can be used as a persistent look-up table for potential overlaps.
 */
export class RectangleGrid {
  viewRect: Rectangle2d;
  gridCellSize = DEFAULT_GRID_CELL_SIZE;
  grid: Array<Array<RectangleGridCell>>;
  allOccupants: Array<IdentifiableRectangle>;

  private left = 0;
  private right = 0;
  private top = 0;
  private bottom = 0;

  constructor(viewRect: Rectangle2d, gridCellSize = DEFAULT_GRID_CELL_SIZE) {
    this.viewRect = viewRect || {
      anchor: {x: 0, y: 0},
      dimensions: {width: 0, height: 0},
    };
    this.gridCellSize = gridCellSize;
    this.grid = [];
    this.allOccupants = [];

    this.left = this.viewRect.anchor.x;
    this.right = this.left + this.viewRect.dimensions.width;
    this.bottom = this.viewRect.anchor.y;
    this.top = this.bottom + this.viewRect.dimensions.height;
    this.constructGrid();
  }

  /**
   * Builds the actual grid structure
   */
  private constructGrid() {
    this.grid = [];
    for (let x = this.left; x < this.right; x += this.gridCellSize) {
      const gridColumn: Array<RectangleGridCell> = [];
      for (let y = this.bottom; y < this.top; y += this.gridCellSize) {
        // a single grid cell
        gridColumn.push({
          bbox: {
            anchor: {x, y},
            dimensions: {width: this.gridCellSize, height: this.gridCellSize},
          },
          occupants: []
        });
      }
      this.grid.push(gridColumn);
    }
  };

  /**
   * Finds the coordinates of all grid cells that a given rectangle overlaps.
   *
   * @param rect The rectangle to query
   */
  private gridCoordinatesForRect(rect: Rectangle2d) {
    const coordinates: Array<Coordinates2d> = [];

    if (this.grid.length === 0 || areaOfRectangleIntersection(rect, this.viewRect) === 0) {
      return coordinates;
    }

    const lastColumnIndex = this.grid.length - 1;
    const lastRowIndex = this.grid[0].length - 1;

    // top left grid coordinates
    const startX = clampNumber(Math.floor((rect.anchor.x - this.viewRect.anchor.x) / this.gridCellSize), 0, lastColumnIndex);
    const startY = clampNumber(Math.floor((rect.anchor.y + rect.dimensions.height - this.viewRect.anchor.y) / this.gridCellSize), 0, lastRowIndex);
    // bottom right grid coordinates
    const endX = clampNumber(Math.floor((rect.anchor.x + rect.dimensions.width - this.viewRect.anchor.x) / this.gridCellSize), 0, lastColumnIndex);
    const endY = clampNumber(Math.floor((rect.anchor.y - this.viewRect.anchor.y) / this.gridCellSize), 0, lastRowIndex);

    let x = startX;
    let y = startY;
    while (y >= endY) {
      coordinates.push({x, y});
      x++;
      if (x > endX) {
        x = startX;
        y--;
      }
    }
    return coordinates;
  };

  /**
   * Places an item in the grid.
   *
   * @param item The item to place
   */
  placeItem(item: IdentifiableRectangle) {
    this.gridCoordinatesForRect(item).forEach((coordinates) => {
      const cell = this.grid[coordinates.x][coordinates.y];
      // check if item is already in cell
      if (!cell.occupants.find((occupant) => occupant.id === item.id)) {
        cell.occupants.push(item);
        this.allOccupants.push(item);
      }
    }, this);
  }

  /**
   * Removes an item from the grid.
   *
   * @param item The item to remove
   */
  unplaceItem(item: IdentifiableRectangle) {
    this.gridCoordinatesForRect(item).forEach((coordinates) => {
      const cell = this.grid[coordinates.x][coordinates.y];
      const objIndex = cell.occupants.findIndex((occupant) => occupant.id === item.id);
      if (objIndex >= 0) {
        cell.occupants.splice(objIndex, 1);
      }
    }, this);
    const allOccupantsArrayIndex = this.allOccupants.findIndex((occupant) => occupant.id === item.id);
    if (allOccupantsArrayIndex >= 0) {
      this.allOccupants.splice(allOccupantsArrayIndex, 1);
    }

  }

  /**
   * Gets all overlapped other items in the grid for a given item
   *
   * @param item The item to check
   * @param idPrefixToIgnore A prefix of item ids that should be ignored
   */
  getOverlaps(item: IdentifiableRectangle, idPrefixToIgnore = '') {
    const overlappedObjects: Array<IdentifiableRectangle> = [];
    // a map for quick lookups (performance optimization)
    const checkedIds: Record<string, boolean> = {};

    this.gridCoordinatesForRect(item).forEach((coordinates) => {
      const occupants = this.grid[coordinates.x][coordinates.y].occupants;
      occupants.forEach((occupant) => {
        if (
          occupant.id !== item.id &&
          !(idPrefixToIgnore && occupant.id.startsWith(idPrefixToIgnore)) &&
          areaOfRectangleIntersection(item, occupant) > 0 &&
          !overlappedObjects.includes(occupant)
        ) {
          overlappedObjects.push(occupant);
        }
        checkedIds[occupant.id] = true;
      }, this);
    }, this);
    return overlappedObjects;
  };

  /**
   * Tests a rectangular area for overlaps.
   *
   * @param item The item to check
   * @param idPrefixToIgnore A prefix of item ids that should be ignored
   * @returns true if the item overlaps any other items in the grid
   */
  testRect(item: IdentifiableRectangle, idPrefixToIgnore = '') {
    return this.getOverlaps(item, idPrefixToIgnore).length > 0;
  };

  /**
   * Gets the number of overlapped other items in the grid for a given item
   *
   * @param item The item to check
   * @param idPrefixToIgnore A prefix of item ids that should be ignored
   */
  getNumberOfOverlaps(item: IdentifiableRectangle, idPrefixToIgnore = '') {
    return this.getOverlaps(item, idPrefixToIgnore).length;
  };

  /**
   * Counts all unique rectangle overlaps in the entire grid.
   */
  countOverlaps(idPrefixToIgnore = '') {
    const overlappingIdsMap: Record<string, boolean> = {};

    this.allOccupants.forEach((item) => {
      const overlaps = this.getOverlaps(item, idPrefixToIgnore);
      overlaps.forEach((otherItem) => {
        const combinedIds = [item.id, otherItem.id].sort().join('___');
        overlappingIdsMap[combinedIds] = true;
      }, this);
    }, this);

    return Object.keys(overlappingIdsMap).length;
  }
}
