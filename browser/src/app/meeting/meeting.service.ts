import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Meeting, MeetingCreateAdt, MeetingStats, parseMeeting, PartialMeeting, RawMeeting } from './meeting.model';
import { AngularFireDatabase } from 'angularfire2/database';
import { Item } from '../item/item.model';
import { ItemService } from '../item/item.service';
import { Actions, Effect, toPayload } from '@ngrx/effects';
import { SELECT_GROUP, SELECT_MEETING } from '../core/focus.reducer';
import { Store } from '@ngrx/store';
import { AppState, getFocusedMeeting, getGroups, getItemsOnSelectedMeetingAgenda, getLoadedMeetingIds } from '../state';
import { Http } from '@angular/http';
import { MeetingLoadedAction } from './meeting.reducer';
import { AuthService } from '../user/auth.service';

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
      .map(([ groups, selectedGroupId ]) => groups[ selectedGroupId ].meetings)
      .mergeMap(meetingIds => Observable.from(meetingIds.map(id => ({ type: LOAD_MEETING, payload: id }))));


  @Effect() loadSelectedMeetingEffect =
    this.actions.ofType(SELECT_MEETING)
      .map(toPayload)
      .map(id => ({ type: LOAD_MEETING, payload: id }));


  private statsCache$: { [id: string]: MeetingStats } = {};

  constructor(private db: AngularFireDatabase, private itemSvc: ItemService, private authSvc: AuthService, private actions: Actions, private store: Store<AppState>, private http: Http) {
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

  public async createMeeting(input: MeetingCreateAdt) {
    /*  This method is being erroneously called (with an Event arg) when the datepicker in the create meeting interface is clicked.
     *  I suspect this is a bug in ng-material and/or has something to do with the function being async.
     *  TODO diagnose
     *  */
    if (!!input && !!input.startTime) {
      const userId = await this.authSvc.sessionUserId$.take(1).toPromise();

      //create meeting without agenda => meeting id
      const meetingId = await this.createEmptyMeeting(input, userId);

      console.info(`created meeting: ${meetingId}`);

      //create each item with onAgenda field set => list of item ids
      const itemIds = await Promise.all(input.agenda.map(item =>
        this.createItem(item, meetingId, input.groupId, userId)
      ));

      //add agenda field to item with item IDs
      console.info(`created items: ${JSON.stringify(itemIds)}`);
      const addAgenda = await this.addMeetingAgenda(meetingId, itemIds);

      console.info(`updated agenda. `);

      await this.addToGroupMeetings(input.groupId, meetingId);

      console.info(`added to group meetings `);

      return true;

    } else {

      console.debug('MeetingService.createMeeting() called with unrecognizable argument: ');
      console.debug(input);
    }

  };

  private async addToGroupMeetings(groupId: string, meetingId: string) {
    return await this.db.object(`/group/${groupId}/meetings`).update({ [meetingId]: true });
  }

  private async addMeetingAgenda(meetingId: string, itemIds: string[]) {
    return await this.db.object(`/meeting/${meetingId}`)
      .update({ agenda: itemIds.reduce((result, id) => ({ ...result, [id]: true }), {}) })
  }

  private async createItem(item: { text: string, itemNumber: number, resourceLinks: string[] }, meetingId: string, groupId: string, userId: string): Promise<string> {
    let toPush: any =
      {
        text: item.text,
        onAgendas: {
          [meetingId]: {
            meetingId,
            groupId,
            itemNumber: item.itemNumber,
            closedSession: false
          }
        },
        owner: userId

      };
    if ((item.resourceLinks || []).length > 0) {
      toPush.resourceLinks = item.resourceLinks
    }

    let pushResult = await this.db.list('item').push(toPush);

    return pushResult.key;
  }

  private async createEmptyMeeting(input: MeetingCreateAdt, userId: string): Promise<string> {
    const pushResult = await this.db.list('meeting').push({
      title: input.title,
      groupId: input.groupId,
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
      published: false,
      feedbackDeadline: input.feedbackDeadline.toISOString(),
      owner: userId
    });

    return pushResult.key;

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
