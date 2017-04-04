import {AuthService} from './auth.service';
import {GroupService} from './group.service';
import {MeetingService} from './meeting.service';
import {ItemService} from './item.service';

export const APP_PROVIDERS = [
  AuthService, GroupService, MeetingService, ItemService
];
