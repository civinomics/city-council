import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Group, parseGroup, RawGroup} from '../models/group';
import {AngularFireDatabase} from 'angularfire2';
import {Actions, Effect, toPayload} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {AppState, getFocusedGroup, getLoadedGroupIds, getMeetingsOfSelectedGroup} from '../reducers/index';
import {GroupLoadedAction} from '../reducers/data';
import {SELECT_GROUP} from '../reducers/focus';

const LOAD_GROUP = '[GroupSvcInternal] loadGroup';

@Injectable()
export class GroupService {

  @Effect() doLoadGroupEffect = this.actions.ofType(LOAD_GROUP)
    .map(toPayload)
    .withLatestFrom(this.store.select(getLoadedGroupIds))
    .filter(([idToLoad, loadedGroupIds]) => loadedGroupIds.indexOf(idToLoad) < 0)
    .do(([idToLoad, loadedGroupIds]) => console.debug(`${idToLoad} does not exist in ${JSON.stringify(loadedGroupIds)}, loading.`))
    .flatMap(([idToLoad, loadedIds]) => this.load(idToLoad))
    .map(mtg => new GroupLoadedAction(mtg));

  @Effect() loadSelectedGroupEffect = this.actions.ofType(SELECT_GROUP)
    .map(toPayload)
    .map(id => ({type: LOAD_GROUP, payload: id}));

  constructor(private db: AngularFireDatabase, private actions: Actions, private store: Store<AppState>) {

  }

  private load(groupId: string): Observable<Group> {
    console.log(`GroupService getting ${groupId}`);

    return this.db.object(`/group/${groupId}`)
      .map((it: RawGroup) => parseGroup(it));
  }

  public getSelectedGroup() {
    return this.store.select(getFocusedGroup);
  }

  public getMeetingsOfSelectedGroup() {
    return this.store.select(getMeetingsOfSelectedGroup);
  }

  public get(groupId: string): Observable<Group> {
    console.log(`GroupService getting ${groupId}`);
    return this.db.object(`/group/${groupId}`)
      .map((it: RawGroup) => parseGroup(it));
  }

}