import * as fromFocus from './focus';
import * as fromData from './data';

import { ActionReducer, combineReducers } from '@ngrx/store';
import { compose } from '@ngrx/core';
import { environment } from '../../environments/environment';
import { createSelector } from 'reselect';

export interface AppState {
  focus: fromFocus.State,
  data: fromData.State
}

const reducers = {
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

export const getFocusState = (state: AppState) => state.focus;
export const getFocusedPlaceId = (state: AppState) => state.focus.place;
export const getFocusedMeetingId = (state: AppState) => state.focus.meeting;
export const getFocusedItemId = (state: AppState) => state.focus.item;

export const getDataState = (state: AppState) => state.data;

export const getEntities = createSelector(getDataState, fromData.getEntities);
export const getPlaces = createSelector(getDataState, fromData.getPlaceEntities);
export const getMeetings = createSelector(getDataState, fromData.getMeetingEntities);

export const getFocusedPlace = createSelector(getFocusedPlaceId, getEntities, (placeId, entities) => {
  return fromData.denormalizePlace(placeId, entities);
});

export const getFocusedMeeting = createSelector(getFocusedMeetingId, getEntities, (meetingId, entities) => {
  return fromData.denormalizeMeeting(meetingId, entities);
});

