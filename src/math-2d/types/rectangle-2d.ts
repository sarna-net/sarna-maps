import Dimensions2d from './dimensions-2d';
import Point2d from './point-2d';

/**
* A rectangle in 2D space, described by an anchor point (usually the
* bottom left or top left point, depending on interpretation) as well as the
* rectangle's width and height values.
*/
interface Rectangle2d {
  anchor: Point2d;
  dimensions: Dimensions2d;
}

export default Rectangle2d;
