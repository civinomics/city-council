import {Action} from '@ngrx/store';
import {ROUTER_NAVIGATION, RouterNavigationPayload} from '../routing';
export type State = {
  group: string | null;
  meeting: string | null;
  item: string | null;
}

const initialState: State = {item: null, meeting: null, group: null};

const placePat = /\/?group\/([\w\d\-]*)/;
const itemPat = /\/?item\/(\S+)/;
const meetingPat = /\/?meeting\/([\w\d\-]*)/;

export function reducer(state: State = initialState, action: Action): State {

  switch (action.type) {
    case ROUTER_NAVIGATION:
      let url = (action.payload as RouterNavigationPayload).routerState.url;

      let groupMatches = placePat.exec(url);
      let meetingMatches = meetingPat.exec(url);
      let itemMatches = itemPat.exec(url);

      return {
        group: groupMatches == null ? null : groupMatches[1],
        meeting: meetingMatches == null ? null : meetingMatches[ 1 ],
        item: itemMatches == null ? null : itemMatches[ 1 ],
      };
    default:
      return state;
  }

}

export const getFocusedGroup = (state: State) => state.group;
export const getFocusedMeeting = (state: State) => state.meeting;
export const getFocusedItem = (state: State) => state.item;
