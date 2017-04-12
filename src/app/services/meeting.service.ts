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


  private statsCache$: { [id: string]: MeetingStatsAdt } = {};

  constructor(private db: AngularFireDatabase, private itemSvc: ItemService, private actions: Actions, private store: Store<AppState>, private http: Http) {
  }


  public getAgendaItemsOfSelectedMeeting(): Observable<Item[]> {
    return this.store.select(getItemsOnSelectedMeetingAgenda)
  }

  public getMeetingStats(meetingId: string): Observable<MeetingStatsAdt> {
    if (!!this.statsCache$[meetingId]) {
      console.log(`returning cached meeting stats`);
      return Observable.of(this.statsCache$[meetingId]);
    }
    console.log(`fetching new mtg stats`);
    //return this.http.get(`https://us-central1-civ-cc.cloudfunctions.net/stats?meeting=${meetingId}`).map(it => it.json() as MeetingStatsAdt)
    return Observable.of(devStats)
      .do(it => {
        this.statsCache$[meetingId] = it;
      })
  }

  private load(mtgId: string): Observable<Meeting> {
    return this.db.object(`/meeting/${mtgId}`)
      .map((it: RawMeeting) => parseMeeting(it));
  }

  public getSelectedMeeting(): Observable<Meeting> {
    return this.store.select(getFocusedMeeting);
  }


}

