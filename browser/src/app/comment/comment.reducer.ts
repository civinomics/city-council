import { Action } from '@ngrx/store';
import { Comment, commentsEqual, mergeComments } from './comment.model';

export const COMMENTS_LOADED = '[Data] commentsLoaded';

export type State = {
    ids: { [targetId: string]: string[] }
    entities: { [targetId: string]: { [commentId: string]: Comment } },
}

export class CommentsLoadedAction implements Action {
    public readonly type = COMMENTS_LOADED;
    public readonly payload: { comments: Comment[], itemId: string }

    constructor(comments: Comment[], itemId: string) {
        this.payload = { comments, itemId };
    }
}

const initialState = { ids: {}, entities: {} };

export function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {


        case COMMENTS_LOADED:

            let payloadComments = action.payload.comments;
            let itemId = action.payload.itemId;

            let currentCommentIds = state.ids[ itemId ]||[];
            let currentComments = state.entities[ itemId ]||{};

            let newCommentIds = payloadComments.filter(comment => currentCommentIds.indexOf(comment.id) < 0).map(comment => comment.id);

            let changedCommentIds = payloadComments.filter(comment =>
                currentCommentIds.indexOf(comment.id) >= 0&& !commentsEqual(currentComments[ comment.id ], comment)
            ).map(comment => comment.id);

            let newOrChanged = [ ...newCommentIds, ...changedCommentIds ];

            let unchangedCommentIds = currentCommentIds.filter(id => newOrChanged.indexOf(id) < 0);

            let payloadCommentDict = payloadComments.reduce((result, comment) => ({
                ...result,
                [comment.id]: comment
            }), {});

            let updatedIds = [ ...newCommentIds, ...changedCommentIds, ...unchangedCommentIds ];

            let updatedEntities = {
                ...newCommentIds.reduce((result, id) => ({ ...result, [id]: payloadCommentDict[ id ] }), {}),
                ...changedCommentIds.reduce((result, id) => ({
                    ...result,
                    [id]: mergeComments(currentComments[ id ], payloadCommentDict[ id ])
                }), {}),
                ...unchangedCommentIds.reduce((result, id) => ({ ...result, [id]: currentComments[ id ] }), {})
            };

            return {
                ids: {
                    ...state.ids,
                    [itemId]: updatedIds
                },
                entities: {
                    ...state.entities,
                    [itemId]: updatedEntities
                }
            };


        default:
            return state;
    }
}


export const getIds = (state: State) => state.ids;
export const getEntities = (state: State) => state.entities;
