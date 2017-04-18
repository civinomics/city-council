import * as fromFocus from './core/focus.reducer';
import * as fromAuth from './user/auth.reducer';
import * as fromMeetings from './meeting/meeting.reducer';
import * as fromGroups from './group/group.reducer';
import * as fromItems from './item/item.reducer';
import * as fromComments from './comment/comment.reducer';
import * as fromVotes from './vote/vote.reducer';

import { Comment, Group, Item, Meeting, SessionUser, User, Vote } from './core/models';
import { ActionReducer, combineReducers } from '@ngrx/store';
import { compose } from '@ngrx/core';
import { environment } from '../environments/environment';
import { createSelector } from 'reselect';
let _ignore: Vote | Group | Item | Comment | Meeting | User | SessionUser; //so IDEA won't remove above import, which is needed for tsc to compile with declarations

export interface AppState {
  auth: fromAuth.State,
  focus: fromFocus.State,
  meetings: fromMeetings.State
  groups: fromGroups.State,
  items: fromItems.State,
  comments: fromComments.State
  votes: fromVotes.State
}

const reducers = {
  auth: fromAuth.reducer,
  focus: fromFocus.reducer,
  meetings: fromMeetings.reducer,
  groups: fromGroups.reducer,
  items: fromItems.reducer,
  comments: fromComments.reducer,
  votes: fromVotes.reducer
};

const developmentReducer: ActionReducer<AppState> = compose(combineReducers)(reducers);
const productionReducer: ActionReducer<AppState> = combineReducers(reducers);

export function rootReducer(state: any, action: any) {
  if (environment.production) {
    return productionReducer(state, action);
  } else {
    return developmentReducer(state, action);
  }
}


export const getAuthState = (state: AppState) => state.auth;
export const getSessionUserId = (state: AppState) => state.auth.id || null;
export const getSessionUser = (state: AppState) => state.auth.data || null;

export const getFocusState = (state: AppState) => state.focus;
export const getFocusedGroupId = (state: AppState) => state.focus.group;
export const getFocusedMeetingId = (state: AppState) => state.focus.meeting;
export const getFocusedItemId = (state: AppState) => state.focus.item;


export const getMeetingsState = (state: AppState) => state.meetings;
export const getLoadedMeetingIds = createSelector(getMeetingsState, fromMeetings.getIds);
export const getMeetings = createSelector(getMeetingsState, fromMeetings.getEntities);

export const getGroupsState = (state: AppState) => state.groups;
export const getGroups = createSelector(getGroupsState, fromGroups.getEntities);
export const getLoadedGroupIds = createSelector(getGroupsState, fromGroups.getIds);

export const getItemsState = (state: AppState) => state.items;
export const getItems = createSelector(getItemsState, fromItems.getEntities);
export const getLoadedItemIds = createSelector(getItemsState, fromItems.getIds);


export const getCommentsState = (state: AppState) => state.comments;
export const getComments = createSelector(getCommentsState, fromComments.getEntities);
export const getLoadedCommentIds = createSelector(getCommentsState, fromComments.getIds);

export const getVotesState = (state: AppState) => state.votes;
export const getVotes = createSelector(getVotesState, fromVotes.getEntities);
export const getLoadedVoteIds = createSelector(getVotesState, fromVotes.getIds);


export const getFocusedGroup = createSelector(getFocusedGroupId, getGroups, (groupId, groups) => {
  console.log('getFocusedGroup firing');
  return !groupId || !groups[groupId] ? null : groups[groupId];
});

export const getFocusedMeeting = createSelector(getFocusedMeetingId, getMeetings, (meetingId, meetings) => {
  console.log('getFocusedMeeting firing');

  return !meetingId || !meetings[meetingId] ? null : meetings[meetingId];
});

export const getFocusedItem = createSelector(getFocusedItemId, getItems, (itemId, items) => {
  return !itemId || !items[itemId] ? null : items[itemId];
});


export const getMeetingsOfSelectedGroup = createSelector(getFocusedGroup, getMeetings, (group, meetings) => {
  if (group == null) {
    return []
  }
  return group.meetingIds.map(id => meetings[id]);
});

export const getItemsOnSelectedMeetingAgenda = createSelector(getFocusedMeeting, getItems, (meeting, items) => {
  if (meeting == null) {
    return []
  }
  return meeting.agenda.map(id => items[id]);
});

export const getVotesForSelectedItem = createSelector(getFocusedItemId, getVotes, (itemId, votes) => {
  return votes[itemId] || []
});

export const getUserVoteForSelectedItem = createSelector(getSessionUser, getFocusedItemId, getVotes, (user, itemId, votes) => {
  if (!user || !itemId || !user.votes[itemId] || !votes[itemId]) {
    return null;
  }

  return votes[itemId][user.votes[itemId]];

});

export const getCommentsForSelectedItem = createSelector(getFocusedItemId, getComments, (itemId, comments) => {
  return comments[itemId] || []
});

export const getUserCommentForSelectedItem = createSelector(getSessionUser, getFocusedItemId, getComments, (user, itemId, comments) => {
  if (!user || !itemId || !user.comments[itemId] || !comments[itemId]) {
    return null;
  }

  return comments[itemId][user.comments[itemId]];

});
