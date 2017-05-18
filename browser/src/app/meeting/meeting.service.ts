import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Meeting, MeetingStats, parseMeeting, PartialMeeting, RawMeeting } from './meeting.model';
import { AngularFireDatabase } from 'angularfire2/database';
import { Item } from '../item/item.model';
import { ItemService } from '../item/item.service';
import { Actions, Effect, toPayload } from '@ngrx/effects';
import { SELECT_GROUP, SELECT_MEETING } from '../core/focus.reducer';
import { Store } from '@ngrx/store';
import { AppState, getFocusedMeeting, getGroups, getItemsOnSelectedMeetingAgenda, getLoadedMeetingIds } from '../state';
import { Http } from '@angular/http';
import { MeetingLoadedAction } from './meeting.reducer';

const LOAD_MEETING = '[MeetingSvcInternal] loadMeeting';
const REPORT_GENERATOR_URL = 'https://us-central1-civ-cc.cloudfunctions.net/report';

@Injectable()
export class MeetingService {

  @Effect() doLoadMeetingsEffect = this.actions.ofType(LOAD_MEETING)
    .map(toPayload)
    .withLatestFrom(this.store.select(getLoadedMeetingIds))
    .filter(([ selectedMeetingId, loadedMeetingIds ]) => loadedMeetingIds.indexOf(selectedMeetingId) < 0)
    .do(([ selectedMeetingId, loadedMeetingIds ]) => console.debug(`${selectedMeetingId} does not exist in ${JSON.stringify(loadedMeetingIds)}, loading.`))
    .flatMap(([ selectedMeetingId, loadedIds ]) => this.load(selectedMeetingId))
    .map(mtg => new MeetingLoadedAction(mtg));

  @Effect() loadMeetingsForSelectedGroupEffect =
    this.store.select(getGroups)
      .withLatestFrom(this.actions.ofType(SELECT_GROUP).map(toPayload).filter(it => !!it))
      .map(([ groups, selectedGroupId ]) => groups[ selectedGroupId ].meetingIds)
      .mergeMap(meetingIds => Observable.from(meetingIds.map(id => ({ type: LOAD_MEETING, payload: id }))));


  @Effect() loadSelectedMeetingEffect =
    this.actions.ofType(SELECT_MEETING)
      .map(toPayload)
      .map(id => ({ type: LOAD_MEETING, payload: id }));


  private statsCache$: { [id: string]: MeetingStats } = {};

  constructor(private db: AngularFireDatabase, private itemSvc: ItemService, private actions: Actions, private store: Store<AppState>, private http: Http) {
  }


  public getAgendaItemsOfSelectedMeeting(): Observable<Item[]> {
    return this.store.select(getItemsOnSelectedMeetingAgenda)
  }

  public getMeetingStats(meetingId: string): Observable<MeetingStats> {
    if (!!this.statsCache$[ meetingId ]) {
      console.log(`returning cached meeting stats`);
      return Observable.of(this.statsCache$[ meetingId ]);
    }
    console.log(`fetching new mtg stats`);
    return this.http.get(`https://us-central1-civ-cc.cloudfunctions.net/stats?meeting=${meetingId}`)
      .map(it => it.json() as MeetingStats)
      .do(it => {
        this.statsCache$[ meetingId ] = it;
      })
  }

  public setPublished(meetingId: string, value: boolean) {
    this.db.object(`/meeting/${meetingId}`).update({ published: value });
  }

  public update(mtgId: string, data: PartialMeeting) {

    let push = { ...data } as any;
    if (data.feedbackDeadline) {
      push.feedbackDeadline = data.feedbackDeadline.toISOString();
    }
    if (data.startTime) {
      push.startTime = data.startTime.toISOString();
    }

    this.db.object(`/meeting/${mtgId}`).update(push).then(res => {

    }).catch(err => {
      debugger;
      throw new Error(err.message);
    });

  }

  public getPDFReport(meetingId: string, forDistrict?: string): Observable<{ success: boolean, url: string, error?: string, fromCache: boolean }> {
    let url = `${REPORT_GENERATOR_URL}?meetingId=${meetingId}`;
    if (!!forDistrict) {
      url += `&forDistrict=${forDistrict}`
    }
    return this.http.get(url)
      .map(response => response.json());
  }


  private load(mtgId: string): Observable<Meeting> {
    return this.db.object(`/meeting/${mtgId}`)
      .map((it: RawMeeting) => parseMeeting(it));
  }

  public getSelectedMeeting(): Observable<Meeting> {
    return this.store.select(getFocusedMeeting);
  }


}
