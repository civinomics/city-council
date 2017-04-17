import { VoteService } from './vote.service';
import { CommentService } from '../comment/comment.service';
import { AppFocusService } from './app-focus.service';

export const APP_PROVIDERS = [
  VoteService, CommentService, AppFocusService
];
