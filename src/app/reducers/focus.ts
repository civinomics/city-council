import { Action } from '@ngrx/store';
import { ROUTER_NAVIGATION, RouterNavigationPayload } from '../routing';
export type State = {
  place: string | null;
  meeting: string | null;
  item: string | null;
}

const initialState: State = { item: null, meeting: null, place: null };

const placePat = /\/?place\/([\w\d\-]*)/;
const itemPat = /\/?item\/(\S+)/;
const meetingPat = /\/?meeting\/([\w\d\-]*)/;

export function reducer(state: State = initialState, action: Action): State {

  switch (action.type) {
    case ROUTER_NAVIGATION:
      let url = (action.payload as RouterNavigationPayload).routerState.url;

      let placeMatches = placePat.exec(url);
      let meetingMatches = meetingPat.exec(url);
      let itemMatches = itemPat.exec(url);

      return {
        place: placeMatches == null ? null : placeMatches[ 1 ],
        meeting: meetingMatches == null ? null : meetingMatches[ 1 ],
        item: itemMatches == null ? null : itemMatches[ 1 ],
      };
    default:
      return state;
  }

}

export const getFocusedPlace = (state: State) => state.place;
export const getFocusedMeeting = (state: State) => state.meeting;
export const getFocusedItem = (state: State) => state.item;