const devStats = {
  "total": {
    "votes": 2894,
    "comments": 990,
    "participants": 400,
    "byDistrict": {
      "NO_DISTRICT": {"votes": 287, "comments": 109, "participants": 39},
      "id_district_101": {"votes": 224, "comments": 83, "participants": 30},
      "id_district_102": {"votes": 248, "comments": 91, "participants": 38},
      "id_district_103": {"votes": 268, "comments": 102, "participants": 36},
      "id_district_104": {"votes": 218, "comments": 68, "participants": 29},
      "id_district_105": {"votes": 234, "comments": 76, "participants": 34},
      "id_district_106": {"votes": 236, "comments": 93, "participants": 34},
      "id_district_107": {"votes": 241, "comments": 71, "participants": 30},
      "id_district_108": {"votes": 327, "comments": 101, "participants": 45},
      "id_district_109": {"votes": 333, "comments": 94, "participants": 43},
      "id_district_110": {"votes": 278, "comments": 102, "participants": 42}
    }
  },
  "byItem": {
    "id_item_1022": {
      "total": {
        "votes": {"yes": 52, "no": 38},
        "comments": {"pro": 15, "con": 8, "neutral": 9}
      },
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 4, "no": 3}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 5, "no": 3}, "comments": {"pro": 1, "con": 4, "neutral": 2}},
        "id_district_103": {"votes": {"yes": 4, "no": 4}, "comments": {"pro": 3, "con": 1, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 5, "no": 3}, "comments": {"pro": 2, "con": 1, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 5, "no": 2}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 5, "no": 5}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 7, "no": 3}, "comments": {"pro": 2, "con": 0, "neutral": 1}},
        "id_district_110": {"votes": {"yes": 7, "no": 3}, "comments": {"pro": 2, "con": 0, "neutral": 1}}
      }
    },
    "id_item_1145": {
      "total": {"votes": {"yes": 43, "no": 40}, "comments": {"pro": 1, "con": 7, "neutral": 4}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 0, "con": 1, "neutral": 2}},
        "id_district_102": {"votes": {"yes": 2, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 9, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 2, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 0, "con": 2, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 5, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 9, "no": 3}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 4, "no": 5}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 1, "no": 7}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_1241": {
      "total": {"votes": {"yes": 48, "no": 48}, "comments": {"pro": 14, "con": 11, "neutral": 8}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 3, "no": 5}, "comments": {"pro": 3, "con": 1, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 6, "no": 3}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 6, "no": 3}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_105": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 5, "no": 2}, "comments": {"pro": 3, "con": 1, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 3, "no": 9}, "comments": {"pro": 2, "con": 3, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 5, "no": 10}, "comments": {"pro": 2, "con": 2, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 5, "no": 5}, "comments": {"pro": 0, "con": 1, "neutral": 1}}
      }
    },
    "id_item_1371": {
      "total": {"votes": {"yes": 8, "no": 5}, "comments": {"pro": 19, "con": 13, "neutral": 6}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 3, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 1, "con": 2, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 2, "con": 2, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 2, "con": 2, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 2, "con": 0, "neutral": 3}},
        "id_district_107": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 2, "con": 1, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 3, "con": 0, "neutral": 3}}
      }
    },
    "id_item_1423": {
      "total": {"votes": {"yes": 9, "no": 9}, "comments": {"pro": 3, "con": 6, "neutral": 4}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_105": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_110": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 1}}
      }
    },
    "id_item_1455": {
      "total": {"votes": {"yes": 32, "no": 24}, "comments": {"pro": 5, "con": 5, "neutral": 2}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 2, "con": 1, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 5, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 6, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_108": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 1, "con": 1, "neutral": 0}}
      }
    },
    "id_item_1524": {
      "total": {"votes": {"yes": 36, "no": 28}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 4, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 3, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 6, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 1, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 5, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 5, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_1589": {
      "total": {"votes": {"yes": 11, "no": 5}, "comments": {"pro": 11, "con": 19, "neutral": 13}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 3}},
        "id_district_102": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 0, "con": 2, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 2, "neutral": 2}},
        "id_district_105": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 1, "con": 2, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 2, "con": 1, "neutral": 2}},
        "id_district_107": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 2, "con": 1, "neutral": 2}},
        "id_district_109": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 2, "con": 2, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 3, "con": 2, "neutral": 1}}
      }
    },
    "id_item_1649": {
      "total": {"votes": {"yes": 49, "no": 47}, "comments": {"pro": 5, "con": 3, "neutral": 1}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 5, "no": 7}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 6, "no": 4}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 6, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 7, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 4, "no": 7}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 7, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 2, "no": 7}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 2, "no": 8}, "comments": {"pro": 2, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 5, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_1755": {
      "total": {"votes": {"yes": 29, "no": 40}, "comments": {"pro": 18, "con": 20, "neutral": 12}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 5, "no": 3}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 2, "con": 1, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 3, "con": 1, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 2, "con": 1, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 4, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 2}},
        "id_district_106": {"votes": {"yes": 2, "no": 4}, "comments": {"pro": 0, "con": 3, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 2}},
        "id_district_108": {"votes": {"yes": 1, "no": 7}, "comments": {"pro": 1, "con": 3, "neutral": 2}},
        "id_district_109": {"votes": {"yes": 2, "no": 7}, "comments": {"pro": 0, "con": 5, "neutral": 1}},
        "id_district_110": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 2, "con": 1, "neutral": 3}}
      }
    },
    "id_item_1875": {
      "total": {"votes": {"yes": 40, "no": 32}, "comments": {"pro": 2, "con": 1, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 2, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 1, "no": 7}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 6, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 9, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 6, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_1951": {
      "total": {"votes": {"yes": 15, "no": 10}, "comments": {"pro": 6, "con": 3, "neutral": 1}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 5, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 1}}
      }
    },
    "id_item_1987": {
      "total": {"votes": {"yes": 18, "no": 12}, "comments": {"pro": 8, "con": 5, "neutral": 3}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 6, "no": 0}, "comments": {"pro": 2, "con": 1, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_108": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 0}}
      }
    },
    "id_item_2034": {
      "total": {"votes": {"yes": 51, "no": 49}, "comments": {"pro": 4, "con": 5, "neutral": 5}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 3, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 5, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 2}},
        "id_district_103": {"votes": {"yes": 5, "no": 6}, "comments": {"pro": 2, "con": 2, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 6, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 3, "no": 7}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 7, "no": 5}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 4, "no": 10}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 11, "no": 6}, "comments": {"pro": 0, "con": 2, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 3, "no": 7}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_2149": {
      "total": {"votes": {"yes": 8, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_2163": {
      "total": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 6, "con": 5, "neutral": 8}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 2, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_108": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 1, "con": 0, "neutral": 2}},
        "id_district_110": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 2, "con": 1, "neutral": 0}}
      }
    },
    "id_item_2186": {
      "total": {"votes": {"yes": 32, "no": 19}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 4, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 6, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_2239": {
      "total": {"votes": {"yes": 8, "no": 5}, "comments": {"pro": 17, "con": 8, "neutral": 8}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 2, "con": 1, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 3, "con": 2, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_105": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 4, "con": 0, "neutral": 1}},
        "id_district_106": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 3, "con": 0, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 1, "con": 1, "neutral": 2}},
        "id_district_109": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 3, "con": 1, "neutral": 1}},
        "id_district_110": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 1, "con": 0, "neutral": 1}}
      }
    },
    "id_item_2286": {
      "total": {"votes": {"yes": 27, "no": 17}, "comments": {"pro": 17, "con": 15, "neutral": 13}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 1, "con": 3, "neutral": 2}},
        "id_district_103": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 1, "con": 3, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 6, "no": 1}, "comments": {"pro": 2, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 2, "con": 1, "neutral": 2}},
        "id_district_106": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 1, "con": 2, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 1, "con": 2, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 4, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 3, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_110": {"votes": {"yes": 2, "no": 4}, "comments": {"pro": 1, "con": 0, "neutral": 4}}
      }
    },
    "id_item_2376": {
      "total": {"votes": {"yes": 29, "no": 26}, "comments": {"pro": 13, "con": 11, "neutral": 12}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 1, "con": 0, "neutral": 2}},
        "id_district_104": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 3, "con": 1, "neutral": 3}},
        "id_district_105": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_106": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 0, "con": 2, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_108": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 3, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 2, "con": 1, "neutral": 2}}
      }
    },
    "id_item_2468": {
      "total": {"votes": {"yes": 10, "no": 9}, "comments": {"pro": 8, "con": 4, "neutral": 11}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 3, "no": 0}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_106": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 3}},
        "id_district_107": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_108": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 3}},
        "id_district_110": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 1}}
      }
    },
    "id_item_2511": {
      "total": {"votes": {"yes": 23, "no": 23}, "comments": {"pro": 12, "con": 18, "neutral": 15}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 3, "no": 1}, "comments": {"pro": 3, "con": 2, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 3, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 2}},
        "id_district_103": {"votes": {"yes": 1, "no": 5}, "comments": {"pro": 1, "con": 3, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 0, "con": 2, "neutral": 1}},
        "id_district_105": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_106": {"votes": {"yes": 0, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 4, "con": 3, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 0, "con": 1, "neutral": 2}},
        "id_district_109": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 3, "neutral": 1}},
        "id_district_110": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 1, "con": 0, "neutral": 2}}
      }
    },
    "id_item_2603": {
      "total": {"votes": {"yes": 16, "no": 27}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 0, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 0, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 2, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_2647": {
      "total": {"votes": {"yes": 44, "no": 40}, "comments": {"pro": 7, "con": 11, "neutral": 13}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 3, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 5, "no": 3}, "comments": {"pro": 0, "con": 1, "neutral": 2}},
        "id_district_103": {"votes": {"yes": 3, "no": 0}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_105": {"votes": {"yes": 6, "no": 7}, "comments": {"pro": 1, "con": 2, "neutral": 2}},
        "id_district_106": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 0, "con": 4, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 5, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 6, "no": 2}, "comments": {"pro": 2, "con": 1, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 4, "no": 5}, "comments": {"pro": 1, "con": 1, "neutral": 2}},
        "id_district_110": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 0, "con": 1, "neutral": 3}}
      }
    },
    "id_item_2763": {
      "total": {"votes": {"yes": 40, "no": 41}, "comments": {"pro": 7, "con": 8, "neutral": 7}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 5, "no": 4}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 4, "no": 5}, "comments": {"pro": 0, "con": 2, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_105": {"votes": {"yes": 5, "no": 4}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_106": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 6, "no": 3}, "comments": {"pro": 4, "con": 1, "neutral": 1}},
        "id_district_108": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 7, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 4, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 1}}
      }
    },
    "id_item_2867": {
      "total": {"votes": {"yes": 45, "no": 52}, "comments": {"pro": 18, "con": 15, "neutral": 7}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 8}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 7, "no": 4}, "comments": {"pro": 3, "con": 1, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 7, "no": 9}, "comments": {"pro": 2, "con": 1, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 2, "no": 5}, "comments": {"pro": 2, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 4, "no": 5}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 1, "con": 2, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 5, "no": 2}, "comments": {"pro": 2, "con": 1, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 2, "no": 6}, "comments": {"pro": 0, "con": 2, "neutral": 3}},
        "id_district_109": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 2, "con": 1, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 6, "no": 2}, "comments": {"pro": 2, "con": 3, "neutral": 1}}
      }
    },
    "id_item_3005": {
      "total": {"votes": {"yes": 4, "no": 9}, "comments": {"pro": 11, "con": 5, "neutral": 7}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 0, "no": 3}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 2, "con": 0, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 2}},
        "id_district_104": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_105": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 2, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 2, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 2, "con": 1, "neutral": 0}}
      }
    },
    "id_item_3042": {
      "total": {"votes": {"yes": 57, "no": 41}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 5, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 12, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 6, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 3, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 5, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 9, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_3141": {
      "total": {"votes": {"yes": 15, "no": 9}, "comments": {"pro": 3, "con": 4, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 5, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 0}}
      }
    },
    "id_item_3173": {
      "total": {"votes": {"yes": 10, "no": 9}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_3193": {
      "total": {"votes": {"yes": 18, "no": 19}, "comments": {"pro": 13, "con": 13, "neutral": 11}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 2, "con": 1, "neutral": 2}},
        "id_district_102": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 2, "con": 3, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 2, "con": 0, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 2, "con": 0, "neutral": 2}},
        "id_district_106": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 2, "con": 1, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 4, "no": 3}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 2, "no": 4}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_110": {"votes": {"yes": 1, "no": 5}, "comments": {"pro": 2, "con": 3, "neutral": 1}}
      }
    },
    "id_item_3268": {
      "total": {"votes": {"yes": 34, "no": 26}, "comments": {"pro": 5, "con": 6, "neutral": 7}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 5, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 0, "con": 2, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 5, "no": 3}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_106": {"votes": {"yes": 0, "no": 5}, "comments": {"pro": 1, "con": 2, "neutral": 2}},
        "id_district_107": {"votes": {"yes": 3, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 6, "no": 3}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 2}},
        "id_district_110": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 1, "con": 0, "neutral": 0}}
      }
    },
    "id_item_3347": {
      "total": {"votes": {"yes": 52, "no": 37}, "comments": {"pro": 10, "con": 12, "neutral": 11}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 3, "no": 5}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 5, "no": 5}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 5, "no": 2}, "comments": {"pro": 1, "con": 2, "neutral": 3}},
        "id_district_106": {"votes": {"yes": 2, "no": 6}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 4, "no": 3}, "comments": {"pro": 0, "con": 3, "neutral": 1}},
        "id_district_108": {"votes": {"yes": 5, "no": 1}, "comments": {"pro": 3, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 10, "no": 6}, "comments": {"pro": 2, "con": 1, "neutral": 3}},
        "id_district_110": {"votes": {"yes": 8, "no": 2}, "comments": {"pro": 0, "con": 2, "neutral": 1}}
      }
    },
    "id_item_3470": {
      "total": {"votes": {"yes": 22, "no": 15}, "comments": {"pro": 12, "con": 14, "neutral": 10}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 3, "con": 0, "neutral": 2}},
        "id_district_102": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 1, "con": 2, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 3, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 0, "no": 3}, "comments": {"pro": 0, "con": 2, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 3, "con": 1, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 1, "con": 2, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_108": {"votes": {"yes": 4, "no": 4}, "comments": {"pro": 1, "con": 1, "neutral": 2}},
        "id_district_109": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_110": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 1, "con": 2, "neutral": 1}}
      }
    },
    "id_item_3544": {
      "total": {"votes": {"yes": 39, "no": 39}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 8, "no": 3}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 0, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 3, "no": 8}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 5, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 4, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 6, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_3624": {
      "total": {"votes": {"yes": 31, "no": 22}, "comments": {"pro": 10, "con": 8, "neutral": 6}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 2, "con": 1, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_105": {"votes": {"yes": 5, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_106": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 1, "con": 2, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 4, "no": 3}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 5, "no": 4}, "comments": {"pro": 2, "con": 0, "neutral": 2}},
        "id_district_110": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_3702": {
      "total": {"votes": {"yes": 54, "no": 44}, "comments": {"pro": 2, "con": 3, "neutral": 3}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 6, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 4, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 6, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 4, "no": 4}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 5, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 7, "no": 8}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 7, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 4, "no": 6}, "comments": {"pro": 0, "con": 1, "neutral": 0}}
      }
    },
    "id_item_3809": {
      "total": {"votes": {"yes": 30, "no": 38}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 6, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 6, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 0, "no": 7}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 2, "no": 4}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 6, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 4, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_3881": {
      "total": {"votes": {"yes": 55, "no": 40}, "comments": {"pro": 2, "con": 1, "neutral": 2}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 5, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 2, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 8, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 3, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_106": {"votes": {"yes": 7, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 2, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 7, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 7, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 0}}
      }
    },
    "id_item_3982": {
      "total": {"votes": {"yes": 55, "no": 37}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 2, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 6, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 5, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 8, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 9, "no": 7}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 6, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_4076": {
      "total": {"votes": {"yes": 38, "no": 48}, "comments": {"pro": 4, "con": 5, "neutral": 7}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 7, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 2, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 1, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 4, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 5, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_108": {"votes": {"yes": 7, "no": 9}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_110": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 0, "con": 4, "neutral": 0}}
      }
    },
    "id_item_4179": {
      "total": {"votes": {"yes": 48, "no": 45}, "comments": {"pro": 0, "con": 2, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 1, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 4, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 1, "no": 7}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 5, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 2, "no": 7}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 8, "no": 9}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 6, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 7, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 4, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_4275": {
      "total": {"votes": {"yes": 6, "no": 12}, "comments": {"pro": 2, "con": 4, "neutral": 8}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 0, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 2}},
        "id_district_108": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_110": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 1}}
      }
    },
    "id_item_4308": {
      "total": {"votes": {"yes": 24, "no": 30}, "comments": {"pro": 20, "con": 10, "neutral": 15}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 2, "con": 2, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 0, "no": 0}, "comments": {"pro": 1, "con": 2, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 1, "no": 5}, "comments": {"pro": 1, "con": 1, "neutral": 2}},
        "id_district_105": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 1, "con": 0, "neutral": 4}},
        "id_district_106": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 4, "con": 2, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 3, "no": 5}, "comments": {"pro": 4, "con": 0, "neutral": 2}},
        "id_district_109": {"votes": {"yes": 5, "no": 4}, "comments": {"pro": 1, "con": 0, "neutral": 3}},
        "id_district_110": {"votes": {"yes": 3, "no": 1}, "comments": {"pro": 2, "con": 1, "neutral": 1}}
      }
    },
    "id_item_4408": {
      "total": {"votes": {"yes": 20, "no": 16}, "comments": {"pro": 1, "con": 0, "neutral": 2}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 1, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 1, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 3, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_512": {
      "total": {"votes": {"yes": 44, "no": 29}, "comments": {"pro": 20, "con": 14, "neutral": 14}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 3, "con": 1, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 3, "no": 6}, "comments": {"pro": 0, "con": 2, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 5, "no": 1}, "comments": {"pro": 5, "con": 2, "neutral": 2}},
        "id_district_104": {"votes": {"yes": 8, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 3}},
        "id_district_105": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 0, "con": 2, "neutral": 2}},
        "id_district_106": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 1, "con": 2, "neutral": 1}},
        "id_district_107": {"votes": {"yes": 3, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 4}},
        "id_district_108": {"votes": {"yes": 5, "no": 3}, "comments": {"pro": 1, "con": 3, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 7, "no": 3}, "comments": {"pro": 2, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 3, "con": 0, "neutral": 0}}
      }
    },
    "id_item_634": {
      "total": {"votes": {"yes": 30, "no": 30}, "comments": {"pro": 16, "con": 18, "neutral": 13}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 1, "con": 2, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 4, "no": 3}, "comments": {"pro": 3, "con": 1, "neutral": 2}},
        "id_district_104": {"votes": {"yes": 2, "no": 4}, "comments": {"pro": 0, "con": 3, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 3, "neutral": 1}},
        "id_district_106": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 4, "con": 1, "neutral": 3}},
        "id_district_107": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 0, "con": 1, "neutral": 5}},
        "id_district_109": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 2, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 1, "no": 6}, "comments": {"pro": 2, "con": 2, "neutral": 1}}
      }
    },
    "id_item_742": {
      "total": {"votes": {"yes": 37, "no": 29}, "comments": {"pro": 4, "con": 3, "neutral": 6}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_102": {"votes": {"yes": 4, "no": 4}, "comments": {"pro": 1, "con": 0, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 3, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_105": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 3, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 3, "no": 5}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 1, "con": 2, "neutral": 1}},
        "id_district_109": {"votes": {"yes": 7, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_110": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_822": {
      "total": {"votes": {"yes": 14, "no": 16}, "comments": {"pro": 4, "con": 3, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 1, "con": 1, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 3, "no": 0}, "comments": {"pro": 1, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 3, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_860": {
      "total": {"votes": {"yes": 20, "no": 13}, "comments": {"pro": 4, "con": 8, "neutral": 5}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 3, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 2, "no": 0}, "comments": {"pro": 0, "con": 0, "neutral": 1}},
        "id_district_103": {"votes": {"yes": 3, "no": 2}, "comments": {"pro": 1, "con": 1, "neutral": 1}},
        "id_district_104": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 2, "con": 2, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 2, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 3}}
      }
    },
    "id_item_911": {
      "total": {"votes": {"yes": 18, "no": 22}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 1, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 1, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 4, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 1, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 2, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 0, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    },
    "id_item_952": {
      "total": {"votes": {"yes": 38, "no": 29}, "comments": {"pro": 0, "con": 2, "neutral": 0}},
      "byDistrict": {
        "id_district_101": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_102": {"votes": {"yes": 6, "no": 3}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_103": {"votes": {"yes": 2, "no": 4}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_104": {"votes": {"yes": 3, "no": 6}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_105": {"votes": {"yes": 0, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_106": {"votes": {"yes": 4, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_107": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_108": {"votes": {"yes": 4, "no": 1}, "comments": {"pro": 0, "con": 1, "neutral": 0}},
        "id_district_109": {"votes": {"yes": 2, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}},
        "id_district_110": {"votes": {"yes": 6, "no": 2}, "comments": {"pro": 0, "con": 0, "neutral": 0}}
      }
    }
  }
}
