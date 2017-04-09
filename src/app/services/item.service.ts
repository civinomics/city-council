import {Injectable} from '@angular/core';
import {AngularFireDatabase} from 'angularfire2';
import {Observable} from 'rxjs';
import {Item, ItemActivitySummary, parseItem} from '../models/item';
import {Actions, Effect, toPayload} from '@ngrx/effects';
import {AppState, getFocusedItem, getLoadedItemIds, getMeetings} from '../reducers/index';
import {Store} from '@ngrx/store';
import {ItemLoadedAction, ItemsLoadedAction} from '../reducers/data';
import {SELECT_ITEM, SELECT_MEETING} from '../reducers/focus';


const LOAD_SINGLE_ITEM = '[ItemSvcInternal] loadSingleItem';
const LOAD_ALL_ITEMS = '[ItemSvcInternal] loadAllItems';

@Injectable()
export class ItemService {

  @Effect() doLoadSingleItemsEffect = this.actions.ofType(LOAD_SINGLE_ITEM)
    .map(toPayload)
    .withLatestFrom(this.store.select(getLoadedItemIds))
    .filter(([idToLoad, loadedItemIds]) => loadedItemIds.indexOf(idToLoad) < 0)
    .do(([idToLoad, loadedItemIds]) => console.debug(`ItemSvc: ${idToLoad} does not exist in ${JSON.stringify(loadedItemIds)}, loading.`))
    .flatMap(([idToLoad, loadedItemIds]) => this.load(idToLoad))
    .map(mtg => new ItemLoadedAction(mtg));


  /*NOTE: this
   *
   * */
  @Effect() doLoadAllItemsEffect = this.actions.ofType(LOAD_ALL_ITEMS)
    .map(toPayload)
    .withLatestFrom(this.store.select(getLoadedItemIds), (toLoadIds, loadedIds) =>
      toLoadIds.filter(id => loadedIds.indexOf(id) < 0)
    ).flatMap(idsToLoad => Observable.forkJoin(idsToLoad.map(id => this.load(id).take(1)))) //NOTE: take(1), meaning
    .map((items: Item[]) => new ItemsLoadedAction(items));


  @Effect() loadItemsOnSelectedMeetingAgendaEffect =
    Observable.combineLatest(this.store.select(getMeetings), this.actions.ofType(SELECT_MEETING).map(toPayload).filter(it => !!it))
      .filter(([meetings, selectedMeetingId]) => !!meetings[selectedMeetingId])
      .map(([meetings, selectedMeetingId]) => meetings[selectedMeetingId].agendaIds)
      .map(itemIds => ({type: LOAD_ALL_ITEMS, payload: itemIds}));


  @Effect() loadSelectedItemEffect =
    this.actions.ofType(SELECT_ITEM)
      .map(toPayload)
      .filter(it => !!it)
      .map(id => ({type: LOAD_SINGLE_ITEM, payload: id}));


  constructor(private db: AngularFireDatabase, private actions: Actions, private store: Store<AppState>) {
  }


  private getItemActivity(itemId: String): Observable<ItemActivitySummary> {
    const votes = this.db.list(`/vote/${itemId}`).map(votes => ({
      total: votes.length,
      yes: votes.filter(vote => vote.value == 1).length,
      no: votes.filter(vote => vote.value == -1).length
    })).take(1);

    const comments = this.db.list(`/comment/${itemId}`).map(comments => ({total: comments.length})).take(1);

    return Observable.combineLatest(votes, comments, (votes, comments) => ({votes, comments})).take(1);

  }

  public getSelectedItem() {
    return this.store.select(getFocusedItem);
  }

  private load(id: string): Observable<Item> {
    return Observable.combineLatest(
      this.db.object(`/item/${id}`),
      this.getItemActivity(id).take(1), (item, activity) =>
        parseItem({...item, activity})
    );
  }


}

/*


 let item$: Observable<Item>;
 console.log(`ItemService getting ${itemId}`);
 if (inclActivity) {
 item$ =
 }))
 } else {
 item$ = this.db.object(`/item/${itemId}`).map(it => parseItem(it));
 }

 console.log(this.cache$);
 return this.cache$[itemId] = item$.share();
 */
