import { Action } from '@ngrx/store';
import { Item, itemsEqual, mergeItems } from './item.model';

export const ITEM_LOADED = '[Item] itemLoaded';
export const ITEMS_LOADED = '[Item] itemsLoaded';

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


export type State = {
    ids: string[],
    entities: { [id: string]: Item }
}

const initialState = { ids: [], entities: {} };


export function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {


        case ITEM_LOADED:
            let newIds, newEntities;
            if (state.ids.indexOf(action.payload.id) >= 0) {
                //and there's nothing new about the data
                if (itemsEqual(state.entities[ action.payload.id ], action.payload)) {
                    //return the same object if nothing has changed to prevent unnecessary rerenders
                    return state;
                }
                //or if there is something new in the data, merge it into the cached object
                newIds = state.ids;
                newEntities = {
                    ...state.entities,
                    [action.payload.id]: mergeItems(state.entities[ action.payload.id ], action.payload)
                }
            } else {
                newIds = [ ...state.ids, action.payload.id ];
                newEntities = { ...state.entities, [action.payload.id]: action.payload };
            }
            return {
                ids: newIds,
                entities: newEntities
            };

        case ITEMS_LOADED:
            let newItemIds = [], newItems = {};

            let loadedItems = action.payload as Item[];

            let changed = false;

            loadedItems.forEach(item => {
                if (state.ids.indexOf(item.id) >= 0) {
                    //and there's nothing new about the data
                    if (itemsEqual(state.entities[ item.id ], item)) {
                        //return the same object if nothing has changed to prevent unnecessary rerenders
                        return;
                    }
                    //or if there is something new in the data, merge it into the cached object
                    changed = true;
                    newItems[ item.id ] = mergeItems(state.entities[ item.id ], item);
                } else {
                    changed = true;
                    newItemIds.push(item.id);
                    newItems[ item.id ] = item;
                }
            });

            if (!changed) {
                return state;
            }

            return {
                ids: [ ...state.ids, ...newItemIds ],
                entities: {
                    ...state.entities,
                    ...newItems
                }
            };


        default:
            return state;
    }
}


export const getIds = (state: State) => state.ids;
export const getEntities = (state: State) => state.entities;
