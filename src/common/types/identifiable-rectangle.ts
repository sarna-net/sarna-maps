import { Rectangle2d } from '../math-2d';

export interface IdentifiableRectangle extends Rectangle2d {
  id: string;
  label?: string;
}
