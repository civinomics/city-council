import { normalize, schema } from 'normalizr';
import { keys, values } from 'lodash';
import { NormalizedPlace, Place } from '../models/place';
import { DenormalizedMeeting, Meeting, NormalizedMeeting } from '../models/meeting';
import { AgendaItem, Item } from '../models/item';
import { Action } from '@ngrx/store';
import { NormalizedGroup } from '../models/group';

type StateEntities = {
  places: { [id: string]: NormalizedPlace },
  meetings: { [id: string]: NormalizedMeeting },
  groups: { [id: string]: NormalizedGroup },
  items: { [id: string]: AgendaItem }
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

const itemSchema = new schema.Entity('items', {});
const meetingSchema = new schema.Entity('meetings', { items: [ itemSchema ] });
const groupSchema = new schema.Entity('groups', { meetings: [ meetingSchema ] });
const placeSchema = new schema.Entity('places', { groups: [ groupSchema ] });



type NormalizeOutput = {
  result: string,
  entities: {
    meetings: { [id: string]: NormalizedMeeting },
    items: { [id: string]: AgendaItem },
    places: { [id: string]: NormalizedPlace },
    groups: { [id: string]: NormalizedGroup }
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
    case PLACE_LOADED:
      let normalized: NormalizeOutput = normalize(action.payload, placeSchema);
      return merge(normalized, state);

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


export const denormalizePlace = (id: string, entities: StateEntities) => {
  /*
   TRACK: https://github.com/paularmstrong/normalizr/issues/248
   let ret = denormalize({places:id}, placeSchema, entities);
   console.log(ret);
   return ret;*/

  let place: NormalizedPlace = entities.places[ id ];

  return {
    ...place,
    groups: place.groups.map(id => denormalizeGroup(id, entities))
  };

};

export const denormalizeGroup = (id: string, entities: StateEntities) => {
  let group: NormalizedGroup = entities.groups[ id ];
  return {
    ...group,
    meetings: group.meetings.map(id => denormalizeMeeting(id, entities))
  }
};

export function denormalizeMeeting(id: string, entities: StateEntities): DenormalizedMeeting {

  /*
   TRACK: https://github.com/paularmstrong/normalizr/issues/248
   return denormalize({meetings:id}, meetingSchema, entities);*/

  let meeting: NormalizedMeeting = entities.meetings[ id ];

  return {
    ...meeting,
    items: meeting.items.map(id => entities.items[ id ])
  }
}
