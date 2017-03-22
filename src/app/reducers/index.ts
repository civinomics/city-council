import * as fromFocus from './focus';
import * as fromData from './data';
import * as fromAuth from './auth';

import { ActionReducer, combineReducers } from '@ngrx/store';
import { compose } from '@ngrx/core';
import { environment } from '../../environments/environment';
import { createSelector } from 'reselect';

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

export const getAuthState = (state: AppState) => state.auth;
export const getSessionUserId = (state: AppState) => state.auth.id || null;
export const getSessionUser = (state: AppState) => state.auth.data || null;

export const getFocusState = (state: AppState) => state.focus;
export const getFocusedPlaceId = (state: AppState) => state.focus.place;
export const getFocusedMeetingId = (state: AppState) => state.focus.meeting;
export const getFocusedItemId = (state: AppState) => state.focus.item;

export const getDataState = (state: AppState) => state.data;

export const getEntities = createSelector(getDataState, fromData.getEntities);
export const getPlaces = createSelector(getDataState, fromData.getPlaceEntities);
export const getMeetings = createSelector(getDataState, fromData.getMeetingEntities);

export const getFocusedPlace = createSelector(getFocusedPlaceId, getEntities, (placeId, entities) => {
  return !placeId ? null : fromData.denormalizePlace(placeId, entities);
});

export const getFocusedMeeting = createSelector(getFocusedMeetingId, getEntities, (meetingId, entities) => {
  return !meetingId ? null : fromData.denormalizeMeeting(meetingId, entities);
});

export const getFocusedItem = createSelector(getFocusedItemId, getEntities, (itemId, entities) => {
  return !itemId ? null : entities.items[ itemId ];
});
