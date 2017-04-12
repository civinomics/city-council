import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Meeting, MeetingStatsAdt, parseMeeting, RawMeeting} from '../models/meeting';
import {AngularFireDatabase} from 'angularfire2';
import {Item} from '../models/item';
import {ItemService} from './item.service';
import {Actions, Effect, toPayload} from '@ngrx/effects';
import {SELECT_GROUP, SELECT_MEETING} from '../reducers/focus';
import {Store} from '@ngrx/store';
import {
  AppState,
  getFocusedMeeting,
  getGroups,
  getItemsOnSelectedMeetingAgenda,
  getLoadedMeetingIds
} from '../reducers/index';
import {MeetingLoadedAction} from '../reducers/data';
import {Http} from '@angular/http';

const LOAD_MEETING = '[MeetingSvcInternal] loadMeeting';

@Injectable()
export class MeetingService {

  @Effect() doLoadMeetingsEffect = this.actions.ofType(LOAD_MEETING)
    .map(toPayload)
    .withLatestFrom(this.store.select(getLoadedMeetingIds))
    .filter(([selectedMeetingId, loadedMeetingIds]) => loadedMeetingIds.indexOf(selectedMeetingId) < 0)
    .do(([selectedMeetingId, loadedMeetingIds]) => console.debug(`${selectedMeetingId} does not exist in ${JSON.stringify(loadedMeetingIds)}, loading.`))
    .flatMap(([selectedMeetingId, loadedIds]) => this.load(selectedMeetingId))
    .map(mtg => new MeetingLoadedAction(mtg));

  @Effect() loadMeetingsForSelectedGroupEffect =
    this.store.select(getGroups)
      .withLatestFrom(this.actions.ofType(SELECT_GROUP).map(toPayload).filter(it => !!it))
      .map(([groups, selectedGroupId]) => groups[selectedGroupId].meetingIds)
      .mergeMap(meetingIds => Observable.from(meetingIds.map(id => ({type: LOAD_MEETING, payload: id}))));


  @Effect() loadSelectedMeetingEffect =
    this.actions.ofType(SELECT_MEETING)
      .map(toPayload)
      .map(id => ({type: LOAD_MEETING, payload: id}));


  constructor(private db: AngularFireDatabase, private itemSvc: ItemService, private actions: Actions, private store: Store<AppState>, private http: Http) {
  }


  public getAgendaItemsOfSelectedMeeting(): Observable<Item[]> {
    return this.store.select(getItemsOnSelectedMeetingAgenda)
  }

  public getMeetingStats(meetingId: string): Observable<MeetingStatsAdt> {
    return this.http.get(`https://us-central1-civ-cc.cloudfunctions.net/stats?meeting=${meetingId}`)
      .map(it => it.json() as MeetingStatsAdt);
  }

  private load(mtgId: string): Observable<Meeting> {
    return this.db.object(`/meeting/${mtgId}`)
      .map((it: RawMeeting) => parseMeeting(it));
  }

  public getSelectedMeeting(): Observable<Meeting> {
    return this.store.select(getFocusedMeeting);
  }


}
