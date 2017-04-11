/* TODO: break this into separate reducers for each data type */

import {Place} from '../models/place';
import {Meeting, meetingsEqual, mergeMeetings} from '../models/meeting';
import {Item, itemsEqual, mergeItems} from '../models/item';
import {Action} from '@ngrx/store';
import {Group, groupsEqual, mergeGroups} from '../models/group';
import {mergeVotes, Vote, votesEqual} from '../models/vote';
import {Comment, commentsEqual, mergeComments} from '../models/comment';

type StateEntities = {
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
export const MEETING_LOADED = '[Data] meetingLoaded';
export const PLACE_LOADED = '[Data] placeLoaded';
export const ITEM_LOADED = '[Data] itemLoaded';
export const GROUP_LOADED = '[Data] groupLoaded';
export const ITEMS_LOADED = '[Data] itemsLoaded';
export const VOTES_LOADED = '[Data] votesLoaded';
export const COMMENTS_LOADED = '[Data] commentsLoaded';


export class MeetingLoadedAction implements Action {
  public readonly type = MEETING_LOADED;

  constructor(public readonly payload: Meeting) {
  }
}

export class PlaceLoadedAction implements Action {
  public readonly type = PLACE_LOADED;

  constructor(public readonly payload: Place) {
  }
}

export class ItemLoadedAction implements Action {
  public readonly type = ITEM_LOADED;

  constructor(public readonly payload: Item) {
  }
}


export class ItemsLoadedAction implements Action {
  public readonly type = ITEMS_LOADED;

  constructor(public readonly payload: Item[]) {
  }
}


export class GroupLoadedAction implements Action {
  public readonly type = GROUP_LOADED;

  constructor(public readonly payload: Group) {
  }
}


export class VotesLoadedAction implements Action {
  public readonly type = VOTES_LOADED;
  public readonly payload: { votes: Vote[], itemId: string }

  constructor(votes: Vote[], itemId: string) {
    this.payload = {votes, itemId};
  }
}

export class CommentsLoadedAction implements Action {
  public readonly type = COMMENTS_LOADED;
  public readonly payload: { comments: Comment[], itemId: string }

  constructor(comments: Comment[], itemId: string) {
    this.payload = {comments, itemId};
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
    case MEETING_LOADED:
      let meetingIds, meetings;
      //if we already have a meeting with this ID in the cache:
      if (state.ids.meetings.indexOf(action.payload.id) >= 0) {
        //and there's nothing new about the data
        if (meetingsEqual(state.entities.meetings[action.payload.id], action.payload)) {
          //return the same object if nothing has changed to prevent unnecessary rerenders
          return state;
        }
        //or if there is something new in the data, merge it into the cached object
        meetingIds = state.ids;
        meetings = {
          ...state.entities.meetings,
          [action.payload.id]: mergeMeetings(state.entities.meetings[action.payload.id], action.payload)
        }
      } else {
        meetingIds = [...state.ids.meetings, action.payload.id];
        meetings = {...state.entities.meetings, [action.payload.id]: action.payload};
      }

      return {
        ids: {
          ...state.ids,
          meetings: meetingIds
        },
        entities: {
          ...state.entities,
          meetings: meetings
        }
      };
    case GROUP_LOADED:
      let groupIds, groups;
      if (state.ids.groups.indexOf(action.payload.id) >= 0) {
        //and there's nothing new about the data
        if (groupsEqual(state.entities.groups[action.payload.id], action.payload)) {
          //return the same object if nothing has changed to prevent unnecessary rerenders
          return state;
        }
        //or if there is something new in the data, merge it into the cached object
        groupIds = state.ids;
        groups = {
          ...state.entities.groups,
          [action.payload.id]: mergeGroups(state.entities.groups[action.payload.id], action.payload)
        }
      } else {
        groupIds = [...state.ids.groups, action.payload.id];
        groups = {...state.entities.groups, [action.payload.id]: action.payload};
      }
      return {
        ids: {
          ...state.ids,
          groups: groupIds
        },
        entities: {
          ...state.entities,
          groups: groups
        }
      };

    case ITEM_LOADED:
      let itemIds, items;
      if (state.ids.items.indexOf(action.payload.id) >= 0) {
        //and there's nothing new about the data
        if (itemsEqual(state.entities.items[action.payload.id], action.payload)) {
          //return the same object if nothing has changed to prevent unnecessary rerenders
          return state;
        }
        //or if there is something new in the data, merge it into the cached object
        itemIds = state.ids;
        items = {
          ...state.entities.items,
          [action.payload.id]: mergeItems(state.entities.items[action.payload.id], action.payload)
        }
      } else {
        itemIds = [...state.ids.items, action.payload.id];
        items = {...state.entities.items, [action.payload.id]: action.payload};
      }
      return {
        ids: {
          ...state.ids,
          items: itemIds
        },
        entities: {
          ...state.entities,
          items: items
        }
      };

    case ITEMS_LOADED:
      let newItemIds = [], newItems = {};

      let loadedItems = action.payload as Item[];

      let changed = false;

      loadedItems.forEach(item => {
        if (state.ids.items.indexOf(item.id) >= 0) {
          //and there's nothing new about the data
          if (itemsEqual(state.entities.items[item.id], item)) {
            //return the same object if nothing has changed to prevent unnecessary rerenders
            return;
          }
          //or if there is something new in the data, merge it into the cached object
          changed = true;
          newItems[item.id] = mergeItems(state.entities.items[item.id], item);
        } else {
          changed = true;
          newItemIds.push(item.id);
          newItems[item.id] = item;
        }
      });

      if (!changed) {
        return state;
      }

      return {
        ids: {
          ...state.ids,
          items: [...state.ids.items, ...newItemIds]
        },
        entities: {
          ...state.entities,
          items: {
            ...state.entities.items,
            ...newItems
          }
        }
      };

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

    case COMMENTS_LOADED:

      let payloadComments = action.payload.comments;
      itemId = action.payload.itemId;

      let currentCommentIds = state.ids.comments[itemId] || [];
      let currentComments = state.entities.comments[itemId] || {};

      let newCommentIds = payloadComments.filter(comment => currentCommentIds.indexOf(comment.id) < 0).map(comment => comment.id);
      let changedCommentIds = payloadComments.filter(comment =>
        currentCommentIds.indexOf(comment.id) >= 0 && !commentsEqual(currentComments[comment.id], comment)
      ).map(comment => comment.id);
      let newOrChanged = [...newCommentIds, ...changedCommentIds];
      let unchangedCommentIds = currentCommentIds.filter(id => newOrChanged.indexOf(id) < 0);

      let payloadCommentDict = payloadComments.reduce((result, comment) => ({...result, [comment.id]: comment}), {});

      let updatedIds = [...newCommentIds, ...changedCommentIds, ...unchangedCommentIds];

      let updatedEntities = {
        ...newCommentIds.reduce((result, id) => ({...result, [id]: payloadCommentDict[id]}), {}),
        ...changedCommentIds.reduce((result, id) => ({
          ...result,
          [id]: mergeComments(currentComments[id], payloadCommentDict[id])
        }), {}),
        ...unchangedCommentIds.reduce((result, id) => ({...result, [id]: currentComments[id]}), {})
      };

      return {
        ids: {
          ...state.ids,
          comments: {
            ...state.ids.comments,
            [itemId]: updatedIds
          }
        },
        entities: {
          ...state.entities,
          comments: {
            ...state.entities.comments,
            [itemId]: updatedEntities
          }
        }
      };



    default:
      return state;
  }
}

export const getEntities = (state: State) => state.entities;
export const getPlaceEntities = (state: State) => state.entities.places;
export const getMeetingIds = (state: State) => state.ids.meetings;
export const getMeetingEntities = (state: State) => state.entities.meetings;
export const getItemIds = (state: State) => state.ids.items;
export const getItemEntities = (state: State) => state.entities.items;
export const getGroupEntities = (state: State) => state.entities.groups;
export const getGroupIds = (state: State) => state.ids.groups;
export const getVoteIds = (state: State) => state.ids.votes;
export const getVoteEntities = (state: State) => state.entities.votes;
export const getCommentIds = (state: State) => state.ids.comments;
export const getCommentEntities = (state: State) => state.entities.comments;
