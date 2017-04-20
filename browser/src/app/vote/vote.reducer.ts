import { mergeVotes, Vote, votesEqual } from './vote.model';
import { Action } from '@ngrx/store';

export const VOTES_LOADED = '[Data] votesLoaded';

export type State = {
  ids: { [targetId: string]: string[] }
  entities: { [targetId: string]: { [commentId: string]: Vote } },
}


export class VotesLoadedAction implements Action {
  public readonly type = VOTES_LOADED;
  public readonly payload: { votes: Vote[], itemId: string }

  constructor(votes: Vote[], itemId: string) {
    this.payload = { votes, itemId };
  }
}


const initialState = { ids: {}, entities: {} };


export function reducer(state: State = initialState, action: Action): State {

  switch (action.type) {


    case VOTES_LOADED:

      let payloadVotes = action.payload.votes;
      let itemId = action.payload.itemId;

      let currentVoteIds = state.ids[ itemId ] || [];
      let currentVotes = state.entities[ itemId ] || {};

      let newVoteIds = payloadVotes.filter(vote => currentVoteIds.indexOf(vote.id) < 0).map(vote => vote.id);
      let changedVoteIds = payloadVotes.filter(vote =>
        currentVoteIds.indexOf(vote.id) >= 0 && !votesEqual(currentVotes[ vote.id ], vote)
      ).map(vote => vote.id);
      let newOrChangedVoteIds = [ ...newVoteIds, ...changedVoteIds ];
      let unchangedVoteIds = currentVoteIds.filter(id => newOrChangedVoteIds.indexOf(id) < 0);

      let payloadVoteDict = payloadVotes.reduce((result, vote) => ({ ...result, [vote.id]: vote }), {});

      let updatedVoteIds = [ ...newVoteIds, ...changedVoteIds, ...unchangedVoteIds ];

      let updatedVoteEntities = {
        ...newVoteIds.reduce((result, id) => ({ ...result, [id]: payloadVoteDict[ id ] }), {}),
        ...changedVoteIds.reduce((result, id) => ({
          ...result,
          [id]: mergeVotes(currentVotes[ id ], payloadVoteDict[ id ])
        }), {}),
        ...unchangedVoteIds.reduce((result, id) => ({ ...result, [id]: currentVotes[ id ] }), {})
      };

      return {
        ids: {
          ...state.ids,
          [itemId]: updatedVoteIds
        },
        entities: {
          ...state.entities,
          [itemId]: updatedVoteEntities
        }
      };


    default:
      return state;
  }
}
export const getIds = (state: State) => state.ids;
export const getEntities = (state: State) => state.entities;
