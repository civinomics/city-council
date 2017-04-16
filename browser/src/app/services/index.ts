import { AuthService } from './auth.service';
import { ItemService } from './item.service';
import { VoteService } from './vote.service';
import { CommentService } from './comment.service';
import { AppFocusService } from './app-focus.service';

export const APP_PROVIDERS = [
  AuthService, ItemService, VoteService, CommentService, AppFocusService
];
