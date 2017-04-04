import {Injectable} from '@angular/core';
import {AngularFireDatabase} from 'angularfire2';
import {Observable} from 'rxjs';
import {Item, ItemActivityAdt, parseItem} from '../models/item';

@Injectable()
export class ItemService {

  private cache$: { [id: string]: Observable<Item> } = {};

  constructor(private db: AngularFireDatabase) {
  }


  private getItemActivity(itemId: String): Observable<ItemActivityAdt> {
    const votes = this.db.list(`/vote/${itemId}`).map(votes => ({
      total: votes.length,
      yes: votes.filter(vote => vote.value == 1).length,
      no: votes.filter(vote => vote.value == -1).length
    })).take(1);

    const comments = this.db.list(`/comment/${itemId}`).map(comments => ({total: comments.length})).take(1);

    return Observable.combineLatest(votes, comments, (votes, comments) => ({votes, comments})).take(1);

  }

  public get(itemId: string, inclActivity: boolean = false) {
    if (!!this.cache$[itemId]) {
      return this.cache$[itemId];
    }

    let item$: Observable<Item>;
    console.log(`ItemService getting ${itemId}`);
    if (inclActivity) {
      item$ = Observable.combineLatest(this.db.object(`/item/${itemId}`), this.getItemActivity(itemId).take(1), (item, activity) => parseItem({
        ...item,
        activity
      }))
    } else {
      item$ = this.db.object(`/item/${itemId}`).map(it => parseItem(it));
    }

    console.log(this.cache$);
    return this.cache$[itemId] = item$.share();

  }


}
