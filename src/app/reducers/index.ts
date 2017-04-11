import * as fromFocus from './focus';
import * as fromData from './data';
import * as fromAuth from './auth';

import {ActionReducer, combineReducers} from '@ngrx/store';
import {compose} from '@ngrx/core';
import {environment} from '../../environments/environment';
import {createSelector} from 'reselect';

export interface AppState {
  auth: fromAuth.State,
  focus: fromFocus.State,
  data: fromData.State
}

const reducers = {
  auth: fromAuth.reducer,
  focus: fromFocus.reducer,
  data: fromData.reducer
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

export const getDataState = (state: AppState) => state.data;

export const getGroupData = createSelector(getDataState, (state) => {
  return {
    ids: state.ids.groups,
    entities: state.entities.groups
  }
});


export const getMeetingData = createSelector(getDataState, (state) => {
  return {
    ids: state.ids.meetings,
    entities: state.entities.meetings
  }
});

export const getItemData = createSelector(getDataState, (state) => {
  return {
    ids: state.ids.items,
    entities: state.entities.items
  }
});



export const getAuthState = (state: AppState) => state.auth;
export const getSessionUserId = (state: AppState) => state.auth.id || null;
export const getSessionUser = (state: AppState) => state.auth.data || null;

export const getFocusState = (state: AppState) => state.focus;
export const getFocusedGroupId = (state: AppState) => state.focus.group;
export const getFocusedMeetingId = (state: AppState) => state.focus.meeting;
export const getFocusedItemId = (state: AppState) => state.focus.item;


export const getEntities = createSelector(getDataState, fromData.getEntities);
export const getItems = createSelector(getDataState, fromData.getItemEntities);
export const getMeetings = createSelector(getDataState, fromData.getMeetingEntities);
export const getGroups = createSelector(getDataState, fromData.getGroupEntities);
export const getVotes = createSelector(getDataState, fromData.getVoteEntities);
export const getComments = createSelector(getDataState, fromData.getCommentEntities);

export const getLoadedItemIds = createSelector(getDataState, fromData.getItemIds);
export const getLoadedGroupIds = createSelector(getDataState, fromData.getGroupIds);
export const getLoadedMeetingIds = createSelector(getDataState, fromData.getMeetingIds);
export const getLoadedVoteIds = createSelector(getDataState, fromData.getVoteIds);
export const getLoadedCommentIds = createSelector(getDataState, fromData.getCommentIds);



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
  return meeting.agendaIds.map(id => items[id]);
});

export const getVotesForSelectedItem = createSelector(getFocusedItemId, getVotes, (itemId, votes) => {
  return votes[itemId] || []
});

export const getUserVoteForSelectedItem = createSelector(getSessionUser, getFocusedItemId, getVotes, (user, itemId, votes) => {
  if (!user || !itemId || !user.votes[itemId]) {
    return null;
  }

  return votes[itemId][user.votes[itemId]];

});

export const getCommentsForSelectedItem = createSelector(getFocusedItemId, getComments, (itemId, comments) => {
  return comments[itemId] || []
});

export const getUserCommentForSelectedItem = createSelector(getSessionUser, getFocusedItemId, getComments, (user, itemId, comments) => {
  if (!user || !itemId || !user.comments[itemId]) {
    return null;
  }

  return comments[itemId][user.comments[itemId]];

});
