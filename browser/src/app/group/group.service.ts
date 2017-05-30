import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Group, Meeting, parseGroup, RawGroup } from '../core/models';
import { AngularFireDatabase } from 'angularfire2/database';
import { Actions, Effect, toPayload } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { AppState, getFocusedGroup, getGroups, getLoadedGroupIds, getMeetingsOfSelectedGroup } from '../state';
import { SELECT_GROUP } from '../core/focus.reducer';
import { GroupLoadedAction } from './group.reducer';
import { GroupCreateInput } from './group.model';
import { Headers, Http, RequestOptions } from '@angular/http';

let _ignore: Meeting;//so IDEA won't remove above import, which is needed for tsc to compile with declarations

const LOAD_GROUP = '[GroupSvcInternal] loadGroup';
const CREATE_REP_ENDPOINT = `https://us-central1-civ-cc.cloudfunctions.net/createRepresentativeAccount`;


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

  constructor(private db: AngularFireDatabase, private actions: Actions, private store: Store<AppState>, private http: Http) {

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
      .map((it: RawGroup) => parseGroup(it));
  }

  public async createGroup(input: GroupCreateInput): Promise<string> {
    let groupPushResult;

    try {
      groupPushResult = await this.db.list(`/group`).push({
        name: input.name,
        icon: input.icon,
        owner: input.adminId,
        editors: [ input.adminId ]
      });
    } catch (err) {
      throw new Error(`Error pushing group: ${JSON.stringify(err)}`);
    }

    const groupId = groupPushResult.key;
    console.debug(`Created group: ${groupId}`);
    if (input.districts.length > 0) {
      console.debug(`Creating ${input.districts.length} districts: `);
      await Promise.all(input.districts.map(district => new Promise((resolve, reject) => {
        this.db.list(`/group/${groupId}/districts`).push({ name: district.name }).then(res => {
          let districtId = res.key;
          const pass = {
              name: `${district.representative.firstName} ${district.representative.lastName}`,
              email: district.representative.email,
              icon: district.representative.icon,
              groupId,
              districtId
            }, headers = new Headers({ 'Content-Type': 'application/json' }),
            options = new RequestOptions({ headers: headers });
          this.http.post(CREATE_REP_ENDPOINT, pass, options).take(1)
            .map(resp => resp.json())
            .do((result) => console.debug(`successfully pushed rep ${result.userId}`))
            .subscribe(resolve, reject);
        }).catch(err => {
          throw new Error(`Error creating districts: ${JSON.stringify(err)}`)
        })
      })));
    } else {
      console.debug(`No districts to create.`)
    }

    console.debug(`Successfully created group ${groupId}`);

    return groupId;

  }

  private createRepresentativeAccount() {

  }

}
