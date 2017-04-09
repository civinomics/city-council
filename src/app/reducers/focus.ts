import {Action} from '@ngrx/store';

export type State = {
  group: string | null;
  meeting: string | null;
  item: string | null;
}

const initialState: State = {item: null, meeting: null, group: null};

const placePat = /\/?group\/([\w\d\-]*)/;
const itemPat = /\/?item\/(\S+)/;
const meetingPat = /\/?meeting\/([\w\d\-]*)/;

export const SELECT_GROUP = '[Focus] selectGroup';
export const SELECT_MEETING = '[Focus] selectMeeting';
export const SELECT_ITEM = '[Focus] selectItem';



export function reducer(state: State = initialState, action: Action): State {

  switch (action.type) {
    case SELECT_GROUP:
      return {
        ...state,
        group: action.payload
      };
    case SELECT_MEETING:
      return {
        ...state,
        meeting: action.payload
      };

    case SELECT_ITEM:
      return {
        ...state,
        item: action.payload
      }
    default:
      return state;
  }

}

export const getFocusedGroup = (state: State) => state.group;
export const getFocusedMeeting = (state: State) => state.meeting;
export const getFocusedItem = (state: State) => state.item;
