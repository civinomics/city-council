/* TODO: break this into separate reducers for each data type */

import { Place } from '../models/place';
import { Meeting } from '../meeting/meeting.model';
import { Item } from '../item/item.model';
import { Action } from '@ngrx/store';
import { Group } from '../group/group.model';
import { mergeVotes, Vote, votesEqual } from '../models/vote';
import { Comment } from '../comment/comment.model';

export type StateEntities = {
  places: { [id: string]: Place },
  meetings: { [id: string]: Meeting },
  groups: { [id: string]: Group },
  items: { [id: string]: Item },
  votes: { [id: string]: { [id: string]: Vote } },
  comments: { [id: string]: { [id: string]: Comment } },
};

export type State = {
  ids: {
    places: string[],
    groups: string[],
    meetings: string[],
    items: string[],
    votes: { [id: string]: string[] }
    comments: { [id: string]: string[] }
  },
  entities: StateEntities
}

export const USER_LOADED = '[Data] meetingLoaded';
export const PLACE_LOADED = '[Data] placeLoaded';
export const VOTES_LOADED = '[Data] votesLoaded';


export class PlaceLoadedAction implements Action {
  public readonly type = PLACE_LOADED;

  constructor(public readonly payload: Place) {
  }
}




export class VotesLoadedAction implements Action {
  public readonly type = VOTES_LOADED;
  public readonly payload: { votes: Vote[], itemId: string }

  constructor(votes: Vote[], itemId: string) {
    this.payload = {votes, itemId};
  }
}



const initialState = {
  ids: {
    places: [],
    meetings: [],
    items: [],
    groups: [],
    votes: {},
    comments: {}
  },
  entities: {
    places: {},
    meetings: {},
    items: {},
    groups: {},
    votes: {},
    comments: {}
  }
};


export function reducer(state: State = initialState, action: Action): State {

  switch (action.type) {


    case VOTES_LOADED:

      let payloadVotes = action.payload.votes;
      let itemId = action.payload.itemId;

      let currentVoteIds = state.ids.votes[itemId] || [];
      let currentVotes = state.entities.votes[itemId] || {};

      let newVoteIds = payloadVotes.filter(vote => currentVoteIds.indexOf(vote.id) < 0).map(vote => vote.id);
      let changedVoteIds = payloadVotes.filter(vote =>
        currentVoteIds.indexOf(vote.id) >= 0 && !votesEqual(currentVotes[vote.id], vote)
      ).map(vote => vote.id);
      let newOrChangedVoteIds = [...newVoteIds, ...changedVoteIds];
      let unchangedVoteIds = currentVoteIds.filter(id => newOrChangedVoteIds.indexOf(id) < 0);

      let payloadVoteDict = payloadVotes.reduce((result, vote) => ({...result, [vote.id]: vote}), {});

      let updatedVoteIds = [...newVoteIds, ...changedVoteIds, ...unchangedVoteIds];

      let updatedVoteEntities = {
        ...newVoteIds.reduce((result, id) => ({...result, [id]: payloadVoteDict[id]}), {}),
        ...changedVoteIds.reduce((result, id) => ({
          ...result,
          [id]: mergeVotes(currentVotes[id], payloadVoteDict[id])
        }), {}),
        ...unchangedVoteIds.reduce((result, id) => ({...result, [id]: currentVotes[id]}), {})
      };

      return {
        ids: {
          ...state.ids,
          votes: {
            ...state.ids.votes,
            [itemId]: updatedVoteIds
          }
        },
        entities: {
          ...state.entities,
          votes: {
            ...state.entities.votes,
            [itemId]: updatedVoteEntities
          }
        }
      };



    default:
      return state;
  }
}

export const getEntities = (state: State) => state.entities;
export const getPlaceEntities = (state: State) => state.entities.places;
export const getVoteIds = (state: State) => state.ids.votes;
export const getVoteEntities = (state: State) => state.entities.votes;
