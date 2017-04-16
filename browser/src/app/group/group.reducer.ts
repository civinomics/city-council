import { Action } from '@ngrx/store';
import { Group, groupsEqual, mergeGroups } from './group';

export const GROUP_LOADED = '[Data] groupLoaded';

export class GroupLoadedAction implements Action {
    public readonly type = GROUP_LOADED;

    constructor(public readonly payload: Group) {
    }
}


export type State = {
    ids: string[],
    entities: { [id: string]: Group }
}


const initialState = { ids: [], entities: {} };

export function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {
        case GROUP_LOADED:
            let newIds, newEntities;
            //if we already have a meeting with this ID in the cache:
            if (state.ids.indexOf(action.payload.id) >= 0) {
                //and there's nothing new about the data
                if (groupsEqual(state.entities[ action.payload.id ], action.payload)) {
                    //return the same object if nothing has changed to prevent unnecessary rerenders
                    return state;
                }
                //or if there is something new in the data, merge it into the cached object
                newIds = state.ids;
                newEntities = {
                    ...state.entities,
                    [action.payload.id]: mergeGroups(state.entities[ action.payload.id ], action.payload)
                }
            } else {
                newIds = [ ...state.ids, action.payload.id ];
                newEntities = { ...state.entities, [action.payload.id]: action.payload };
            }

            return {
                ids: newIds,
                entities: newEntities
            };

        default:
            return state;
    }
}


export const getIds = (state: State) => state.ids;
export const getEntities = (state: State) => state.entities;
