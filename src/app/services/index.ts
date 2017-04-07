import {AuthService} from './auth.service';
import {GroupService} from './group.service';
import {MeetingService} from './meeting.service';
import {ItemService} from './item.service';
import {VoteService} from './vote.service';
import {CommentService} from './comment.service';

export const APP_PROVIDERS = [
  AuthService, GroupService, MeetingService, ItemService, VoteService, CommentService
];
