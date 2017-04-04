import {schema} from 'normalizr';
import {keys, values} from 'lodash';
import {Place} from '../models/place';
import {Meeting} from '../models/meeting';
import {Item} from '../models/item';
import {Action} from '@ngrx/store';
import {Group} from '../models/group';

type StateEntities = {
  places: { [id: string]: Place },
  meetings: { [id: string]: Meeting },
  groups: { [id: string]: Group },
  items: { [id: string]: Item }
};

export type State = {
  ids: {
    places: string[],
    groups: string[],
    meetings: string[],
    items: string[]
  },
  entities: StateEntities
}

export const USER_LOADED = '[Data] meetingLoaded';
export const MEETING_LOADED = '[Data] meetingLoaded';
export const PLACE_LOADED = '[Data] placeLoaded';
export const ITEM_LOADED = '[Data] itemLoaded';
export const GROUP_LOADED = '[Data] groupLoaded';

export class MeetingLoadedAction implements Action {
  public readonly type = MEETING_LOADED;

  constructor(public readonly payload: Meeting) {}
}

export class PlaceLoadedAction implements Action {
  public readonly type = PLACE_LOADED;

  constructor(public readonly payload: Place) {}
}

export class ItemLoadedAction implements Action {
  public readonly type = ITEM_LOADED;

  constructor(public readonly payload: Item) {}
}


export class GroupLoadedAction implements Action {
  public readonly type = GROUP_LOADED;

  constructor(public readonly payload: Group) {
  }
}


const itemSchema = new schema.Entity('items', {});
const meetingSchema = new schema.Entity('meetings', { items: [ itemSchema ] });
const groupSchema = new schema.Entity('groups', { meetings: [ meetingSchema ] });
const placeSchema = new schema.Entity('places', { groups: [ groupSchema ] });



type NormalizeOutput = {
  result: string,
  entities: {
    meetings: { [id: string]: Meeting },
    items: { [id: string]: Item },
    places: { [id: string]: Place },
    groups: { [id: string]: Group }
  },
};

const initialState = {
  ids: {
    places: [],
    meetings: [],
    items: [],
    groups: [],
  },
  entities: {
    places: {},
    meetings: {},
    items: {},
    groups: {}
  }
};


export function reducer(state: State = initialState, action: Action): State {

  switch (action.type) {
    case MEETING_LOADED:

      let newMtgIds = state.ids.meetings.indexOf(action.payload.id) >= 0 ? state.ids.meetings : [...state.ids.meetings, action.payload.id];
      let newMtgEnts = {...state.entities.meetings, [action.payload.id]: action.payload};

      return {
        ids: {
          ...state.ids,
          meetings: newMtgIds
        },
        entities: {
          ...state.entities,
          meetings: newMtgEnts
        }
      };
    case GROUP_LOADED:

      let newGrpIds = state.ids.groups.indexOf(action.payload.id) >= 0 ? state.ids.groups : [...state.ids.groups, action.payload.id];
      let newGrpEnts = {...state.entities.groups, [action.payload.id]: action.payload};

      return {
        ids: {
          ...state.ids,
          groups: newGrpIds
        },
        entities: {
          ...state.entities,
          groups: newGrpEnts
        }
      };

    case ITEM_LOADED:

      let newItemId = state.ids.items.indexOf(action.payload.id) >= 0 ? state.ids.items : [...state.ids.items, action.payload.id];
      let newItemEnts = {...state.entities.items, [action.payload.id]: action.payload};

      return {
        ids: {
          ...state.ids,
          items: newItemId
        },
        entities: {
          ...state.entities,
          items: newItemEnts
        }
      };



    /*

     case ITEMS_LOADED:
     normalized = normalize(action.payload, itemSchema);
     return merge(normalized, state);
     */

    default:
      return state;
  }
}

function merge(normOutput: NormalizeOutput, state: State): State {

  let newPlaceIds = keys(normOutput.entities.places).filter(id => state.ids.places.indexOf(id) < 0);
  let newMeetingIds = keys(normOutput.entities.meetings).filter(id => state.ids.meetings.indexOf(id) < 0);
  let newItemIds = keys(normOutput.entities.items).filter(id => state.ids.items.indexOf(id) < 0);
  let newGroupIds = keys(normOutput.entities.groups).filter(id => state.ids.groups.indexOf(id) < 0);

  return {
    ids: {
      places: [ ...state.ids.places, ...newPlaceIds ],
      groups: [ ...state.ids.groups, ...newGroupIds ],
      meetings: [ ...state.ids.meetings, ...newMeetingIds ],
      items: [ ...state.ids.items, ...newItemIds ],
    },
    entities: {
      places: { ...state.entities.places, ...normOutput.entities.places },
      groups: { ...state.entities.groups, ...normOutput.entities.groups },
      meetings: { ...state.entities.meetings, ...normOutput.entities.meetings },
      items: { ...state.entities.items, ...normOutput.entities.items },
    }
  };

}

export const getEntities = (state: State) => state.entities;
export const getPlaceEntities = (state: State) => state.entities.places;
export const getMeetingEntities = (state: State) => state.entities.meetings;
export const getItemEntities = (state: State) => state.entities.items;
export const getGroupEntities = (state: State) => state.entities.groups;

