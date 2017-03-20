import { Entity } from './index';
import { User } from './user';

export interface Office extends Entity {
  name: string;
  heldBy: User;
}
