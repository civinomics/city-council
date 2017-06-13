import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Group, GroupCreateInput, Meeting, parseGroup } from '../core/models';
import { AngularFireDatabase } from 'angularfire2/database';
import { Actions, Effect, toPayload } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { AppState, getFocusedGroup, getGroups, getLoadedGroupIds, getMeetingsOfSelectedGroup } from '../state';
import { SELECT_GROUP } from '../core/focus.reducer';
import { GroupLoadedAction } from './group.reducer';
import { Headers, Http, RequestOptions } from '@angular/http';
import { parseUser } from '../user/user.model';
import { GroupEditInput } from './group.model';

let _ignore: Meeting;//so IDEA won't remove above import, which is needed for tsc to compile with declarations

const LOAD_GROUP = '[GroupSvcInternal] loadGroup';
const GROUP_CREATE_ENDPOINT = 'https://us-central1-civ-cc.cloudfunctions.net/createGroup';

@Injectable()
export class GroupService {

  @Effect() doLoadGroupEffect = this.actions.ofType(LOAD_GROUP)
    .map(toPayload)
    .withLatestFrom(this.store.select(getLoadedGroupIds))
    .filter(([ idToLoad, loadedGroupIds ]) => loadedGroupIds.indexOf(idToLoad) < 0)
    .do(([ idToLoad, loadedGroupIds ]) => console.debug(`${idToLoad} does not exist in ${JSON.stringify(loadedGroupIds)}, loading.`))
    .flatMap(([ idToLoad, loadedIds ]) => this.load(idToLoad))
    .map(mtg => new GroupLoadedAction(mtg));

  @Effect() loadSelectedGroupEffect = this.actions.ofType(SELECT_GROUP)
    .map(toPayload)
    .map(id => ({ type: LOAD_GROUP, payload: id }));

  constructor(private db: AngularFireDatabase, private actions: Actions, private store: Store<AppState>, private http: Http) {

  }

  private load(groupId: string): Observable<Group> {
    console.log(`GroupService getting ${groupId}`);

    return this.db.object(`/group/${groupId}`)
      .map((it: Partial<Group>) => parseGroup(it));
  }

  public async saveChanges(group: GroupEditInput): Promise<boolean> {

    console.log(`saving`);
    let id = group.id,
      pass = this.prepareGroup(group);

    await this.db.object(`/group/${id}`).update(pass);
    return true;

  }

  private prepareGroup(group: GroupEditInput | any): any {
    group = { ...group };
    delete group.id;

    let representatives = group.representatives.reduce((result, rep) => ({
      ...result, [rep.id]: {
        firstName: rep.firstName,
        lastName: rep.lastName,
        icon: rep.icon,
        title: rep.title
      }
    }), {});
    let districts = group.districts.reduce((result, dist) => ({
      ...result, [dist.id]: {
        name: dist.name,
        representative: dist.representative
      }
    }), {});
    return {
      ...group,
      representatives,
      districts
    }
  }

  public getActiveGroup() {
    return this.store.select(getFocusedGroup);
  }

  public getMeetingsOfSelectedGroup() {
    return this.store.select(getMeetingsOfSelectedGroup);
  }

  public loadAllGroups() {
    this.db.list(`/group`)
      .map(arr => arr.map(group => parseGroup(group)))
      .subscribe(groups => groups.forEach(group => this.store.dispatch(new GroupLoadedAction(group))));
  }


  public getAllGroups() {
    return this.store.select(getGroups)
      .filter(it => !!it)
      .map(it => Object.keys(it).reduce((result, id) => [ ...result, it[ id ] ], []));
  }

  public get(groupId: string): Observable<Group> {
    console.log(`GroupService getting ${groupId}`);
    return this.db.object(`/group/${groupId}`)
      .map((it: Partial<Group>) => parseGroup(it));
  }

  public getGroupRepresentatives(groupId: string) {
    return this.db.list(`/group/${groupId}/districts`)
      .flatMap(districts =>
        Observable.merge(...districts.map(district =>
          this.db.object(`/user/${district.representative}`)
            .map(userData => ({ districtId: district.$key, user: parseUser(userData) }))
        )).take(1)
          .reduce((result, entry) => ({ ...result, [(entry as any).districtId]: (entry as any).user }), {})
      )
  }

  public createGroup(input: GroupCreateInput): Observable<{ success: true, groupId: string } | { success: false, error: string }> {

    return this.http.post(GROUP_CREATE_ENDPOINT, input, new RequestOptions({
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: input
      }
    ))
      .take(1)
      .map(result => result.json());

  }

}
