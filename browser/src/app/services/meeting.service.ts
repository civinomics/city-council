import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Meeting, MeetingStats, parseMeeting, RawMeeting} from '../models/meeting';
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
import {parseComment} from '../models/comment';

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


    private statsCache$: { [id: string]: MeetingStats } = {};

    constructor(private db: AngularFireDatabase, private itemSvc: ItemService, private actions: Actions, private store: Store<AppState>, private http: Http) {
    }


    public getAgendaItemsOfSelectedMeeting(): Observable<Item[]> {
        return this.store.select(getItemsOnSelectedMeetingAgenda)
    }

    public getMeetingStats(meetingId: string): Observable<MeetingStats> {
        if (!!this.statsCache$[meetingId]) {
            console.log(`returning cached meeting stats`);
            return Observable.of(this.statsCache$[meetingId]);
        }
        console.log(`fetching new mtg stats`);
        //return this.http.get(`https://us-central1-civ-cc.cloudfunctions.net/stats?meeting=${meetingId}`).map(it => it.json() as MeetingStats)
        return Observable.of(devStats)
            .map(raw => this.parseMeetingStats(raw))
            .do(it => {
                this.statsCache$[meetingId] = it;
            })
    }

    private parseMeetingStats(rawStats) {
        return {
            ...rawStats,
            byItem: Object.keys(rawStats.byItem).reduce((result, itemId) => {
                let entry = rawStats.byItem[itemId];

                return {
                    ...result,
                    [itemId]: {
                        ...entry,
                        topComments: {
                            pro: !entry.topComments.pro ? null : parseComment(entry.topComments.pro),
                            con: !entry.topComments.con ? null : parseComment(entry.topComments.con),
                            byDistrict: Object.keys(entry.topComments.byDistrict).reduce((distResult, distId) => ({
                                ...distResult,
                                [distId]: {
                                    pro: !entry.topComments.byDistrict[distId].pro ? null : parseComment(entry.topComments.byDistrict[distId].pro),
                                    con: !entry.topComments.byDistrict[distId].con ? null : parseComment(entry.topComments.byDistrict[distId].con),
                                }
                            }), {})
                        }
                    }
                }
            }, {})
        }
    }

    private load(mtgId: string): Observable<Meeting> {
        return this.db.object(`/meeting/${mtgId}`)
            .map((it: RawMeeting) => parseMeeting(it));
    }

    public getSelectedMeeting(): Observable<Meeting> {
        return this.store.select(getFocusedMeeting);
    }


}

const devStats: MeetingStats = {
    'priors': [{
        'date': '2017-03-02T23:45:20.219Z',
        'value': 0
    }, {'date': '2017-03-30T22:45:19.987Z', 'value': 0}, {'date': '2017-03-16T22:45:20.101Z', 'value': 0}],
    'total': {
        'votes': 2895,
        'comments': 991,
        'participants': 401,
        'byDistrict': {
            'NO_DISTRICT': {'votes': 288, 'comments': 110, 'participants': 40},
            'id_district_101': {'votes': 224, 'comments': 83, 'participants': 30},
            'id_district_102': {'votes': 248, 'comments': 91, 'participants': 38},
            'id_district_103': {'votes': 268, 'comments': 102, 'participants': 36},
            'id_district_104': {'votes': 218, 'comments': 68, 'participants': 29},
            'id_district_105': {'votes': 234, 'comments': 76, 'participants': 34},
            'id_district_106': {'votes': 236, 'comments': 93, 'participants': 34},
            'id_district_107': {'votes': 241, 'comments': 71, 'participants': 30},
            'id_district_108': {'votes': 327, 'comments': 101, 'participants': 45},
            'id_district_109': {'votes': 333, 'comments': 94, 'participants': 43},
            'id_district_110': {'votes': 278, 'comments': 102, 'participants': 42}
        }
    },
    'byItem': {
        'id_item_1022': {
            'total': {
                'votes': {'yes': 52, 'no': 38},
                'comments': {'pro': 15, 'con': 8, 'neutral': 9}
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 4, 'no': 3},
                    'comments': {'pro': 1, 'con': 0, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 5, 'no': 3}, 'comments': {'pro': 1, 'con': 4, 'neutral': 2}},
                'id_district_103': {'votes': {'yes': 4, 'no': 4}, 'comments': {'pro': 3, 'con': 1, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 5, 'no': 3}, 'comments': {'pro': 2, 'con': 1, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 5, 'no': 2}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 5, 'no': 5}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 7, 'no': 3}, 'comments': {'pro': 2, 'con': 0, 'neutral': 1}},
                'id_district_110': {'votes': {'yes': 7, 'no': 3}, 'comments': {'pro': 2, 'con': 0, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_1127',
                    'owner': 'id_user_197',
                    'editors': ['id_user_197'],
                    'text': 'Error officiis et quo quis qui magni.',
                    'role': 'pro',
                    'posted': '2017-04-09T20:19:08.698Z',
                    'userDistrict': 'id_district_102',
                    'votes': {'up': 0, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_1139',
                    'owner': 'id_user_298',
                    'editors': ['id_user_298'],
                    'text': 'Laborum et voluptas commodi voluptatem sint sit.',
                    'role': 'con',
                    'posted': '2017-04-03T17:57:48.142Z',
                    'userDistrict': 'id_district_102',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_1114',
                            'owner': 'id_user_227',
                            'editors': ['id_user_227'],
                            'text': 'Quas et est voluptas explicabo et error.',
                            'role': 'pro',
                            'posted': '2017-04-04T22:07:11.360Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_1127',
                            'owner': 'id_user_197',
                            'editors': ['id_user_197'],
                            'text': 'Error officiis et quo quis qui magni.',
                            'role': 'pro',
                            'posted': '2017-04-09T20:19:08.698Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1139',
                            'owner': 'id_user_298',
                            'editors': ['id_user_298'],
                            'text': 'Laborum et voluptas commodi voluptatem sint sit.',
                            'role': 'con',
                            'posted': '2017-04-03T17:57:48.142Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_1126',
                            'owner': 'id_user_283',
                            'editors': ['id_user_283'],
                            'text': 'Et sunt eum natus voluptate.',
                            'role': 'pro',
                            'posted': '2017-04-04T19:00:45.269Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1119',
                            'owner': 'id_user_116',
                            'editors': ['id_user_116'],
                            'text': 'Enim dolorum reprehenderit minus quod.',
                            'role': 'con',
                            'posted': '2017-04-07T20:03:09.770Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_1125',
                            'owner': 'id_user_135',
                            'editors': ['id_user_135'],
                            'text': 'Laboriosam ullam est.',
                            'role': 'pro',
                            'posted': '2017-04-11T05:26:36.555Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1123',
                            'owner': 'id_user_312',
                            'editors': ['id_user_312'],
                            'text': 'Sit praesentium voluptas sint magni ad ab possimus enim sit.',
                            'role': 'con',
                            'posted': '2017-04-02T02:21:34.378Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_1137',
                            'owner': 'id_user_141',
                            'editors': ['id_user_141'],
                            'text': 'Incidunt dolores inventore voluptate alias incidunt qui nesciunt alias.',
                            'role': 'pro',
                            'posted': '2017-04-04T12:38:52.404Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 1}
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_1115',
                            'owner': 'id_user_466',
                            'editors': ['id_user_466'],
                            'text': 'Exercitationem velit rerum autem.',
                            'role': 'pro',
                            'posted': '2017-03-30T07:14:29.999Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1142',
                            'owner': 'id_user_114',
                            'editors': ['id_user_114'],
                            'text': 'Quibusdam qui cumque est nihil accusantium et est totam.',
                            'role': 'con',
                            'posted': '2017-04-05T17:21:40.520Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_1118',
                            'owner': 'id_user_264',
                            'editors': ['id_user_264'],
                            'text': 'Dicta eos maxime voluptatibus est rerum quo facilis rerum.',
                            'role': 'pro',
                            'posted': '2017-04-03T17:53:19.118Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_1116',
                            'owner': 'id_user_144',
                            'editors': ['id_user_144'],
                            'text': 'Iure voluptate et reprehenderit nesciunt.',
                            'role': 'pro',
                            'posted': '2017-04-10T03:21:36.496Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 1}
                        },
                        'con': {
                            'id': 'id_comment_1138',
                            'owner': 'id_user_487',
                            'editors': ['id_user_487'],
                            'text': 'Reiciendis iste facilis.',
                            'role': 'con',
                            'posted': '2017-04-10T18:44:31.155Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_1141',
                            'owner': 'id_user_296',
                            'editors': ['id_user_296'],
                            'text': 'Labore fugit quae commodi.',
                            'role': 'pro',
                            'posted': '2017-04-08T18:09:44.303Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_1117',
                            'owner': 'id_user_387',
                            'editors': ['id_user_387'],
                            'text': 'Dicta sit corporis nemo vitae ea at.',
                            'role': 'pro',
                            'posted': '2017-04-09T21:48:35.736Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_1145': {
            'total': {'votes': {'yes': 43, 'no': 40}, 'comments': {'pro': 1, 'con': 7, 'neutral': 4}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 1, 'no': 3},
                    'comments': {'pro': 0, 'con': 1, 'neutral': 2}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 9, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 2, 'no': 6}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 0, 'con': 2, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 5, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 9, 'no': 3}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 4, 'no': 5}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 1, 'no': 7}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_1234',
                    'owner': 'id_user_245',
                    'editors': ['id_user_245'],
                    'text': 'Quos non repellendus sunt officia possimus est et.',
                    'role': 'pro',
                    'posted': '2017-03-30T12:03:43.508Z',
                    'userDistrict': null,
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_1240',
                    'owner': 'id_user_474',
                    'editors': ['id_user_474'],
                    'text': 'Non consequatur numquam in modi aperiam dolores quidem.',
                    'role': 'con',
                    'posted': '2017-04-09T13:54:48.082Z',
                    'userDistrict': 'id_district_106',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1235',
                            'owner': 'id_user_484',
                            'editors': ['id_user_484'],
                            'text': 'Quia harum nostrum beatae modi quis sit natus.',
                            'role': 'con',
                            'posted': '2017-04-12T00:11:46.752Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1233',
                            'owner': 'id_user_268',
                            'editors': ['id_user_268'],
                            'text': 'Magni hic ad dolore autem voluptatem pariatur neque.',
                            'role': 'con',
                            'posted': '2017-04-10T22:05:42.846Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1240',
                            'owner': 'id_user_474',
                            'editors': ['id_user_474'],
                            'text': 'Non consequatur numquam in modi aperiam dolores quidem.',
                            'role': 'con',
                            'posted': '2017-04-09T13:54:48.082Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1230',
                            'owner': 'id_user_453',
                            'editors': ['id_user_453'],
                            'text': 'Cupiditate et repellat illum.',
                            'role': 'con',
                            'posted': '2017-04-03T02:05:44.532Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1231',
                            'owner': 'id_user_425',
                            'editors': ['id_user_425'],
                            'text': 'Laboriosam sit quisquam voluptatum.',
                            'role': 'con',
                            'posted': '2017-04-06T04:48:51.797Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_1241': {
            'total': {'votes': {'yes': 48, 'no': 48}, 'comments': {'pro': 14, 'con': 11, 'neutral': 8}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 3, 'no': 3},
                    'comments': {'pro': 1, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 3, 'no': 5}, 'comments': {'pro': 3, 'con': 1, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 6, 'no': 3}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 6, 'no': 3}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_105': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 5, 'no': 2}, 'comments': {'pro': 3, 'con': 1, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 4, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 3, 'no': 9}, 'comments': {'pro': 2, 'con': 3, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 5, 'no': 10}, 'comments': {'pro': 2, 'con': 2, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 5, 'no': 5}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_1342',
                    'owner': 'id_user_260',
                    'editors': ['id_user_260'],
                    'text': 'Dicta non voluptas quisquam aut.',
                    'role': 'pro',
                    'posted': '2017-04-03T04:16:56.435Z',
                    'userDistrict': 'id_district_109',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_1361',
                    'owner': 'id_user_317',
                    'editors': ['id_user_317'],
                    'text': 'Et voluptas facere nemo hic et.',
                    'role': 'con',
                    'posted': '2017-04-06T00:40:00.806Z',
                    'userDistrict': 'id_district_108',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_1338',
                            'owner': 'id_user_441',
                            'editors': ['id_user_441'],
                            'text': 'Quaerat velit sint ut consequatur placeat et voluptas.',
                            'role': 'pro',
                            'posted': '2017-04-04T03:46:13.865Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_1347',
                            'owner': 'id_user_301',
                            'editors': ['id_user_301'],
                            'text': 'Non minus et autem odit nostrum eius perspiciatis.',
                            'role': 'pro',
                            'posted': '2017-04-06T03:58:34.156Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1340',
                            'owner': 'id_user_142',
                            'editors': ['id_user_142'],
                            'text': 'Qui aperiam reprehenderit architecto minus officia dolorum exercitationem ab.',
                            'role': 'con',
                            'posted': '2017-03-30T09:20:28.752Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_1360',
                            'owner': 'id_user_120',
                            'editors': ['id_user_120'],
                            'text': 'Distinctio tempore cupiditate at.',
                            'role': 'pro',
                            'posted': '2017-04-06T10:31:24.685Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1369',
                            'owner': 'id_user_124',
                            'editors': ['id_user_124'],
                            'text': 'Perferendis ut omnis impedit doloribus.',
                            'role': 'con',
                            'posted': '2017-04-03T05:52:20.739Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_1353',
                            'owner': 'id_user_176',
                            'editors': ['id_user_176'],
                            'text': 'Quis qui nihil et architecto pariatur velit enim libero rem.',
                            'role': 'pro',
                            'posted': '2017-04-10T21:34:42.459Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1341',
                            'owner': 'id_user_176',
                            'editors': ['id_user_176'],
                            'text': 'Rerum nemo id corrupti ipsam veritatis.',
                            'role': 'con',
                            'posted': '2017-04-01T13:45:08.014Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_1365',
                            'owner': 'id_user_164',
                            'editors': ['id_user_164'],
                            'text': 'Qui consequatur similique.',
                            'role': 'pro',
                            'posted': '2017-04-04T12:00:12.390Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_1344',
                            'owner': 'id_user_241',
                            'editors': ['id_user_241'],
                            'text': 'Sunt perspiciatis non accusamus pariatur vel.',
                            'role': 'pro',
                            'posted': '2017-04-05T14:41:55.570Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1367',
                            'owner': 'id_user_111',
                            'editors': ['id_user_111'],
                            'text': 'Voluptatem quis neque.',
                            'role': 'con',
                            'posted': '2017-04-12T06:14:07.996Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1356',
                            'owner': 'id_user_129',
                            'editors': ['id_user_129'],
                            'text': 'Odio nemo modi asperiores sit error temporibus ut in deserunt.',
                            'role': 'con',
                            'posted': '2017-04-04T15:28:11.407Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_1343',
                            'owner': 'id_user_496',
                            'editors': ['id_user_496'],
                            'text': 'Quia rerum incidunt eligendi est illum eligendi reprehenderit.',
                            'role': 'pro',
                            'posted': '2017-04-05T09:37:27.237Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 1}
                        },
                        'con': {
                            'id': 'id_comment_1361',
                            'owner': 'id_user_317',
                            'editors': ['id_user_317'],
                            'text': 'Et voluptas facere nemo hic et.',
                            'role': 'con',
                            'posted': '2017-04-06T00:40:00.806Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_1342',
                            'owner': 'id_user_260',
                            'editors': ['id_user_260'],
                            'text': 'Dicta non voluptas quisquam aut.',
                            'role': 'pro',
                            'posted': '2017-04-03T04:16:56.435Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1352',
                            'owner': 'id_user_352',
                            'editors': ['id_user_352'],
                            'text': 'Corporis ad sit natus deserunt eum magnam occaecati cum a.',
                            'role': 'con',
                            'posted': '2017-03-31T13:20:08.154Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1339',
                            'owner': 'id_user_489',
                            'editors': ['id_user_489'],
                            'text': 'Odit molestiae et nostrum animi et ut.',
                            'role': 'con',
                            'posted': '2017-04-09T01:33:58.363Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_1371': {
            'total': {'votes': {'yes': 8, 'no': 5}, 'comments': {'pro': 19, 'con': 13, 'neutral': 6}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 1, 'no': 0},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 3, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 1, 'con': 2, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 2, 'con': 2, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 2, 'con': 2, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 2, 'con': 0, 'neutral': 3}},
                'id_district_107': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 2, 'con': 1, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 3, 'con': 0, 'neutral': 3}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_1396',
                    'owner': 'id_user_176',
                    'editors': ['id_user_176'],
                    'text': 'Vitae consequuntur voluptatum accusamus eum.',
                    'role': 'pro',
                    'posted': '2017-03-30T13:09:32.281Z',
                    'userDistrict': 'id_district_104',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_1397',
                    'owner': 'id_user_160',
                    'editors': ['id_user_160'],
                    'text': 'Rerum aut fugiat earum.',
                    'role': 'con',
                    'posted': '2017-04-08T17:34:56.870Z',
                    'userDistrict': 'id_district_103',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_1407',
                            'owner': 'id_user_508',
                            'editors': ['id_user_508'],
                            'text': 'Est aliquam ut aut.',
                            'role': 'pro',
                            'posted': '2017-04-07T05:09:51.357Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1391',
                            'owner': 'id_user_354',
                            'editors': ['id_user_354'],
                            'text': 'Odio doloremque sed iusto maiores iure velit.',
                            'role': 'con',
                            'posted': '2017-04-05T00:55:29.755Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_1399',
                            'owner': 'id_user_469',
                            'editors': ['id_user_469'],
                            'text': 'Quo dolor et alias.',
                            'role': 'pro',
                            'posted': '2017-04-02T08:06:12.835Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1397',
                            'owner': 'id_user_160',
                            'editors': ['id_user_160'],
                            'text': 'Rerum aut fugiat earum.',
                            'role': 'con',
                            'posted': '2017-04-08T17:34:56.870Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_1396',
                            'owner': 'id_user_176',
                            'editors': ['id_user_176'],
                            'text': 'Vitae consequuntur voluptatum accusamus eum.',
                            'role': 'pro',
                            'posted': '2017-03-30T13:09:32.281Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1387',
                            'owner': 'id_user_504',
                            'editors': ['id_user_504'],
                            'text': 'Ea et ea.',
                            'role': 'con',
                            'posted': '2017-04-12T21:23:59.767Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_1389',
                            'owner': 'id_user_186',
                            'editors': ['id_user_186'],
                            'text': 'Sint repellat illum.',
                            'role': 'pro',
                            'posted': '2017-04-02T16:46:29.697Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1400',
                            'owner': 'id_user_164',
                            'editors': ['id_user_164'],
                            'text': 'Sit assumenda ad officia accusamus.',
                            'role': 'con',
                            'posted': '2017-03-30T12:40:37.731Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_1393',
                            'owner': 'id_user_114',
                            'editors': ['id_user_114'],
                            'text': 'Velit nemo rerum doloribus qui ut ad ab doloribus.',
                            'role': 'pro',
                            'posted': '2017-04-05T18:52:23.493Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_1414',
                            'owner': 'id_user_264',
                            'editors': ['id_user_264'],
                            'text': 'Esse cum harum velit fugit sunt sed.',
                            'role': 'pro',
                            'posted': '2017-04-10T05:14:22.096Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1394',
                            'owner': 'id_user_410',
                            'editors': ['id_user_410'],
                            'text': 'Et quia nostrum.',
                            'role': 'con',
                            'posted': '2017-04-10T21:56:43.775Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_1420',
                            'owner': 'id_user_448',
                            'editors': ['id_user_448'],
                            'text': 'Voluptas voluptatem omnis quidem.',
                            'role': 'pro',
                            'posted': '2017-04-03T11:37:58.055Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_1388',
                            'owner': 'id_user_262',
                            'editors': ['id_user_262'],
                            'text': 'Sed ut cum explicabo facilis delectus quo quis.',
                            'role': 'pro',
                            'posted': '2017-04-01T23:17:21.324Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1398',
                            'owner': 'id_user_157',
                            'editors': ['id_user_157'],
                            'text': 'Ut est necessitatibus eligendi dolorem cum qui ullam.',
                            'role': 'con',
                            'posted': '2017-03-30T23:20:38.578Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_1401',
                            'owner': 'id_user_122',
                            'editors': ['id_user_122'],
                            'text': 'Voluptas temporibus ex non hic nobis facere amet quisquam.',
                            'role': 'pro',
                            'posted': '2017-04-02T03:54:37.966Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_1423': {
            'total': {'votes': {'yes': 9, 'no': 9}, 'comments': {'pro': 3, 'con': 6, 'neutral': 4}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 0, 'no': 0},
                    'comments': {'pro': 0, 'con': 1, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}},
                'id_district_105': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_110': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_1453',
                    'owner': 'id_user_430',
                    'editors': ['id_user_430'],
                    'text': 'Quidem omnis recusandae deleniti quia nobis suscipit.',
                    'role': 'pro',
                    'posted': '2017-03-30T19:33:04.251Z',
                    'userDistrict': 'id_district_103',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_1442',
                    'owner': 'id_user_334',
                    'editors': ['id_user_334'],
                    'text': 'Neque consequatur sint est.',
                    'role': 'con',
                    'posted': '2017-04-09T06:56:55.988Z',
                    'userDistrict': 'id_district_110',
                    'votes': {'up': 0, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1443',
                            'owner': 'id_user_461',
                            'editors': ['id_user_461'],
                            'text': 'Quas ducimus illum omnis.',
                            'role': 'con',
                            'posted': '2017-04-07T07:59:46.276Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 1}
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_1444',
                            'owner': 'id_user_339',
                            'editors': ['id_user_339'],
                            'text': 'Cum harum sapiente occaecati dolorem similique.',
                            'role': 'pro',
                            'posted': '2017-04-10T21:48:35.238Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 1}
                        },
                        'con': {
                            'id': 'id_comment_1448',
                            'owner': 'id_user_354',
                            'editors': ['id_user_354'],
                            'text': 'Quos qui dolore dolorem quas aut tempora eligendi placeat.',
                            'role': 'con',
                            'posted': '2017-04-05T00:31:49.605Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_1453',
                            'owner': 'id_user_430',
                            'editors': ['id_user_430'],
                            'text': 'Quidem omnis recusandae deleniti quia nobis suscipit.',
                            'role': 'pro',
                            'posted': '2017-03-30T19:33:04.251Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_1451',
                            'owner': 'id_user_162',
                            'editors': ['id_user_162'],
                            'text': 'A quaerat hic ratione.',
                            'role': 'pro',
                            'posted': '2017-04-07T15:31:02.030Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1447',
                            'owner': 'id_user_347',
                            'editors': ['id_user_347'],
                            'text': 'Est itaque voluptas molestias illo.',
                            'role': 'con',
                            'posted': '2017-04-08T01:51:31.704Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 2}
                        }
                    },
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1445',
                            'owner': 'id_user_279',
                            'editors': ['id_user_279'],
                            'text': 'Est ut non sed quam accusantium iure.',
                            'role': 'con',
                            'posted': '2017-04-08T10:11:17.634Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1454',
                            'owner': 'id_user_490',
                            'editors': ['id_user_490'],
                            'text': 'Amet et pariatur recusandae inventore ut ducimus temporibus quia.',
                            'role': 'con',
                            'posted': '2017-04-12T19:41:01.162Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1442',
                            'owner': 'id_user_334',
                            'editors': ['id_user_334'],
                            'text': 'Neque consequatur sint est.',
                            'role': 'con',
                            'posted': '2017-04-09T06:56:55.988Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_1455': {
            'total': {'votes': {'yes': 32, 'no': 24}, 'comments': {'pro': 5, 'con': 5, 'neutral': 2}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 4, 'no': 1},
                    'comments': {'pro': 2, 'con': 1, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 5, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 1, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 6, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_108': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_1520',
                    'owner': 'id_user_280',
                    'editors': ['id_user_280'],
                    'text': 'Nam adipisci praesentium eos enim nam asperiores enim illum cupiditate.',
                    'role': 'pro',
                    'posted': '2017-04-08T08:48:03.376Z',
                    'userDistrict': 'id_district_101',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_1513',
                    'owner': 'id_user_331',
                    'editors': ['id_user_331'],
                    'text': 'Aut enim tempora non aut.',
                    'role': 'con',
                    'posted': '2017-03-30T05:56:02.952Z',
                    'userDistrict': 'id_district_101',
                    'votes': {'up': 2, 'down': 1}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_1520',
                            'owner': 'id_user_280',
                            'editors': ['id_user_280'],
                            'text': 'Nam adipisci praesentium eos enim nam asperiores enim illum cupiditate.',
                            'role': 'pro',
                            'posted': '2017-04-08T08:48:03.376Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1513',
                            'owner': 'id_user_331',
                            'editors': ['id_user_331'],
                            'text': 'Aut enim tempora non aut.',
                            'role': 'con',
                            'posted': '2017-03-30T05:56:02.952Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 2, 'down': 1}
                        }
                    },
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_1521',
                            'owner': 'id_user_293',
                            'editors': ['id_user_293'],
                            'text': 'Vitae dolore dolore.',
                            'role': 'pro',
                            'posted': '2017-03-31T22:49:14.801Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1514',
                            'owner': 'id_user_373',
                            'editors': ['id_user_373'],
                            'text': 'Recusandae voluptatem ex et laboriosam consequuntur.',
                            'role': 'con',
                            'posted': '2017-04-03T18:00:28.404Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 1, 'down': 1}
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_1519',
                            'owner': 'id_user_359',
                            'editors': ['id_user_359'],
                            'text': 'Quas ad tenetur harum.',
                            'role': 'pro',
                            'posted': '2017-04-06T00:12:00.750Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1516',
                            'owner': 'id_user_496',
                            'editors': ['id_user_496'],
                            'text': 'Quo quia omnis.',
                            'role': 'con',
                            'posted': '2017-04-02T13:36:52.133Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_1518',
                            'owner': 'id_user_311',
                            'editors': ['id_user_311'],
                            'text': 'Vitae accusantium est sit aut reprehenderit totam nam qui.',
                            'role': 'pro',
                            'posted': '2017-04-10T21:20:21.532Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1522',
                            'owner': 'id_user_334',
                            'editors': ['id_user_334'],
                            'text': 'Dolores rerum sapiente laborum sint asperiores iste in quia officiis.',
                            'role': 'con',
                            'posted': '2017-04-07T12:03:21.575Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 1}
                        }
                    }
                }
            }
        },
        'id_item_1524': {
            'total': {'votes': {'yes': 36, 'no': 28}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 4, 'no': 0},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 1, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 4, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 3, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 6, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 1, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 5, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 5, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': null,
                'con': null,
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_1589': {
            'total': {'votes': {'yes': 11, 'no': 5}, 'comments': {'pro': 11, 'con': 19, 'neutral': 13}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 0},
                    'comments': {'pro': 0, 'con': 1, 'neutral': 3}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 0, 'con': 2, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 2, 'neutral': 2}},
                'id_district_105': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 1, 'con': 2, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 2, 'con': 1, 'neutral': 2}},
                'id_district_107': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 2, 'con': 1, 'neutral': 2}},
                'id_district_109': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 2, 'con': 2, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 3, 'con': 2, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_1641',
                    'owner': 'id_user_286',
                    'editors': ['id_user_286'],
                    'text': 'Unde suscipit qui ullam molestias amet itaque omnis consequatur.',
                    'role': 'pro',
                    'posted': '2017-04-05T15:32:36.241Z',
                    'userDistrict': 'id_district_105',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_1610',
                    'owner': 'id_user_320',
                    'editors': ['id_user_320'],
                    'text': 'Asperiores et ratione tenetur.',
                    'role': 'con',
                    'posted': '2017-04-08T13:30:29.849Z',
                    'userDistrict': null,
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1611',
                            'owner': 'id_user_484',
                            'editors': ['id_user_484'],
                            'text': 'Unde consectetur vero pariatur sit.',
                            'role': 'con',
                            'posted': '2017-04-12T07:50:30.466Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1619',
                            'owner': 'id_user_197',
                            'editors': ['id_user_197'],
                            'text': 'Occaecati aut libero dolore reiciendis est repellendus ratione est.',
                            'role': 'con',
                            'posted': '2017-03-31T08:58:45.732Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1637',
                            'owner': 'id_user_421',
                            'editors': ['id_user_421'],
                            'text': 'Aut cupiditate voluptas minima non.',
                            'role': 'con',
                            'posted': '2017-04-09T03:59:24.712Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1607',
                            'owner': 'id_user_312',
                            'editors': ['id_user_312'],
                            'text': 'Quasi mollitia at ullam eum molestias et maiores.',
                            'role': 'con',
                            'posted': '2017-04-11T15:46:16.922Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_1641',
                            'owner': 'id_user_286',
                            'editors': ['id_user_286'],
                            'text': 'Unde suscipit qui ullam molestias amet itaque omnis consequatur.',
                            'role': 'pro',
                            'posted': '2017-04-05T15:32:36.241Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1609',
                            'owner': 'id_user_285',
                            'editors': ['id_user_285'],
                            'text': 'Laborum est earum dicta excepturi velit voluptatem sit.',
                            'role': 'con',
                            'posted': '2017-04-10T03:55:10.286Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_1631',
                            'owner': 'id_user_119',
                            'editors': ['id_user_119'],
                            'text': 'Quo voluptas odit odit nulla eligendi minus.',
                            'role': 'pro',
                            'posted': '2017-04-12T19:41:12.168Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1612',
                            'owner': 'id_user_330',
                            'editors': ['id_user_330'],
                            'text': 'Veniam molestias suscipit.',
                            'role': 'con',
                            'posted': '2017-03-31T15:47:06.640Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1632',
                            'owner': 'id_user_151',
                            'editors': ['id_user_151'],
                            'text': 'Accusantium repellat alias delectus perspiciatis est sit magni.',
                            'role': 'con',
                            'posted': '2017-04-03T02:57:05.961Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_1616',
                            'owner': 'id_user_190',
                            'editors': ['id_user_190'],
                            'text': 'Dolorem ut ullam mollitia est.',
                            'role': 'pro',
                            'posted': '2017-04-02T22:20:23.680Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1615',
                            'owner': 'id_user_272',
                            'editors': ['id_user_272'],
                            'text': 'Voluptatem assumenda earum eveniet ut nihil nulla inventore doloribus.',
                            'role': 'con',
                            'posted': '2017-04-11T20:54:31.262Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_1630',
                            'owner': 'id_user_506',
                            'editors': ['id_user_506'],
                            'text': 'Provident quos quo esse et mollitia ad aut quaerat ea.',
                            'role': 'pro',
                            'posted': '2017-04-03T07:42:42.800Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1635',
                            'owner': 'id_user_307',
                            'editors': ['id_user_307'],
                            'text': 'Molestiae laborum totam labore dignissimos aut molestias non id dolorem.',
                            'role': 'con',
                            'posted': '2017-04-09T01:11:07.266Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_1617',
                            'owner': 'id_user_127',
                            'editors': ['id_user_127'],
                            'text': 'Vero nisi et.',
                            'role': 'pro',
                            'posted': '2017-04-01T02:36:42.923Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1626',
                            'owner': 'id_user_309',
                            'editors': ['id_user_309'],
                            'text': 'Alias harum et quos enim voluptas deserunt repudiandae impedit.',
                            'role': 'con',
                            'posted': '2017-04-10T18:04:33.585Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_1649': {
            'total': {'votes': {'yes': 49, 'no': 47}, 'comments': {'pro': 5, 'con': 3, 'neutral': 1}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 1},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 5, 'no': 7}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 6, 'no': 4}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 6, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 7, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 4, 'no': 7}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 7, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 2, 'no': 7}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 2, 'no': 8}, 'comments': {'pro': 2, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 5, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_1754',
                    'owner': 'id_user_289',
                    'editors': ['id_user_289'],
                    'text': 'Quia aut velit et.',
                    'role': 'pro',
                    'posted': '2017-03-31T16:30:36.856Z',
                    'userDistrict': 'id_district_102',
                    'votes': {'up': 2, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_1748',
                    'owner': 'id_user_230',
                    'editors': ['id_user_230'],
                    'text': 'Pariatur error maiores enim.',
                    'role': 'con',
                    'posted': '2017-04-04T22:08:34.655Z',
                    'userDistrict': 'id_district_108',
                    'votes': {'up': 0, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_1754',
                            'owner': 'id_user_289',
                            'editors': ['id_user_289'],
                            'text': 'Quia aut velit et.',
                            'role': 'pro',
                            'posted': '2017-03-31T16:30:36.856Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 2, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1751',
                            'owner': 'id_user_138',
                            'editors': ['id_user_138'],
                            'text': 'Voluptatum porro provident officia officia minus voluptatem suscipit.',
                            'role': 'con',
                            'posted': '2017-04-06T05:48:30.052Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 2}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_1747',
                            'owner': 'id_user_120',
                            'editors': ['id_user_120'],
                            'text': 'Quia debitis non voluptate doloremque et est odio.',
                            'role': 'pro',
                            'posted': '2017-04-06T19:41:19.046Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1748',
                            'owner': 'id_user_230',
                            'editors': ['id_user_230'],
                            'text': 'Pariatur error maiores enim.',
                            'role': 'con',
                            'posted': '2017-04-04T22:08:34.655Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_1746',
                            'owner': 'id_user_447',
                            'editors': ['id_user_447'],
                            'text': 'Repellendus omnis possimus corrupti quasi.',
                            'role': 'pro',
                            'posted': '2017-03-31T10:34:48.831Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_1755': {
            'total': {'votes': {'yes': 29, 'no': 40}, 'comments': {'pro': 18, 'con': 20, 'neutral': 12}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 5, 'no': 3},
                    'comments': {'pro': 1, 'con': 1, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 1, 'no': 3}, 'comments': {'pro': 2, 'con': 1, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 4, 'no': 2}, 'comments': {'pro': 3, 'con': 1, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 2, 'con': 1, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 4, 'no': 0}, 'comments': {'pro': 0, 'con': 1, 'neutral': 2}},
                'id_district_106': {'votes': {'yes': 2, 'no': 4}, 'comments': {'pro': 0, 'con': 3, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 2}},
                'id_district_108': {'votes': {'yes': 1, 'no': 7}, 'comments': {'pro': 1, 'con': 3, 'neutral': 2}},
                'id_district_109': {'votes': {'yes': 2, 'no': 7}, 'comments': {'pro': 0, 'con': 5, 'neutral': 1}},
                'id_district_110': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 2, 'con': 1, 'neutral': 3}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_1846',
                    'owner': 'id_user_491',
                    'editors': ['id_user_491'],
                    'text': 'Dolorem non sed molestiae impedit.',
                    'role': 'pro',
                    'posted': '2017-04-08T22:42:30.520Z',
                    'userDistrict': null,
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_1858',
                    'owner': 'id_user_377',
                    'editors': ['id_user_377'],
                    'text': 'Autem ad commodi sequi quidem voluptatem.',
                    'role': 'con',
                    'posted': '2017-04-10T14:46:09.699Z',
                    'userDistrict': 'id_district_106',
                    'votes': {'up': 2, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_1845',
                            'owner': 'id_user_461',
                            'editors': ['id_user_461'],
                            'text': 'Et soluta nostrum est laudantium molestiae laudantium ab fugiat.',
                            'role': 'pro',
                            'posted': '2017-04-08T19:54:16.463Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1866',
                            'owner': 'id_user_362',
                            'editors': ['id_user_362'],
                            'text': 'Ut molestias neque voluptatum doloremque quo expedita voluptatum.',
                            'role': 'con',
                            'posted': '2017-04-02T20:42:04.551Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_1830',
                            'owner': 'id_user_482',
                            'editors': ['id_user_482'],
                            'text': 'Cum repudiandae suscipit eos doloremque excepturi quia et cum.',
                            'role': 'pro',
                            'posted': '2017-04-09T02:29:11.326Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1870',
                            'owner': 'id_user_508',
                            'editors': ['id_user_508'],
                            'text': 'Impedit dignissimos aut neque explicabo aut.',
                            'role': 'con',
                            'posted': '2017-04-01T07:41:44.541Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_1840',
                            'owner': 'id_user_389',
                            'editors': ['id_user_389'],
                            'text': 'Nesciunt commodi maiores aut reiciendis aut reiciendis velit.',
                            'role': 'pro',
                            'posted': '2017-04-12T04:31:03.731Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1856',
                            'owner': 'id_user_194',
                            'editors': ['id_user_194'],
                            'text': 'Et nam eos.',
                            'role': 'con',
                            'posted': '2017-04-02T23:44:40.429Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_1859',
                            'owner': 'id_user_327',
                            'editors': ['id_user_327'],
                            'text': 'Vitae omnis odio eos esse eligendi aut distinctio quis ad.',
                            'role': 'pro',
                            'posted': '2017-04-12T12:15:33.793Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1827',
                            'owner': 'id_user_135',
                            'editors': ['id_user_135'],
                            'text': 'Ullam mollitia magni ut.',
                            'role': 'con',
                            'posted': '2017-03-30T16:42:01.716Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1851',
                            'owner': 'id_user_185',
                            'editors': ['id_user_185'],
                            'text': 'Dolor ut qui exercitationem expedita perferendis dolor sint ut.',
                            'role': 'con',
                            'posted': '2017-04-06T14:43:31.388Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1858',
                            'owner': 'id_user_377',
                            'editors': ['id_user_377'],
                            'text': 'Autem ad commodi sequi quidem voluptatem.',
                            'role': 'con',
                            'posted': '2017-04-10T14:46:09.699Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 2, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_1873',
                            'owner': 'id_user_151',
                            'editors': ['id_user_151'],
                            'text': 'Suscipit accusantium voluptatem natus repudiandae.',
                            'role': 'pro',
                            'posted': '2017-04-03T20:01:59.408Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1839',
                            'owner': 'id_user_445',
                            'editors': ['id_user_445'],
                            'text': 'Dicta quo est minus.',
                            'role': 'con',
                            'posted': '2017-04-08T17:22:37.771Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_1826',
                            'owner': 'id_user_177',
                            'editors': ['id_user_177'],
                            'text': 'Delectus molestiae non est.',
                            'role': 'pro',
                            'posted': '2017-04-03T08:38:38.000Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 1}
                        },
                        'con': {
                            'id': 'id_comment_1864',
                            'owner': 'id_user_190',
                            'editors': ['id_user_190'],
                            'text': 'Provident dolore temporibus facilis vitae et tenetur id.',
                            'role': 'con',
                            'posted': '2017-04-07T15:17:32.158Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1837',
                            'owner': 'id_user_478',
                            'editors': ['id_user_478'],
                            'text': 'Voluptatem aut corrupti.',
                            'role': 'con',
                            'posted': '2017-04-07T20:30:14.700Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_1847',
                            'owner': 'id_user_314',
                            'editors': ['id_user_314'],
                            'text': 'Quia est repellendus.',
                            'role': 'pro',
                            'posted': '2017-04-06T09:28:37.285Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_1867',
                            'owner': 'id_user_156',
                            'editors': ['id_user_156'],
                            'text': 'Aliquid ut nulla perspiciatis itaque doloremque ratione cumque.',
                            'role': 'con',
                            'posted': '2017-04-03T05:20:08.425Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_1875': {
            'total': {'votes': {'yes': 40, 'no': 32}, 'comments': {'pro': 2, 'con': 1, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 1},
                    'comments': {'pro': 1, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 1, 'no': 7}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 6, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 9, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 6, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_1948',
                    'owner': 'id_user_160',
                    'editors': ['id_user_160'],
                    'text': 'Sit ut exercitationem voluptatem sunt ipsam nisi voluptas aut non.',
                    'role': 'pro',
                    'posted': '2017-03-30T14:56:31.519Z',
                    'userDistrict': 'id_district_103',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_1950',
                    'owner': 'id_user_374',
                    'editors': ['id_user_374'],
                    'text': 'Vitae veniam placeat voluptates.',
                    'role': 'con',
                    'posted': '2017-04-11T16:03:41.587Z',
                    'userDistrict': 'id_district_104',
                    'votes': {'up': 2, 'down': 3}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_1949',
                            'owner': 'id_user_184',
                            'editors': ['id_user_184'],
                            'text': 'Ea facere in excepturi ducimus dolor ipsa eveniet.',
                            'role': 'pro',
                            'posted': '2017-04-04T17:45:42.971Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_1948',
                            'owner': 'id_user_160',
                            'editors': ['id_user_160'],
                            'text': 'Sit ut exercitationem voluptatem sunt ipsam nisi voluptas aut non.',
                            'role': 'pro',
                            'posted': '2017-03-30T14:56:31.519Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1950',
                            'owner': 'id_user_374',
                            'editors': ['id_user_374'],
                            'text': 'Vitae veniam placeat voluptates.',
                            'role': 'con',
                            'posted': '2017-04-11T16:03:41.587Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 2, 'down': 3}
                        }
                    },
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_1951': {
            'total': {'votes': {'yes': 15, 'no': 10}, 'comments': {'pro': 6, 'con': 3, 'neutral': 1}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 1, 'no': 1},
                    'comments': {'pro': 1, 'con': 1, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 5, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_1979',
                    'owner': 'id_user_149',
                    'editors': ['id_user_149'],
                    'text': 'Assumenda iste rerum adipisci quasi.',
                    'role': 'pro',
                    'posted': '2017-04-02T07:35:35.434Z',
                    'userDistrict': 'id_district_105',
                    'votes': {'up': 2, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_1981',
                    'owner': 'id_user_140',
                    'editors': ['id_user_140'],
                    'text': 'Accusamus reprehenderit et fugit qui et quibusdam ullam quisquam.',
                    'role': 'con',
                    'posted': '2017-04-05T10:54:57.146Z',
                    'userDistrict': 'id_district_106',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_1983',
                            'owner': 'id_user_133',
                            'editors': ['id_user_133'],
                            'text': 'Occaecati ut culpa perferendis aspernatur assumenda hic distinctio.',
                            'role': 'pro',
                            'posted': '2017-04-05T23:53:01.838Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 1}
                        },
                        'con': {
                            'id': 'id_comment_1985',
                            'owner': 'id_user_499',
                            'editors': ['id_user_499'],
                            'text': 'Aut error cupiditate provident.',
                            'role': 'con',
                            'posted': '2017-03-30T16:59:56.366Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 1}
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_1984',
                            'owner': 'id_user_216',
                            'editors': ['id_user_216'],
                            'text': 'Incidunt occaecati et molestiae porro quae distinctio minus odit.',
                            'role': 'pro',
                            'posted': '2017-04-07T19:20:53.988Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 1, 'down': 1}
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_1986',
                            'owner': 'id_user_369',
                            'editors': ['id_user_369'],
                            'text': 'Nulla laudantium vero eum laborum ea natus.',
                            'role': 'pro',
                            'posted': '2017-04-06T15:45:03.704Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_1978',
                            'owner': 'id_user_229',
                            'editors': ['id_user_229'],
                            'text': 'In sapiente amet corporis voluptate illum ut velit adipisci doloribus.',
                            'role': 'pro',
                            'posted': '2017-04-07T16:31:38.908Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_1979',
                            'owner': 'id_user_149',
                            'editors': ['id_user_149'],
                            'text': 'Assumenda iste rerum adipisci quasi.',
                            'role': 'pro',
                            'posted': '2017-04-02T07:35:35.434Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 2, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1981',
                            'owner': 'id_user_140',
                            'editors': ['id_user_140'],
                            'text': 'Accusamus reprehenderit et fugit qui et quibusdam ullam quisquam.',
                            'role': 'con',
                            'posted': '2017-04-05T10:54:57.146Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1982',
                            'owner': 'id_user_270',
                            'editors': ['id_user_270'],
                            'text': 'Inventore a sint.',
                            'role': 'con',
                            'posted': '2017-04-09T07:06:23.958Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_1987': {
            'total': {'votes': {'yes': 18, 'no': 12}, 'comments': {'pro': 8, 'con': 5, 'neutral': 3}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 0},
                    'comments': {'pro': 0, 'con': 1, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 1, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 6, 'no': 0}, 'comments': {'pro': 2, 'con': 1, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}},
                'id_district_108': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2027',
                    'owner': 'id_user_264',
                    'editors': ['id_user_264'],
                    'text': 'Molestiae nostrum maiores et omnis maxime aut temporibus aut.',
                    'role': 'pro',
                    'posted': '2017-04-09T00:55:23.003Z',
                    'userDistrict': 'id_district_107',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_2018',
                    'owner': 'id_user_358',
                    'editors': ['id_user_358'],
                    'text': 'Optio earum id aut et ab odit distinctio.',
                    'role': 'con',
                    'posted': '2017-04-12T07:21:08.502Z',
                    'userDistrict': 'id_district_106',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2032',
                            'owner': 'id_user_205',
                            'editors': ['id_user_205'],
                            'text': 'Pariatur facere ut ipsam voluptate quasi.',
                            'role': 'con',
                            'posted': '2017-03-31T20:13:34.519Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_2020',
                            'owner': 'id_user_194',
                            'editors': ['id_user_194'],
                            'text': 'Aut ea nesciunt corrupti.',
                            'role': 'pro',
                            'posted': '2017-04-12T09:54:16.526Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2025',
                            'owner': 'id_user_124',
                            'editors': ['id_user_124'],
                            'text': 'Facilis eaque laborum.',
                            'role': 'con',
                            'posted': '2017-03-31T14:22:23.050Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_2021',
                            'owner': 'id_user_505',
                            'editors': ['id_user_505'],
                            'text': 'Neque id similique ullam laborum iste perferendis odio pariatur inventore.',
                            'role': 'pro',
                            'posted': '2017-04-05T02:50:59.801Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_2033',
                            'owner': 'id_user_203',
                            'editors': ['id_user_203'],
                            'text': 'Aliquid dolores commodi consequatur at in reiciendis ad.',
                            'role': 'pro',
                            'posted': '2017-03-31T16:30:54.858Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2018',
                            'owner': 'id_user_358',
                            'editors': ['id_user_358'],
                            'text': 'Optio earum id aut et ab odit distinctio.',
                            'role': 'con',
                            'posted': '2017-04-12T07:21:08.502Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_2027',
                            'owner': 'id_user_264',
                            'editors': ['id_user_264'],
                            'text': 'Molestiae nostrum maiores et omnis maxime aut temporibus aut.',
                            'role': 'pro',
                            'posted': '2017-04-09T00:55:23.003Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_2026',
                            'owner': 'id_user_262',
                            'editors': ['id_user_262'],
                            'text': 'Ut occaecati vel tenetur autem possimus odio debitis cumque aut.',
                            'role': 'pro',
                            'posted': '2017-04-04T18:56:17.662Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_2024',
                            'owner': 'id_user_210',
                            'editors': ['id_user_210'],
                            'text': 'Necessitatibus aliquid ut ab aliquid et est est.',
                            'role': 'pro',
                            'posted': '2017-04-02T14:20:40.024Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2031',
                            'owner': 'id_user_145',
                            'editors': ['id_user_145'],
                            'text': 'Nam sequi animi ex vel qui tenetur a incidunt nam.',
                            'role': 'con',
                            'posted': '2017-04-03T05:07:27.376Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_2034': {
            'total': {'votes': {'yes': 51, 'no': 49}, 'comments': {'pro': 4, 'con': 5, 'neutral': 5}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 3, 'no': 0},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 5, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 2}},
                'id_district_103': {'votes': {'yes': 5, 'no': 6}, 'comments': {'pro': 2, 'con': 2, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 6, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 3, 'no': 7}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 7, 'no': 5}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 4, 'no': 10}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 11, 'no': 6}, 'comments': {'pro': 0, 'con': 2, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 3, 'no': 7}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2144',
                    'owner': 'id_user_510',
                    'editors': ['id_user_510'],
                    'text': 'Sit eum magni officia consequatur.',
                    'role': 'pro',
                    'posted': '2017-04-08T20:18:11.948Z',
                    'userDistrict': 'id_district_106',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_2136',
                    'owner': 'id_user_263',
                    'editors': ['id_user_263'],
                    'text': 'Delectus consequatur deleniti mollitia et.',
                    'role': 'con',
                    'posted': '2017-04-11T18:03:24.336Z',
                    'userDistrict': 'id_district_103',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_2138',
                            'owner': 'id_user_124',
                            'editors': ['id_user_124'],
                            'text': 'Iure ut qui quam consequatur nisi iste.',
                            'role': 'pro',
                            'posted': '2017-03-31T20:20:39.043Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2136',
                            'owner': 'id_user_263',
                            'editors': ['id_user_263'],
                            'text': 'Delectus consequatur deleniti mollitia et.',
                            'role': 'con',
                            'posted': '2017-04-11T18:03:24.336Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_2144',
                            'owner': 'id_user_510',
                            'editors': ['id_user_510'],
                            'text': 'Sit eum magni officia consequatur.',
                            'role': 'pro',
                            'posted': '2017-04-08T20:18:11.948Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2141',
                            'owner': 'id_user_437',
                            'editors': ['id_user_437'],
                            'text': 'Consequatur aut est unde commodi nemo excepturi asperiores.',
                            'role': 'con',
                            'posted': '2017-04-08T07:38:15.432Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2139',
                            'owner': 'id_user_236',
                            'editors': ['id_user_236'],
                            'text': 'Est sed quia id velit quo optio magni.',
                            'role': 'con',
                            'posted': '2017-04-11T00:57:11.727Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_2149': {
            'total': {'votes': {'yes': 8, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 0, 'no': 0},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': null,
                'con': null,
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_2163': {
            'total': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 6, 'con': 5, 'neutral': 8}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 0, 'no': 0},
                    'comments': {'pro': 0, 'con': 2, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}},
                'id_district_108': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 1, 'con': 0, 'neutral': 2}},
                'id_district_110': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 2, 'con': 1, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2171',
                    'owner': 'id_user_488',
                    'editors': ['id_user_488'],
                    'text': 'Eius modi nam aut omnis quia blanditiis aliquam.',
                    'role': 'pro',
                    'posted': '2017-04-02T16:42:38.817Z',
                    'userDistrict': 'id_district_110',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_2177',
                    'owner': 'id_user_325',
                    'editors': ['id_user_325'],
                    'text': 'Non magnam mollitia ullam.',
                    'role': 'con',
                    'posted': '2017-04-02T02:02:54.147Z',
                    'userDistrict': 'id_district_101',
                    'votes': {'up': 0, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2177',
                            'owner': 'id_user_325',
                            'editors': ['id_user_325'],
                            'text': 'Non magnam mollitia ullam.',
                            'role': 'con',
                            'posted': '2017-04-02T02:02:54.147Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_2169',
                            'owner': 'id_user_431',
                            'editors': ['id_user_431'],
                            'text': 'Aut consequatur rem aut.',
                            'role': 'pro',
                            'posted': '2017-04-08T19:15:23.718Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2182',
                            'owner': 'id_user_508',
                            'editors': ['id_user_508'],
                            'text': 'Illum dolores libero consequuntur totam aperiam quasi possimus.',
                            'role': 'con',
                            'posted': '2017-04-09T20:57:27.888Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_2172',
                            'owner': 'id_user_340',
                            'editors': ['id_user_340'],
                            'text': 'Aut nihil dolorem esse quas ea et nesciunt quis non.',
                            'role': 'pro',
                            'posted': '2017-04-11T02:42:05.902Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_2173',
                            'owner': 'id_user_436',
                            'editors': ['id_user_436'],
                            'text': 'Ipsum aut sint ut quis est et sit rerum at.',
                            'role': 'pro',
                            'posted': '2017-04-05T07:22:56.209Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2183',
                            'owner': 'id_user_148',
                            'editors': ['id_user_148'],
                            'text': 'Ea ea recusandae quasi.',
                            'role': 'con',
                            'posted': '2017-04-06T21:47:10.143Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_2180',
                            'owner': 'id_user_296',
                            'editors': ['id_user_296'],
                            'text': 'A fugiat dolores voluptate nostrum.',
                            'role': 'pro',
                            'posted': '2017-04-11T15:39:14.041Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 1}
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_2171',
                            'owner': 'id_user_488',
                            'editors': ['id_user_488'],
                            'text': 'Eius modi nam aut omnis quia blanditiis aliquam.',
                            'role': 'pro',
                            'posted': '2017-04-02T16:42:38.817Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2175',
                            'owner': 'id_user_398',
                            'editors': ['id_user_398'],
                            'text': 'Qui accusamus sed.',
                            'role': 'con',
                            'posted': '2017-04-04T15:19:30.575Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 1}
                        }
                    }
                }
            }
        },
        'id_item_2186': {
            'total': {'votes': {'yes': 32, 'no': 19}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 2},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 4, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 6, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 4, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2238',
                    'owner': 'id_user_378',
                    'editors': ['id_user_378'],
                    'text': 'Ut rerum quia excepturi quia sunt nihil tempore.',
                    'role': 'pro',
                    'posted': '2017-04-12T16:28:26.817Z',
                    'userDistrict': 'id_district_103',
                    'votes': {'up': 5, 'down': 8}
                },
                'con': null,
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_2238',
                            'owner': 'id_user_378',
                            'editors': ['id_user_378'],
                            'text': 'Ut rerum quia excepturi quia sunt nihil tempore.',
                            'role': 'pro',
                            'posted': '2017-04-12T16:28:26.817Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 5, 'down': 8}
                        }, 'con': null
                    },
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_2239': {
            'total': {'votes': {'yes': 8, 'no': 5}, 'comments': {'pro': 17, 'con': 8, 'neutral': 8}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 0, 'no': 0},
                    'comments': {'pro': 2, 'con': 1, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 3, 'con': 2, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_105': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 4, 'con': 0, 'neutral': 1}},
                'id_district_106': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 3, 'con': 0, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 1, 'con': 1, 'neutral': 2}},
                'id_district_109': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 3, 'con': 1, 'neutral': 1}},
                'id_district_110': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2285',
                    'owner': 'id_user_314',
                    'editors': ['id_user_314'],
                    'text': 'Pariatur repudiandae quia voluptatem.',
                    'role': 'pro',
                    'posted': '2017-04-02T10:44:26.866Z',
                    'userDistrict': 'id_district_110',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_2265',
                    'owner': 'id_user_430',
                    'editors': ['id_user_430'],
                    'text': 'Et consequuntur quo.',
                    'role': 'con',
                    'posted': '2017-04-07T18:36:07.299Z',
                    'userDistrict': 'id_district_103',
                    'votes': {'up': 0, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_2255',
                            'owner': 'id_user_125',
                            'editors': ['id_user_125'],
                            'text': 'Saepe sequi est ea aut ratione nesciunt sint facilis.',
                            'role': 'pro',
                            'posted': '2017-03-30T21:20:29.136Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2276',
                            'owner': 'id_user_133',
                            'editors': ['id_user_133'],
                            'text': 'Et facere voluptate voluptatem labore qui asperiores sed unde.',
                            'role': 'con',
                            'posted': '2017-04-03T08:25:00.452Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2281',
                            'owner': 'id_user_301',
                            'editors': ['id_user_301'],
                            'text': 'Laborum minima in reprehenderit id.',
                            'role': 'con',
                            'posted': '2017-04-07T03:06:34.608Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_2258',
                            'owner': 'id_user_180',
                            'editors': ['id_user_180'],
                            'text': 'Unde rerum natus sunt eligendi magnam aperiam.',
                            'role': 'pro',
                            'posted': '2017-04-07T00:30:11.696Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2265',
                            'owner': 'id_user_430',
                            'editors': ['id_user_430'],
                            'text': 'Et consequuntur quo.',
                            'role': 'con',
                            'posted': '2017-04-07T18:36:07.299Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2275',
                            'owner': 'id_user_176',
                            'editors': ['id_user_176'],
                            'text': 'Nesciunt aut accusamus velit illo.',
                            'role': 'con',
                            'posted': '2017-03-30T14:09:25.296Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_2262',
                            'owner': 'id_user_199',
                            'editors': ['id_user_199'],
                            'text': 'Molestiae in delectus nesciunt sed vitae et aperiam.',
                            'role': 'pro',
                            'posted': '2017-04-01T08:24:10.238Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_2263',
                            'owner': 'id_user_195',
                            'editors': ['id_user_195'],
                            'text': 'Reprehenderit voluptatem consectetur voluptatem deserunt.',
                            'role': 'pro',
                            'posted': '2017-04-10T19:30:18.821Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2284',
                            'owner': 'id_user_198',
                            'editors': ['id_user_198'],
                            'text': 'Sed nostrum qui reprehenderit iste natus.',
                            'role': 'con',
                            'posted': '2017-04-02T20:21:48.899Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_2254',
                            'owner': 'id_user_209',
                            'editors': ['id_user_209'],
                            'text': 'Rerum esse aut ipsam nobis nostrum quam veniam facere dolorem.',
                            'role': 'pro',
                            'posted': '2017-04-10T09:21:52.013Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2271',
                            'owner': 'id_user_456',
                            'editors': ['id_user_456'],
                            'text': 'Quia sapiente adipisci sunt odit iure eaque esse.',
                            'role': 'con',
                            'posted': '2017-04-07T22:12:05.383Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_2257',
                            'owner': 'id_user_174',
                            'editors': ['id_user_174'],
                            'text': 'Fuga voluptas quia minima nesciunt sit enim sed iure.',
                            'role': 'pro',
                            'posted': '2017-04-11T11:46:53.366Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2269',
                            'owner': 'id_user_350',
                            'editors': ['id_user_350'],
                            'text': 'Officiis quia nobis quo sed dignissimos est ducimus.',
                            'role': 'con',
                            'posted': '2017-04-06T02:39:13.060Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_2285',
                            'owner': 'id_user_314',
                            'editors': ['id_user_314'],
                            'text': 'Pariatur repudiandae quia voluptatem.',
                            'role': 'pro',
                            'posted': '2017-04-02T10:44:26.866Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_2286': {
            'total': {'votes': {'yes': 27, 'no': 17}, 'comments': {'pro': 17, 'con': 15, 'neutral': 13}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 0},
                    'comments': {'pro': 1, 'con': 1, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 1, 'con': 3, 'neutral': 2}},
                'id_district_103': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 1, 'con': 3, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 6, 'no': 1}, 'comments': {'pro': 2, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 2, 'con': 1, 'neutral': 2}},
                'id_district_106': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 1, 'con': 2, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 1, 'con': 2, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 4, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 3, 'no': 1}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_110': {'votes': {'yes': 2, 'no': 4}, 'comments': {'pro': 1, 'con': 0, 'neutral': 4}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2370',
                    'owner': 'id_user_501',
                    'editors': ['id_user_501'],
                    'text': 'Et eos enim magnam.',
                    'role': 'pro',
                    'posted': '2017-04-10T11:26:00.518Z',
                    'userDistrict': 'id_district_104',
                    'votes': {'up': 2, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_2331',
                    'owner': 'id_user_289',
                    'editors': ['id_user_289'],
                    'text': 'Enim sint adipisci natus saepe corrupti mollitia.',
                    'role': 'con',
                    'posted': '2017-04-06T20:57:26.064Z',
                    'userDistrict': 'id_district_102',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_2356',
                            'owner': 'id_user_133',
                            'editors': ['id_user_133'],
                            'text': 'At sunt et accusantium et facilis ex.',
                            'role': 'pro',
                            'posted': '2017-04-08T12:54:56.918Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2374',
                            'owner': 'id_user_232',
                            'editors': ['id_user_232'],
                            'text': 'Accusantium commodi molestiae ut eum error est quasi sed sunt.',
                            'role': 'con',
                            'posted': '2017-03-31T22:27:02.977Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_2349',
                            'owner': 'id_user_290',
                            'editors': ['id_user_290'],
                            'text': 'Vel doloremque labore ad id.',
                            'role': 'pro',
                            'posted': '2017-03-30T15:32:51.053Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2331',
                            'owner': 'id_user_289',
                            'editors': ['id_user_289'],
                            'text': 'Enim sint adipisci natus saepe corrupti mollitia.',
                            'role': 'con',
                            'posted': '2017-04-06T20:57:26.064Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_2352',
                            'owner': 'id_user_163',
                            'editors': ['id_user_163'],
                            'text': 'Ipsum eaque accusamus saepe.',
                            'role': 'pro',
                            'posted': '2017-04-05T03:00:57.944Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2348',
                            'owner': 'id_user_175',
                            'editors': ['id_user_175'],
                            'text': 'Sint ea deleniti similique.',
                            'role': 'con',
                            'posted': '2017-04-10T07:36:35.491Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_2370',
                            'owner': 'id_user_501',
                            'editors': ['id_user_501'],
                            'text': 'Et eos enim magnam.',
                            'role': 'pro',
                            'posted': '2017-04-10T11:26:00.518Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 2, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_2359',
                            'owner': 'id_user_371',
                            'editors': ['id_user_371'],
                            'text': 'Voluptas blanditiis et eos ex omnis sit repellendus rerum corporis.',
                            'role': 'pro',
                            'posted': '2017-04-04T07:16:06.379Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2332',
                            'owner': 'id_user_476',
                            'editors': ['id_user_476'],
                            'text': 'Tempora vel a atque veritatis voluptatibus et quisquam consectetur velit.',
                            'role': 'con',
                            'posted': '2017-04-07T04:12:14.823Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_2367',
                            'owner': 'id_user_202',
                            'editors': ['id_user_202'],
                            'text': 'Quod ut ad placeat quaerat nemo est et molestiae.',
                            'role': 'pro',
                            'posted': '2017-04-12T10:35:42.377Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2350',
                            'owner': 'id_user_213',
                            'editors': ['id_user_213'],
                            'text': 'Architecto non beatae.',
                            'role': 'con',
                            'posted': '2017-03-31T17:55:25.670Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_2333',
                            'owner': 'id_user_152',
                            'editors': ['id_user_152'],
                            'text': 'Voluptatem sint est neque sint.',
                            'role': 'pro',
                            'posted': '2017-04-02T00:20:34.771Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2354',
                            'owner': 'id_user_472',
                            'editors': ['id_user_472'],
                            'text': 'Quia numquam iusto vero asperiores est vitae a.',
                            'role': 'con',
                            'posted': '2017-04-01T16:49:58.866Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_2341',
                            'owner': 'id_user_226',
                            'editors': ['id_user_226'],
                            'text': 'Aut aut id in corrupti nisi aut eaque quidem enim.',
                            'role': 'pro',
                            'posted': '2017-04-02T14:22:05.784Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2372',
                            'owner': 'id_user_226',
                            'editors': ['id_user_226'],
                            'text': 'Voluptas fuga eligendi amet fugit repellat quis animi minima.',
                            'role': 'con',
                            'posted': '2017-04-04T23:40:37.338Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_2343',
                            'owner': 'id_user_417',
                            'editors': ['id_user_417'],
                            'text': 'Tenetur ut quia omnis.',
                            'role': 'pro',
                            'posted': '2017-04-05T10:40:23.618Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2373',
                            'owner': 'id_user_240',
                            'editors': ['id_user_240'],
                            'text': 'Ad dolorem molestias unde qui maxime dolor.',
                            'role': 'con',
                            'posted': '2017-04-07T01:42:12.216Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_2342',
                            'owner': 'id_user_334',
                            'editors': ['id_user_334'],
                            'text': 'Consequuntur eos ea voluptatibus ab ipsum nisi maiores aut.',
                            'role': 'pro',
                            'posted': '2017-04-11T18:14:00.368Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_2376': {
            'total': {'votes': {'yes': 29, 'no': 26}, 'comments': {'pro': 13, 'con': 11, 'neutral': 12}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 1},
                    'comments': {'pro': 1, 'con': 1, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 4, 'no': 2}, 'comments': {'pro': 1, 'con': 0, 'neutral': 2}},
                'id_district_104': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 3, 'con': 1, 'neutral': 3}},
                'id_district_105': {'votes': {'yes': 4, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_106': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 0, 'con': 2, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_108': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 3, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 2, 'con': 1, 'neutral': 2}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2437',
                    'owner': 'id_user_292',
                    'editors': ['id_user_292'],
                    'text': 'Ipsam modi voluptatem qui dolore debitis ullam natus qui.',
                    'role': 'pro',
                    'posted': '2017-04-12T03:59:59.103Z',
                    'userDistrict': 'id_district_108',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_2454',
                    'owner': 'id_user_185',
                    'editors': ['id_user_185'],
                    'text': 'Voluptatem dolor eum accusantium fugiat suscipit consequatur fugiat odio quam.',
                    'role': 'con',
                    'posted': '2017-04-05T11:32:44.454Z',
                    'userDistrict': 'id_district_105',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_2447',
                            'owner': 'id_user_184',
                            'editors': ['id_user_184'],
                            'text': 'Unde molestiae aut et.',
                            'role': 'pro',
                            'posted': '2017-04-05T23:41:31.965Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2433',
                            'owner': 'id_user_484',
                            'editors': ['id_user_484'],
                            'text': 'Quia qui id.',
                            'role': 'con',
                            'posted': '2017-04-05T12:30:13.270Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2442',
                            'owner': 'id_user_508',
                            'editors': ['id_user_508'],
                            'text': 'Dicta dolor voluptas.',
                            'role': 'con',
                            'posted': '2017-04-08T06:32:32.428Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_2453',
                            'owner': 'id_user_498',
                            'editors': ['id_user_498'],
                            'text': 'Mollitia corporis doloribus ut ducimus nostrum vel expedita.',
                            'role': 'pro',
                            'posted': '2017-04-12T13:48:38.554Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_2446',
                            'owner': 'id_user_312',
                            'editors': ['id_user_312'],
                            'text': 'Sint nesciunt porro.',
                            'role': 'pro',
                            'posted': '2017-04-02T21:42:07.344Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2448',
                            'owner': 'id_user_363',
                            'editors': ['id_user_363'],
                            'text': 'Optio accusamus quia dolor.',
                            'role': 'con',
                            'posted': '2017-04-01T08:24:26.053Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2454',
                            'owner': 'id_user_185',
                            'editors': ['id_user_185'],
                            'text': 'Voluptatem dolor eum accusantium fugiat suscipit consequatur fugiat odio quam.',
                            'role': 'con',
                            'posted': '2017-04-05T11:32:44.454Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2455',
                            'owner': 'id_user_111',
                            'editors': ['id_user_111'],
                            'text': 'Corporis quaerat nemo tempore officiis voluptatem cupiditate neque deserunt et.',
                            'role': 'con',
                            'posted': '2017-04-05T13:39:53.497Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_2437',
                            'owner': 'id_user_292',
                            'editors': ['id_user_292'],
                            'text': 'Ipsam modi voluptatem qui dolore debitis ullam natus qui.',
                            'role': 'pro',
                            'posted': '2017-04-12T03:59:59.103Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2436',
                            'owner': 'id_user_190',
                            'editors': ['id_user_190'],
                            'text': 'Rem similique temporibus quia est tenetur accusantium.',
                            'role': 'con',
                            'posted': '2017-04-05T02:35:17.569Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_2438',
                            'owner': 'id_user_332',
                            'editors': ['id_user_332'],
                            'text': 'Similique possimus cum impedit molestiae autem dignissimos quod quia nostrum.',
                            'role': 'pro',
                            'posted': '2017-04-04T17:42:34.756Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2464',
                            'owner': 'id_user_451',
                            'editors': ['id_user_451'],
                            'text': 'Ut maiores et.',
                            'role': 'con',
                            'posted': '2017-04-12T15:48:55.550Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_2452',
                            'owner': 'id_user_475',
                            'editors': ['id_user_475'],
                            'text': 'Nihil tenetur quidem veniam nihil et hic natus.',
                            'role': 'pro',
                            'posted': '2017-03-30T02:50:44.809Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2460',
                            'owner': 'id_user_258',
                            'editors': ['id_user_258'],
                            'text': 'Officia dolorem et.',
                            'role': 'con',
                            'posted': '2017-04-07T15:02:26.029Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_2468': {
            'total': {'votes': {'yes': 10, 'no': 9}, 'comments': {'pro': 8, 'con': 4, 'neutral': 11}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 1, 'no': 0},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 3, 'no': 0}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}},
                'id_district_106': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 3}},
                'id_district_107': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_108': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 3}},
                'id_district_110': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2498',
                    'owner': 'id_user_313',
                    'editors': ['id_user_313'],
                    'text': 'Nesciunt quasi est culpa dolorem reprehenderit est et.',
                    'role': 'pro',
                    'posted': '2017-04-12T08:54:31.426Z',
                    'userDistrict': null,
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_2489',
                    'owner': 'id_user_117',
                    'editors': ['id_user_117'],
                    'text': 'Est quibusdam sequi.',
                    'role': 'con',
                    'posted': '2017-04-10T01:14:28.201Z',
                    'userDistrict': 'id_district_104',
                    'votes': {'up': 0, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_2506',
                            'owner': 'id_user_459',
                            'editors': ['id_user_459'],
                            'text': 'Nobis culpa ut voluptatem enim nisi.',
                            'role': 'pro',
                            'posted': '2017-04-09T17:42:11.488Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_2493',
                            'owner': 'id_user_242',
                            'editors': ['id_user_242'],
                            'text': 'Qui voluptatem consectetur modi iusto veritatis autem dolorem voluptatem quam.',
                            'role': 'pro',
                            'posted': '2017-04-11T02:54:32.515Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2504',
                            'owner': 'id_user_378',
                            'editors': ['id_user_378'],
                            'text': 'Ut ipsa distinctio ea.',
                            'role': 'con',
                            'posted': '2017-04-10T12:17:32.001Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2489',
                            'owner': 'id_user_117',
                            'editors': ['id_user_117'],
                            'text': 'Est quibusdam sequi.',
                            'role': 'con',
                            'posted': '2017-04-10T01:14:28.201Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_2494',
                            'owner': 'id_user_164',
                            'editors': ['id_user_164'],
                            'text': 'Praesentium magnam id accusamus reiciendis dolores.',
                            'role': 'pro',
                            'posted': '2017-04-08T13:01:54.449Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_2501',
                            'owner': 'id_user_322',
                            'editors': ['id_user_322'],
                            'text': 'Non quidem at esse veniam.',
                            'role': 'pro',
                            'posted': '2017-04-12T02:30:18.343Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 1}
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_2502',
                            'owner': 'id_user_437',
                            'editors': ['id_user_437'],
                            'text': 'Aspernatur et dolores eligendi aspernatur excepturi et veniam.',
                            'role': 'pro',
                            'posted': '2017-04-09T12:25:20.320Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2503',
                            'owner': 'id_user_422',
                            'editors': ['id_user_422'],
                            'text': 'Illum aut dicta.',
                            'role': 'con',
                            'posted': '2017-04-02T06:08:00.414Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_2495',
                            'owner': 'id_user_302',
                            'editors': ['id_user_302'],
                            'text': 'Voluptate placeat deserunt sint voluptas.',
                            'role': 'pro',
                            'posted': '2017-03-30T16:03:39.011Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2508',
                            'owner': 'id_user_326',
                            'editors': ['id_user_326'],
                            'text': 'Ea et ipsam repellat excepturi maxime ratione debitis ut impedit.',
                            'role': 'con',
                            'posted': '2017-04-07T23:23:38.250Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_2511': {
            'total': {'votes': {'yes': 23, 'no': 23}, 'comments': {'pro': 12, 'con': 18, 'neutral': 15}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 3, 'no': 1},
                    'comments': {'pro': 3, 'con': 2, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 3, 'no': 0}, 'comments': {'pro': 0, 'con': 1, 'neutral': 2}},
                'id_district_103': {'votes': {'yes': 1, 'no': 5}, 'comments': {'pro': 1, 'con': 3, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 0, 'con': 2, 'neutral': 1}},
                'id_district_105': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_106': {'votes': {'yes': 0, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 4, 'con': 3, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 0, 'con': 1, 'neutral': 2}},
                'id_district_109': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 3, 'neutral': 1}},
                'id_district_110': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 1, 'con': 0, 'neutral': 2}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2584',
                    'owner': 'id_user_236',
                    'editors': ['id_user_236'],
                    'text': 'Et totam et iusto eaque distinctio voluptatem aut.',
                    'role': 'pro',
                    'posted': '2017-04-04T12:02:50.502Z',
                    'userDistrict': 'id_district_109',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_2583',
                    'owner': 'id_user_344',
                    'editors': ['id_user_344'],
                    'text': 'Sed consequuntur nisi qui enim et assumenda illo.',
                    'role': 'con',
                    'posted': '2017-04-03T12:55:45.481Z',
                    'userDistrict': 'id_district_108',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_2580',
                            'owner': 'id_user_426',
                            'editors': ['id_user_426'],
                            'text': 'Magni officia est.',
                            'role': 'pro',
                            'posted': '2017-04-11T11:52:49.517Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2600',
                            'owner': 'id_user_248',
                            'editors': ['id_user_248'],
                            'text': 'Est rerum accusamus natus.',
                            'role': 'con',
                            'posted': '2017-04-04T14:58:44.009Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2572',
                            'owner': 'id_user_197',
                            'editors': ['id_user_197'],
                            'text': 'Explicabo est nisi et et voluptas quia recusandae itaque impedit.',
                            'role': 'con',
                            'posted': '2017-04-08T04:22:51.633Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_2596',
                            'owner': 'id_user_357',
                            'editors': ['id_user_357'],
                            'text': 'Fugiat dolor dignissimos libero culpa inventore corporis.',
                            'role': 'pro',
                            'posted': '2017-04-10T17:43:48.156Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2591',
                            'owner': 'id_user_379',
                            'editors': ['id_user_379'],
                            'text': 'Voluptates voluptatum dicta repellat dignissimos.',
                            'role': 'con',
                            'posted': '2017-04-03T22:45:54.797Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2569',
                            'owner': 'id_user_161',
                            'editors': ['id_user_161'],
                            'text': 'Vel voluptatibus ut neque quis culpa labore dolorum.',
                            'role': 'con',
                            'posted': '2017-04-01T18:31:41.379Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_2574',
                            'owner': 'id_user_141',
                            'editors': ['id_user_141'],
                            'text': 'At eum excepturi quo alias et voluptatibus laudantium optio a.',
                            'role': 'pro',
                            'posted': '2017-04-06T19:25:41.449Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2562',
                            'owner': 'id_user_217',
                            'editors': ['id_user_217'],
                            'text': 'Qui exercitationem dolore corporis voluptatum nam sequi non est.',
                            'role': 'con',
                            'posted': '2017-04-04T00:12:01.558Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_2586',
                            'owner': 'id_user_293',
                            'editors': ['id_user_293'],
                            'text': 'Error laudantium debitis et beatae non delectus adipisci fuga.',
                            'role': 'pro',
                            'posted': '2017-04-10T15:43:29.553Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2563',
                            'owner': 'id_user_393',
                            'editors': ['id_user_393'],
                            'text': 'Eaque tempora alias iusto.',
                            'role': 'con',
                            'posted': '2017-04-02T12:55:37.431Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2583',
                            'owner': 'id_user_344',
                            'editors': ['id_user_344'],
                            'text': 'Sed consequuntur nisi qui enim et assumenda illo.',
                            'role': 'con',
                            'posted': '2017-04-03T12:55:45.481Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_2584',
                            'owner': 'id_user_236',
                            'editors': ['id_user_236'],
                            'text': 'Et totam et iusto eaque distinctio voluptatem aut.',
                            'role': 'pro',
                            'posted': '2017-04-04T12:02:50.502Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2566',
                            'owner': 'id_user_174',
                            'editors': ['id_user_174'],
                            'text': 'Aut aut corporis dignissimos rerum quo.',
                            'role': 'con',
                            'posted': '2017-04-08T23:07:53.699Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_2571',
                            'owner': 'id_user_311',
                            'editors': ['id_user_311'],
                            'text': 'Non dolorum non excepturi enim.',
                            'role': 'pro',
                            'posted': '2017-04-06T06:00:39.933Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_2603': {
            'total': {'votes': {'yes': 16, 'no': 27}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 1, 'no': 1},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 0, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 0, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 1, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 2, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 1, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': null,
                'con': null,
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_2647': {
            'total': {'votes': {'yes': 44, 'no': 40}, 'comments': {'pro': 7, 'con': 11, 'neutral': 13}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 3, 'no': 6},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 5, 'no': 3}, 'comments': {'pro': 0, 'con': 1, 'neutral': 2}},
                'id_district_103': {'votes': {'yes': 3, 'no': 0}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}},
                'id_district_105': {'votes': {'yes': 6, 'no': 7}, 'comments': {'pro': 1, 'con': 2, 'neutral': 2}},
                'id_district_106': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 0, 'con': 4, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 5, 'no': 6}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 6, 'no': 2}, 'comments': {'pro': 2, 'con': 1, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 4, 'no': 5}, 'comments': {'pro': 1, 'con': 1, 'neutral': 2}},
                'id_district_110': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 0, 'con': 1, 'neutral': 3}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2753',
                    'owner': 'id_user_229',
                    'editors': ['id_user_229'],
                    'text': 'Cum sit repudiandae et dignissimos deserunt quod facere aut consectetur.',
                    'role': 'pro',
                    'posted': '2017-04-03T06:52:00.547Z',
                    'userDistrict': 'id_district_104',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_2762',
                    'owner': 'id_user_356',
                    'editors': ['id_user_356'],
                    'text': 'Velit animi et consequuntur dolor quis.',
                    'role': 'con',
                    'posted': '2017-04-09T02:07:33.452Z',
                    'userDistrict': 'id_district_110',
                    'votes': {'up': 0, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2732',
                            'owner': 'id_user_508',
                            'editors': ['id_user_508'],
                            'text': 'Molestiae id totam distinctio sed aut sunt assumenda qui dolor.',
                            'role': 'con',
                            'posted': '2017-04-05T11:51:54.155Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_2758',
                            'owner': 'id_user_180',
                            'editors': ['id_user_180'],
                            'text': 'Et fugit ea id facere.',
                            'role': 'pro',
                            'posted': '2017-04-11T13:08:00.535Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2746',
                            'owner': 'id_user_397',
                            'editors': ['id_user_397'],
                            'text': 'Similique cum et quis aut et.',
                            'role': 'con',
                            'posted': '2017-04-02T06:13:05.825Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_2753',
                            'owner': 'id_user_229',
                            'editors': ['id_user_229'],
                            'text': 'Cum sit repudiandae et dignissimos deserunt quod facere aut consectetur.',
                            'role': 'pro',
                            'posted': '2017-04-03T06:52:00.547Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_2754',
                            'owner': 'id_user_217',
                            'editors': ['id_user_217'],
                            'text': 'Id illum odio ab doloribus animi tempora et illo est.',
                            'role': 'pro',
                            'posted': '2017-04-12T10:40:31.061Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2735',
                            'owner': 'id_user_131',
                            'editors': ['id_user_131'],
                            'text': 'Ut recusandae voluptate sapiente.',
                            'role': 'con',
                            'posted': '2017-04-08T04:06:27.515Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2747',
                            'owner': 'id_user_231',
                            'editors': ['id_user_231'],
                            'text': 'Velit deleniti voluptatem qui delectus fugit alias consequatur.',
                            'role': 'con',
                            'posted': '2017-04-04T08:00:45.725Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_2738',
                            'owner': 'id_user_144',
                            'editors': ['id_user_144'],
                            'text': 'Aut dolor voluptatem ea aut aliquid veniam labore architecto nulla.',
                            'role': 'pro',
                            'posted': '2017-04-05T08:04:54.351Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2757',
                            'owner': 'id_user_113',
                            'editors': ['id_user_113'],
                            'text': 'Quibusdam et et quia autem.',
                            'role': 'con',
                            'posted': '2017-04-06T21:27:05.745Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_2744',
                            'owner': 'id_user_390',
                            'editors': ['id_user_390'],
                            'text': 'Qui eveniet doloremque enim excepturi rerum quisquam.',
                            'role': 'pro',
                            'posted': '2017-04-03T22:52:17.854Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2751',
                            'owner': 'id_user_439',
                            'editors': ['id_user_439'],
                            'text': 'Minima veniam dignissimos natus deserunt eos.',
                            'role': 'con',
                            'posted': '2017-04-08T12:45:08.254Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2762',
                            'owner': 'id_user_356',
                            'editors': ['id_user_356'],
                            'text': 'Velit animi et consequuntur dolor quis.',
                            'role': 'con',
                            'posted': '2017-04-09T02:07:33.452Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_2763': {
            'total': {'votes': {'yes': 40, 'no': 41}, 'comments': {'pro': 7, 'con': 8, 'neutral': 7}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 5, 'no': 4},
                    'comments': {'pro': 1, 'con': 1, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 4, 'no': 5}, 'comments': {'pro': 0, 'con': 2, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_105': {'votes': {'yes': 5, 'no': 4}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_106': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 6, 'no': 3}, 'comments': {'pro': 4, 'con': 1, 'neutral': 1}},
                'id_district_108': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 7, 'no': 6}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 4, 'no': 6}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2849',
                    'owner': 'id_user_373',
                    'editors': ['id_user_373'],
                    'text': 'Eveniet et tempora dolorem dolorum.',
                    'role': 'pro',
                    'posted': '2017-04-01T00:53:32.723Z',
                    'userDistrict': 'id_district_107',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_2847',
                    'owner': 'id_user_487',
                    'editors': ['id_user_487'],
                    'text': 'Et voluptatem praesentium at earum.',
                    'role': 'con',
                    'posted': '2017-03-30T23:41:26.362Z',
                    'userDistrict': 'id_district_108',
                    'votes': {'up': 0, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_2848',
                            'owner': 'id_user_133',
                            'editors': ['id_user_133'],
                            'text': 'Ut sit nemo eveniet beatae aliquid ipsam rerum nihil.',
                            'role': 'pro',
                            'posted': '2017-04-01T21:37:06.845Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2864',
                            'owner': 'id_user_227',
                            'editors': ['id_user_227'],
                            'text': 'Sint ratione delectus nesciunt et dolores exercitationem laborum quibusdam.',
                            'role': 'con',
                            'posted': '2017-04-01T08:34:46.148Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2859',
                            'owner': 'id_user_228',
                            'editors': ['id_user_228'],
                            'text': 'Exercitationem deleniti quia.',
                            'role': 'con',
                            'posted': '2017-03-30T00:34:25.116Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_2862',
                            'owner': 'id_user_430',
                            'editors': ['id_user_430'],
                            'text': 'Enim et voluptates iure nihil quas consequuntur nemo.',
                            'role': 'pro',
                            'posted': '2017-04-08T18:26:55.297Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2845',
                            'owner': 'id_user_333',
                            'editors': ['id_user_333'],
                            'text': 'Molestiae non veritatis rerum et assumenda velit rerum.',
                            'role': 'con',
                            'posted': '2017-04-12T14:37:34.045Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2856',
                            'owner': 'id_user_349',
                            'editors': ['id_user_349'],
                            'text': 'Vel voluptatem et porro culpa est.',
                            'role': 'con',
                            'posted': '2017-04-11T01:42:48.904Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2853',
                            'owner': 'id_user_140',
                            'editors': ['id_user_140'],
                            'text': 'Repellat commodi molestiae maxime aut consequatur iste veritatis.',
                            'role': 'con',
                            'posted': '2017-04-02T23:26:00.508Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_2849',
                            'owner': 'id_user_373',
                            'editors': ['id_user_373'],
                            'text': 'Eveniet et tempora dolorem dolorum.',
                            'role': 'pro',
                            'posted': '2017-04-01T00:53:32.723Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2855',
                            'owner': 'id_user_340',
                            'editors': ['id_user_340'],
                            'text': 'Quo sapiente sequi molestias consectetur.',
                            'role': 'con',
                            'posted': '2017-04-02T11:40:51.416Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2847',
                            'owner': 'id_user_487',
                            'editors': ['id_user_487'],
                            'text': 'Et voluptatem praesentium at earum.',
                            'role': 'con',
                            'posted': '2017-03-30T23:41:26.362Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_2867': {
            'total': {'votes': {'yes': 45, 'no': 52}, 'comments': {'pro': 18, 'con': 15, 'neutral': 7}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 8},
                    'comments': {'pro': 1, 'con': 0, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 7, 'no': 4}, 'comments': {'pro': 3, 'con': 1, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 7, 'no': 9}, 'comments': {'pro': 2, 'con': 1, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 2, 'no': 5}, 'comments': {'pro': 2, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 4, 'no': 5}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 1, 'con': 2, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 5, 'no': 2}, 'comments': {'pro': 2, 'con': 1, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 2, 'no': 6}, 'comments': {'pro': 0, 'con': 2, 'neutral': 3}},
                'id_district_109': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 2, 'con': 1, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 6, 'no': 2}, 'comments': {'pro': 2, 'con': 3, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_2986',
                    'owner': 'id_user_431',
                    'editors': ['id_user_431'],
                    'text': 'Non eius iure beatae.',
                    'role': 'pro',
                    'posted': '2017-04-04T07:36:32.995Z',
                    'userDistrict': 'id_district_102',
                    'votes': {'up': 0, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_2970',
                    'owner': 'id_user_118',
                    'editors': ['id_user_118'],
                    'text': 'Dolorem eum enim quam.',
                    'role': 'con',
                    'posted': '2017-04-11T16:35:57.576Z',
                    'userDistrict': 'id_district_102',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_2979',
                            'owner': 'id_user_503',
                            'editors': ['id_user_503'],
                            'text': 'Alias illo fuga voluptate fugiat omnis et atque ut.',
                            'role': 'pro',
                            'posted': '2017-04-04T10:10:00.609Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_2976',
                            'owner': 'id_user_277',
                            'editors': ['id_user_277'],
                            'text': 'Officia voluptatem incidunt recusandae illo.',
                            'role': 'pro',
                            'posted': '2017-04-06T04:00:45.090Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2970',
                            'owner': 'id_user_118',
                            'editors': ['id_user_118'],
                            'text': 'Dolorem eum enim quam.',
                            'role': 'con',
                            'posted': '2017-04-11T16:35:57.576Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_2965',
                            'owner': 'id_user_166',
                            'editors': ['id_user_166'],
                            'text': 'Labore recusandae minima non asperiores.',
                            'role': 'pro',
                            'posted': '2017-04-12T05:24:17.133Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3002',
                            'owner': 'id_user_160',
                            'editors': ['id_user_160'],
                            'text': 'Minus eius reiciendis tenetur qui voluptatibus ipsam autem.',
                            'role': 'con',
                            'posted': '2017-04-08T04:53:51.030Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_2994',
                            'owner': 'id_user_386',
                            'editors': ['id_user_386'],
                            'text': 'Voluptas quia ducimus qui.',
                            'role': 'pro',
                            'posted': '2017-04-03T20:57:59.954Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_2991',
                            'owner': 'id_user_147',
                            'editors': ['id_user_147'],
                            'text': 'Quo ut id iusto perspiciatis dolores.',
                            'role': 'pro',
                            'posted': '2017-04-08T00:23:52.439Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2985',
                            'owner': 'id_user_141',
                            'editors': ['id_user_141'],
                            'text': 'In nulla vero delectus quam odio.',
                            'role': 'con',
                            'posted': '2017-03-30T02:42:34.855Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_3001',
                            'owner': 'id_user_409',
                            'editors': ['id_user_409'],
                            'text': 'Dicta possimus sit quisquam vero veniam est sed doloremque architecto.',
                            'role': 'pro',
                            'posted': '2017-04-04T09:43:39.084Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2984',
                            'owner': 'id_user_485',
                            'editors': ['id_user_485'],
                            'text': 'Sunt et molestiae soluta non sunt.',
                            'role': 'con',
                            'posted': '2017-03-29T23:36:47.210Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_2980',
                            'owner': 'id_user_445',
                            'editors': ['id_user_445'],
                            'text': 'Aliquid est autem et.',
                            'role': 'pro',
                            'posted': '2017-04-08T10:57:00.105Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2993',
                            'owner': 'id_user_373',
                            'editors': ['id_user_373'],
                            'text': 'Incidunt sed veritatis.',
                            'role': 'con',
                            'posted': '2017-03-31T15:13:59.423Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_2983',
                            'owner': 'id_user_287',
                            'editors': ['id_user_287'],
                            'text': 'Voluptatem sunt iure sint eligendi voluptates magni.',
                            'role': 'con',
                            'posted': '2017-04-06T17:15:59.449Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_2966',
                            'owner': 'id_user_381',
                            'editors': ['id_user_381'],
                            'text': 'Est optio soluta.',
                            'role': 'pro',
                            'posted': '2017-04-11T03:34:37.417Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3003',
                            'owner': 'id_user_350',
                            'editors': ['id_user_350'],
                            'text': 'Esse est quia vero blanditiis sed non nesciunt iste quisquam.',
                            'role': 'con',
                            'posted': '2017-04-04T19:27:34.190Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_2975',
                            'owner': 'id_user_172',
                            'editors': ['id_user_172'],
                            'text': 'Amet in quaerat voluptas distinctio sint.',
                            'role': 'pro',
                            'posted': '2017-04-01T14:42:47.288Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_2968',
                            'owner': 'id_user_127',
                            'editors': ['id_user_127'],
                            'text': 'Nobis inventore commodi dolorum eligendi et minima officiis.',
                            'role': 'con',
                            'posted': '2017-03-30T21:34:35.864Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_3005': {
            'total': {'votes': {'yes': 4, 'no': 9}, 'comments': {'pro': 11, 'con': 5, 'neutral': 7}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 0, 'no': 3},
                    'comments': {'pro': 1, 'con': 1, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 2, 'con': 0, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 2}},
                'id_district_104': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_105': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 2, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 2, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 2, 'con': 1, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_3028',
                    'owner': 'id_user_227',
                    'editors': ['id_user_227'],
                    'text': 'Voluptatem culpa sapiente corrupti temporibus quam harum consequuntur et.',
                    'role': 'pro',
                    'posted': '2017-04-10T03:07:07.797Z',
                    'userDistrict': 'id_district_101',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_3021',
                    'owner': 'id_user_362',
                    'editors': ['id_user_362'],
                    'text': 'Reprehenderit dolores earum.',
                    'role': 'con',
                    'posted': '2017-04-02T13:24:56.456Z',
                    'userDistrict': 'id_district_101',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_3028',
                            'owner': 'id_user_227',
                            'editors': ['id_user_227'],
                            'text': 'Voluptatem culpa sapiente corrupti temporibus quam harum consequuntur et.',
                            'role': 'pro',
                            'posted': '2017-04-10T03:07:07.797Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3021',
                            'owner': 'id_user_362',
                            'editors': ['id_user_362'],
                            'text': 'Reprehenderit dolores earum.',
                            'role': 'con',
                            'posted': '2017-04-02T13:24:56.456Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_3024',
                            'owner': 'id_user_290',
                            'editors': ['id_user_290'],
                            'text': 'Non ullam similique pariatur aut.',
                            'role': 'pro',
                            'posted': '2017-04-01T15:00:57.000Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_3041',
                            'owner': 'id_user_253',
                            'editors': ['id_user_253'],
                            'text': 'Sed soluta ut sed accusamus non magni recusandae consequatur.',
                            'role': 'pro',
                            'posted': '2017-04-11T03:44:04.526Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_3036',
                            'owner': 'id_user_374',
                            'editors': ['id_user_374'],
                            'text': 'Soluta aut eaque vero quisquam ab sit ipsum qui.',
                            'role': 'pro',
                            'posted': '2017-04-01T21:10:41.489Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 1}
                        },
                        'con': {
                            'id': 'id_comment_3030',
                            'owner': 'id_user_312',
                            'editors': ['id_user_312'],
                            'text': 'Dolorum id temporibus maiores doloremque error deserunt corrupti.',
                            'role': 'con',
                            'posted': '2017-04-05T18:53:56.787Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_3033',
                            'owner': 'id_user_416',
                            'editors': ['id_user_416'],
                            'text': 'Cupiditate neque nisi sequi reprehenderit.',
                            'role': 'pro',
                            'posted': '2017-04-05T17:58:57.125Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_3035',
                            'owner': 'id_user_203',
                            'editors': ['id_user_203'],
                            'text': 'Fuga rerum ullam ut.',
                            'role': 'pro',
                            'posted': '2017-04-06T07:32:04.654Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_3025',
                            'owner': 'id_user_155',
                            'editors': ['id_user_155'],
                            'text': 'Distinctio optio quia sed.',
                            'role': 'pro',
                            'posted': '2017-04-10T19:23:05.914Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3032',
                            'owner': 'id_user_307',
                            'editors': ['id_user_307'],
                            'text': 'Dolore non tenetur iure.',
                            'role': 'con',
                            'posted': '2017-04-04T17:29:53.799Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_3020',
                            'owner': 'id_user_273',
                            'editors': ['id_user_273'],
                            'text': 'Soluta totam et minus quam ratione vel officiis ab.',
                            'role': 'pro',
                            'posted': '2017-04-11T10:35:07.003Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3023',
                            'owner': 'id_user_411',
                            'editors': ['id_user_411'],
                            'text': 'Quidem dignissimos dicta.',
                            'role': 'con',
                            'posted': '2017-04-04T08:52:06.433Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 1}
                        }
                    }
                }
            }
        },
        'id_item_3042': {
            'total': {'votes': {'yes': 57, 'no': 41}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 5, 'no': 3},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 12, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 6, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 3, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 5, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 9, 'no': 6}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': null,
                'con': null,
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_3141': {
            'total': {'votes': {'yes': 15, 'no': 9}, 'comments': {'pro': 3, 'con': 4, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 5, 'no': 1},
                    'comments': {'pro': 0, 'con': 1, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_3166',
                    'owner': 'id_user_338',
                    'editors': ['id_user_338'],
                    'text': 'Illum molestiae ut reiciendis repudiandae eum.',
                    'role': 'pro',
                    'posted': '2017-04-02T02:56:25.853Z',
                    'userDistrict': 'id_district_103',
                    'votes': {'up': 3, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_3168',
                    'owner': 'id_user_325',
                    'editors': ['id_user_325'],
                    'text': 'Cumque inventore quos ut sint.',
                    'role': 'con',
                    'posted': '2017-03-31T23:24:04.028Z',
                    'userDistrict': 'id_district_101',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3168',
                            'owner': 'id_user_325',
                            'editors': ['id_user_325'],
                            'text': 'Cumque inventore quos ut sint.',
                            'role': 'con',
                            'posted': '2017-03-31T23:24:04.028Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3171',
                            'owner': 'id_user_189',
                            'editors': ['id_user_189'],
                            'text': 'Delectus aut et delectus qui modi.',
                            'role': 'con',
                            'posted': '2017-04-10T11:59:39.942Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_3166',
                            'owner': 'id_user_338',
                            'editors': ['id_user_338'],
                            'text': 'Illum molestiae ut reiciendis repudiandae eum.',
                            'role': 'pro',
                            'posted': '2017-04-02T02:56:25.853Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 3, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3169',
                            'owner': 'id_user_389',
                            'editors': ['id_user_389'],
                            'text': 'Et quo qui dolores nostrum ipsa facere.',
                            'role': 'con',
                            'posted': '2017-04-10T15:16:24.926Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3167',
                            'owner': 'id_user_425',
                            'editors': ['id_user_425'],
                            'text': 'Accusamus dignissimos voluptas id sed rem.',
                            'role': 'con',
                            'posted': '2017-04-10T16:08:50.199Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_3172',
                            'owner': 'id_user_200',
                            'editors': ['id_user_200'],
                            'text': 'Et dolorem et labore quod ullam commodi ut.',
                            'role': 'pro',
                            'posted': '2017-04-04T04:37:21.450Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 1}
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_3173': {
            'total': {'votes': {'yes': 10, 'no': 9}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 0, 'no': 0},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 4, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': null,
                'con': null,
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_3193': {
            'total': {'votes': {'yes': 18, 'no': 19}, 'comments': {'pro': 13, 'con': 13, 'neutral': 11}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 1, 'no': 2},
                    'comments': {'pro': 2, 'con': 1, 'neutral': 2}
                },
                'id_district_102': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 2, 'con': 3, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 2, 'con': 0, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 2, 'con': 0, 'neutral': 2}},
                'id_district_106': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 2, 'con': 1, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 4, 'no': 3}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 2, 'no': 4}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_110': {'votes': {'yes': 1, 'no': 5}, 'comments': {'pro': 2, 'con': 3, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_3261',
                    'owner': 'id_user_362',
                    'editors': ['id_user_362'],
                    'text': 'Et inventore quo et nobis et corrupti.',
                    'role': 'pro',
                    'posted': '2017-04-06T16:40:27.610Z',
                    'userDistrict': 'id_district_101',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_3249',
                    'owner': 'id_user_509',
                    'editors': ['id_user_509'],
                    'text': 'Sapiente labore maxime exercitationem eius ex molestiae eos.',
                    'role': 'con',
                    'posted': '2017-04-08T21:22:00.530Z',
                    'userDistrict': null,
                    'votes': {'up': 0, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_3239',
                            'owner': 'id_user_461',
                            'editors': ['id_user_461'],
                            'text': 'Laudantium voluptatum libero dolores.',
                            'role': 'pro',
                            'posted': '2017-04-07T10:44:19.407Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3248',
                            'owner': 'id_user_280',
                            'editors': ['id_user_280'],
                            'text': 'Rerum eos rerum natus qui quis ratione sed.',
                            'role': 'con',
                            'posted': '2017-04-01T12:05:54.153Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_3254',
                            'owner': 'id_user_298',
                            'editors': ['id_user_298'],
                            'text': 'Qui sed rerum.',
                            'role': 'pro',
                            'posted': '2017-04-10T08:49:52.323Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3252',
                            'owner': 'id_user_354',
                            'editors': ['id_user_354'],
                            'text': 'Officia ut nihil.',
                            'role': 'con',
                            'posted': '2017-04-11T00:24:15.888Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_3250',
                            'owner': 'id_user_469',
                            'editors': ['id_user_469'],
                            'text': 'Illum nemo voluptatem.',
                            'role': 'pro',
                            'posted': '2017-04-04T23:48:50.493Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_3233',
                            'owner': 'id_user_477',
                            'editors': ['id_user_477'],
                            'text': 'Quas est id enim ipsum quidem totam et.',
                            'role': 'pro',
                            'posted': '2017-04-05T23:37:34.623Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3265',
                            'owner': 'id_user_435',
                            'editors': ['id_user_435'],
                            'text': 'Voluptate reprehenderit maiores adipisci.',
                            'role': 'con',
                            'posted': '2017-04-03T20:21:22.870Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_3244',
                            'owner': 'id_user_483',
                            'editors': ['id_user_483'],
                            'text': 'Doloremque quos porro et praesentium voluptatem rem ullam itaque.',
                            'role': 'pro',
                            'posted': '2017-04-11T12:57:26.671Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_3258',
                            'owner': 'id_user_275',
                            'editors': ['id_user_275'],
                            'text': 'Omnis maxime similique nulla omnis ea consequatur laborum.',
                            'role': 'pro',
                            'posted': '2017-04-03T15:00:28.261Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3231',
                            'owner': 'id_user_409',
                            'editors': ['id_user_409'],
                            'text': 'Aut consectetur est aut perferendis.',
                            'role': 'con',
                            'posted': '2017-04-04T12:12:39.146Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3242',
                            'owner': 'id_user_444',
                            'editors': ['id_user_444'],
                            'text': 'Et earum alias maiores molestiae perferendis.',
                            'role': 'con',
                            'posted': '2017-04-06T23:00:52.821Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3236',
                            'owner': 'id_user_177',
                            'editors': ['id_user_177'],
                            'text': 'Veniam nulla aut eum.',
                            'role': 'con',
                            'posted': '2017-04-01T05:15:19.661Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3256',
                            'owner': 'id_user_157',
                            'editors': ['id_user_157'],
                            'text': 'Voluptatem ut quaerat autem voluptas eum quia deserunt.',
                            'role': 'con',
                            'posted': '2017-04-06T23:28:48.533Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_3240',
                            'owner': 'id_user_309',
                            'editors': ['id_user_309'],
                            'text': 'Cupiditate id qui id tenetur veniam voluptas.',
                            'role': 'pro',
                            'posted': '2017-04-06T02:50:10.516Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3234',
                            'owner': 'id_user_492',
                            'editors': ['id_user_492'],
                            'text': 'Delectus at sit eum ut.',
                            'role': 'con',
                            'posted': '2017-04-06T15:04:27.091Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_3268': {
            'total': {'votes': {'yes': 34, 'no': 26}, 'comments': {'pro': 5, 'con': 6, 'neutral': 7}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 3, 'no': 3},
                    'comments': {'pro': 1, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 5, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 0, 'con': 2, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 5, 'no': 3}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}},
                'id_district_106': {'votes': {'yes': 0, 'no': 5}, 'comments': {'pro': 1, 'con': 2, 'neutral': 2}},
                'id_district_107': {'votes': {'yes': 3, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 6, 'no': 3}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 0, 'con': 1, 'neutral': 2}},
                'id_district_110': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_3346',
                    'owner': 'id_user_336',
                    'editors': ['id_user_336'],
                    'text': 'Corporis reprehenderit accusantium ut minima nesciunt modi vitae minima.',
                    'role': 'pro',
                    'posted': '2017-04-06T23:57:23.552Z',
                    'userDistrict': 'id_district_108',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_3331',
                    'owner': 'id_user_166',
                    'editors': ['id_user_166'],
                    'text': 'Dolore non dolorem placeat blanditiis voluptas.',
                    'role': 'con',
                    'posted': '2017-03-30T02:22:18.296Z',
                    'userDistrict': 'id_district_103',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_3332',
                            'owner': 'id_user_252',
                            'editors': ['id_user_252'],
                            'text': 'Est rem non eos inventore.',
                            'role': 'pro',
                            'posted': '2017-03-31T13:20:09.027Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 2}
                        }, 'con': null
                    },
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3331',
                            'owner': 'id_user_166',
                            'editors': ['id_user_166'],
                            'text': 'Dolore non dolorem placeat blanditiis voluptas.',
                            'role': 'con',
                            'posted': '2017-03-30T02:22:18.296Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_3340',
                            'owner': 'id_user_286',
                            'editors': ['id_user_286'],
                            'text': 'Aperiam quia temporibus quia.',
                            'role': 'pro',
                            'posted': '2017-04-07T05:57:42.010Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_3344',
                            'owner': 'id_user_353',
                            'editors': ['id_user_353'],
                            'text': 'Facilis qui ab vitae autem.',
                            'role': 'pro',
                            'posted': '2017-04-12T16:47:00.336Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3338',
                            'owner': 'id_user_330',
                            'editors': ['id_user_330'],
                            'text': 'Dolor magni quod ullam eos et error sit et.',
                            'role': 'con',
                            'posted': '2017-04-02T14:42:49.843Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_3346',
                            'owner': 'id_user_336',
                            'editors': ['id_user_336'],
                            'text': 'Corporis reprehenderit accusantium ut minima nesciunt modi vitae minima.',
                            'role': 'pro',
                            'posted': '2017-04-06T23:57:23.552Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3335',
                            'owner': 'id_user_375',
                            'editors': ['id_user_375'],
                            'text': 'Sint quo voluptatem mollitia id non dolorum reiciendis ipsam.',
                            'role': 'con',
                            'posted': '2017-04-04T18:32:45.780Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3339',
                            'owner': 'id_user_343',
                            'editors': ['id_user_343'],
                            'text': 'Quidem nemo odio fuga assumenda hic tenetur illo.',
                            'role': 'con',
                            'posted': '2017-04-08T15:55:46.096Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_3330',
                            'owner': 'id_user_122',
                            'editors': ['id_user_122'],
                            'text': 'Nisi sunt vero possimus accusantium ratione.',
                            'role': 'pro',
                            'posted': '2017-04-08T03:05:33.568Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 1}
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_3347': {
            'total': {'votes': {'yes': 52, 'no': 37}, 'comments': {'pro': 10, 'con': 12, 'neutral': 11}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 3, 'no': 5},
                    'comments': {'pro': 0, 'con': 1, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 5, 'no': 5}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 5, 'no': 2}, 'comments': {'pro': 1, 'con': 2, 'neutral': 3}},
                'id_district_106': {'votes': {'yes': 2, 'no': 6}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 4, 'no': 3}, 'comments': {'pro': 0, 'con': 3, 'neutral': 1}},
                'id_district_108': {'votes': {'yes': 5, 'no': 1}, 'comments': {'pro': 3, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 10, 'no': 6}, 'comments': {'pro': 2, 'con': 1, 'neutral': 3}},
                'id_district_110': {'votes': {'yes': 8, 'no': 2}, 'comments': {'pro': 0, 'con': 2, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_3469',
                    'owner': 'id_user_366',
                    'editors': ['id_user_366'],
                    'text': 'Nihil in ut sunt sunt officiis doloribus.',
                    'role': 'pro',
                    'posted': '2017-03-30T10:04:30.109Z',
                    'userDistrict': 'id_district_108',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_3467',
                    'owner': 'id_user_151',
                    'editors': ['id_user_151'],
                    'text': 'Exercitationem sint aut quibusdam necessitatibus assumenda mollitia fuga.',
                    'role': 'con',
                    'posted': '2017-04-08T21:09:35.415Z',
                    'userDistrict': 'id_district_107',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3461',
                            'owner': 'id_user_503',
                            'editors': ['id_user_503'],
                            'text': 'Nostrum et quasi nihil.',
                            'role': 'con',
                            'posted': '2017-04-03T17:56:41.290Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3442',
                            'owner': 'id_user_354',
                            'editors': ['id_user_354'],
                            'text': 'Voluptatibus rerum quas.',
                            'role': 'con',
                            'posted': '2017-04-11T13:20:58.647Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_3453',
                            'owner': 'id_user_166',
                            'editors': ['id_user_166'],
                            'text': 'Et ipsam molestiae et molestias.',
                            'role': 'pro',
                            'posted': '2017-04-09T06:03:10.589Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3444',
                            'owner': 'id_user_300',
                            'editors': ['id_user_300'],
                            'text': 'Quia dicta eum beatae beatae.',
                            'role': 'con',
                            'posted': '2017-04-06T18:40:53.277Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_3454',
                            'owner': 'id_user_385',
                            'editors': ['id_user_385'],
                            'text': 'Eum ipsam cum minus tempore voluptas.',
                            'role': 'pro',
                            'posted': '2017-04-06T20:41:19.746Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3448',
                            'owner': 'id_user_349',
                            'editors': ['id_user_349'],
                            'text': 'Asperiores non quia ducimus qui ut et tenetur.',
                            'role': 'con',
                            'posted': '2017-04-08T01:24:25.747Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_3458',
                            'owner': 'id_user_165',
                            'editors': ['id_user_165'],
                            'text': 'Magnam dolores tempora reprehenderit tempora eius quo.',
                            'role': 'pro',
                            'posted': '2017-04-08T10:03:53.500Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3467',
                            'owner': 'id_user_151',
                            'editors': ['id_user_151'],
                            'text': 'Exercitationem sint aut quibusdam necessitatibus assumenda mollitia fuga.',
                            'role': 'con',
                            'posted': '2017-04-08T21:09:35.415Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_3469',
                            'owner': 'id_user_366',
                            'editors': ['id_user_366'],
                            'text': 'Nihil in ut sunt sunt officiis doloribus.',
                            'role': 'pro',
                            'posted': '2017-03-30T10:04:30.109Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3457',
                            'owner': 'id_user_224',
                            'editors': ['id_user_224'],
                            'text': 'Animi laudantium voluptas odio aspernatur veniam ratione.',
                            'role': 'con',
                            'posted': '2017-04-02T16:17:43.801Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_3440',
                            'owner': 'id_user_376',
                            'editors': ['id_user_376'],
                            'text': 'Alias qui est dolor eum.',
                            'role': 'pro',
                            'posted': '2017-04-06T21:07:52.294Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3446',
                            'owner': 'id_user_302',
                            'editors': ['id_user_302'],
                            'text': 'Culpa deserunt magni veniam facere laborum sunt.',
                            'role': 'con',
                            'posted': '2017-04-05T22:08:01.788Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3451',
                            'owner': 'id_user_239',
                            'editors': ['id_user_239'],
                            'text': 'Autem omnis sequi neque voluptate amet illo omnis quia consequatur.',
                            'role': 'con',
                            'posted': '2017-04-09T14:56:10.097Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_3470': {
            'total': {'votes': {'yes': 22, 'no': 15}, 'comments': {'pro': 12, 'con': 14, 'neutral': 10}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 1},
                    'comments': {'pro': 3, 'con': 0, 'neutral': 2}
                },
                'id_district_102': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 1, 'con': 2, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 3, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 0, 'no': 3}, 'comments': {'pro': 0, 'con': 2, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 3, 'con': 1, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 1, 'con': 2, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_108': {'votes': {'yes': 4, 'no': 4}, 'comments': {'pro': 1, 'con': 1, 'neutral': 2}},
                'id_district_109': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_110': {'votes': {'yes': 1, 'no': 3}, 'comments': {'pro': 1, 'con': 2, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_3510',
                    'owner': 'id_user_182',
                    'editors': ['id_user_182'],
                    'text': 'Ut porro sit eius voluptatem omnis ea.',
                    'role': 'pro',
                    'posted': '2017-04-02T06:22:27.530Z',
                    'userDistrict': 'id_district_105',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_3528',
                    'owner': 'id_user_353',
                    'editors': ['id_user_353'],
                    'text': 'Quas est libero quis.',
                    'role': 'con',
                    'posted': '2017-04-08T23:24:32.005Z',
                    'userDistrict': 'id_district_106',
                    'votes': {'up': 0, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_3511',
                            'owner': 'id_user_446',
                            'editors': ['id_user_446'],
                            'text': 'Maiores labore consequatur autem veniam.',
                            'role': 'pro',
                            'posted': '2017-04-08T16:09:06.350Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_3523',
                            'owner': 'id_user_115',
                            'editors': ['id_user_115'],
                            'text': 'Est et maiores hic aut.',
                            'role': 'pro',
                            'posted': '2017-04-09T22:23:45.149Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3512',
                            'owner': 'id_user_463',
                            'editors': ['id_user_463'],
                            'text': 'Ex laboriosam nihil qui et eum omnis.',
                            'role': 'con',
                            'posted': '2017-03-31T15:21:57.330Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3515',
                            'owner': 'id_user_460',
                            'editors': ['id_user_460'],
                            'text': 'Corrupti dolorem est provident et.',
                            'role': 'con',
                            'posted': '2017-04-11T22:30:43.554Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_3510',
                            'owner': 'id_user_182',
                            'editors': ['id_user_182'],
                            'text': 'Ut porro sit eius voluptatem omnis ea.',
                            'role': 'pro',
                            'posted': '2017-04-02T06:22:27.530Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3532',
                            'owner': 'id_user_342',
                            'editors': ['id_user_342'],
                            'text': 'Et ad vel rerum facilis molestiae deserunt.',
                            'role': 'con',
                            'posted': '2017-03-31T18:57:23.396Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_3529',
                            'owner': 'id_user_269',
                            'editors': ['id_user_269'],
                            'text': 'Et soluta quisquam asperiores voluptatibus sed incidunt enim.',
                            'role': 'pro',
                            'posted': '2017-04-05T22:18:31.525Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3516',
                            'owner': 'id_user_223',
                            'editors': ['id_user_223'],
                            'text': 'Et nam ut autem asperiores occaecati ipsam.',
                            'role': 'con',
                            'posted': '2017-04-04T11:30:46.998Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_3530',
                            'owner': 'id_user_291',
                            'editors': ['id_user_291'],
                            'text': 'Blanditiis autem atque aspernatur aut in aut similique ipsum.',
                            'role': 'pro',
                            'posted': '2017-04-03T12:19:39.988Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3542',
                            'owner': 'id_user_198',
                            'editors': ['id_user_198'],
                            'text': 'Harum deleniti a beatae et eligendi nam vitae omnis.',
                            'role': 'con',
                            'posted': '2017-04-10T13:22:37.532Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_3543',
                            'owner': 'id_user_496',
                            'editors': ['id_user_496'],
                            'text': 'Eos veniam commodi sit est.',
                            'role': 'pro',
                            'posted': '2017-03-31T21:47:08.788Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3540',
                            'owner': 'id_user_113',
                            'editors': ['id_user_113'],
                            'text': 'Consectetur totam amet repellat.',
                            'role': 'con',
                            'posted': '2017-03-30T05:29:11.493Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_3539',
                            'owner': 'id_user_220',
                            'editors': ['id_user_220'],
                            'text': 'Qui saepe sunt inventore.',
                            'role': 'pro',
                            'posted': '2017-04-04T10:37:31.498Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3534',
                            'owner': 'id_user_296',
                            'editors': ['id_user_296'],
                            'text': 'Possimus quia quia dolor.',
                            'role': 'con',
                            'posted': '2017-04-07T13:48:53.177Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_3533',
                            'owner': 'id_user_488',
                            'editors': ['id_user_488'],
                            'text': 'Occaecati sed molestiae occaecati quam.',
                            'role': 'pro',
                            'posted': '2017-04-01T05:20:14.052Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3522',
                            'owner': 'id_user_156',
                            'editors': ['id_user_156'],
                            'text': 'Doloribus perspiciatis ipsum tempora tempora quos corrupti.',
                            'role': 'con',
                            'posted': '2017-04-03T08:18:41.318Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_3544': {
            'total': {'votes': {'yes': 39, 'no': 39}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 3, 'no': 3},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 8, 'no': 3}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 0, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 3, 'no': 8}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 5, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 4, 'no': 6}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 6, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': null,
                'con': {
                    'id': 'id_comment_3623',
                    'owner': 'id_user_160',
                    'editors': ['id_user_160'],
                    'text': 'Necessitatibus eos est rerum illo dolores cum suscipit architecto.',
                    'role': 'con',
                    'posted': '2017-04-02T19:57:19.451Z',
                    'userDistrict': 'id_district_103',
                    'votes': {'up': 6, 'down': 3}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3623',
                            'owner': 'id_user_160',
                            'editors': ['id_user_160'],
                            'text': 'Necessitatibus eos est rerum illo dolores cum suscipit architecto.',
                            'role': 'con',
                            'posted': '2017-04-02T19:57:19.451Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 6, 'down': 3}
                        }
                    },
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_3624': {
            'total': {'votes': {'yes': 31, 'no': 22}, 'comments': {'pro': 10, 'con': 8, 'neutral': 6}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 1, 'no': 2},
                    'comments': {'pro': 0, 'con': 1, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 2, 'con': 1, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_105': {'votes': {'yes': 5, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_106': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 1, 'con': 2, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 4, 'no': 3}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 5, 'no': 4}, 'comments': {'pro': 2, 'con': 0, 'neutral': 2}},
                'id_district_110': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_3683',
                    'owner': 'id_user_160',
                    'editors': ['id_user_160'],
                    'text': 'Vitae non iste alias dicta.',
                    'role': 'pro',
                    'posted': '2017-04-02T13:33:46.598Z',
                    'userDistrict': 'id_district_103',
                    'votes': {'up': 0, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_3700',
                    'owner': 'id_user_328',
                    'editors': ['id_user_328'],
                    'text': 'Vel vel aliquid aliquid et.',
                    'role': 'con',
                    'posted': '2017-04-07T18:37:34.944Z',
                    'userDistrict': 'id_district_104',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3687',
                            'owner': 'id_user_380',
                            'editors': ['id_user_380'],
                            'text': 'Et aut fugit et.',
                            'role': 'con',
                            'posted': '2017-04-01T18:37:24.344Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_3697',
                            'owner': 'id_user_289',
                            'editors': ['id_user_289'],
                            'text': 'Sequi ducimus necessitatibus.',
                            'role': 'pro',
                            'posted': '2017-04-06T08:50:10.497Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3685',
                            'owner': 'id_user_452',
                            'editors': ['id_user_452'],
                            'text': 'Non est voluptatum excepturi consequatur.',
                            'role': 'con',
                            'posted': '2017-04-08T18:43:34.161Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_3683',
                            'owner': 'id_user_160',
                            'editors': ['id_user_160'],
                            'text': 'Vitae non iste alias dicta.',
                            'role': 'pro',
                            'posted': '2017-04-02T13:33:46.598Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3690',
                            'owner': 'id_user_498',
                            'editors': ['id_user_498'],
                            'text': 'Distinctio recusandae illo quo id quidem accusamus cupiditate.',
                            'role': 'con',
                            'posted': '2017-04-06T09:47:35.405Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3700',
                            'owner': 'id_user_328',
                            'editors': ['id_user_328'],
                            'text': 'Vel vel aliquid aliquid et.',
                            'role': 'con',
                            'posted': '2017-04-07T18:37:34.944Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_3694',
                            'owner': 'id_user_466',
                            'editors': ['id_user_466'],
                            'text': 'Rerum veritatis magni rerum esse.',
                            'role': 'pro',
                            'posted': '2017-03-30T02:57:27.024Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3679',
                            'owner': 'id_user_409',
                            'editors': ['id_user_409'],
                            'text': 'Eligendi sequi eos.',
                            'role': 'con',
                            'posted': '2017-04-05T06:22:19.880Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_3686',
                            'owner': 'id_user_335',
                            'editors': ['id_user_335'],
                            'text': 'Voluptas necessitatibus sed neque enim commodi.',
                            'role': 'pro',
                            'posted': '2017-03-31T04:09:29.449Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_3689',
                            'owner': 'id_user_151',
                            'editors': ['id_user_151'],
                            'text': 'Eum consequatur aliquam.',
                            'role': 'con',
                            'posted': '2017-03-31T15:54:17.026Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3698',
                            'owner': 'id_user_456',
                            'editors': ['id_user_456'],
                            'text': 'Voluptate incidunt voluptatem quibusdam aut et sunt.',
                            'role': 'con',
                            'posted': '2017-03-30T21:02:24.813Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 1}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_3695',
                            'owner': 'id_user_307',
                            'editors': ['id_user_307'],
                            'text': 'Et aut nam qui accusamus vel.',
                            'role': 'pro',
                            'posted': '2017-04-08T15:58:54.260Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 1, 'down': 1}
                        }, 'con': null
                    },
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_3702': {
            'total': {'votes': {'yes': 54, 'no': 44}, 'comments': {'pro': 2, 'con': 3, 'neutral': 3}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 6, 'no': 5},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 4, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 6, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 4, 'no': 4}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 5, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 7, 'no': 8}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 7, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 4, 'no': 6}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_3802',
                    'owner': 'id_user_256',
                    'editors': ['id_user_256'],
                    'text': 'Debitis eum dolorem commodi ratione enim quibusdam saepe.',
                    'role': 'pro',
                    'posted': '2017-04-08T22:32:55.707Z',
                    'userDistrict': null,
                    'votes': {'up': 0, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_3808',
                    'owner': 'id_user_347',
                    'editors': ['id_user_347'],
                    'text': 'Non temporibus necessitatibus mollitia facilis quo placeat saepe fugit mollitia.',
                    'role': 'con',
                    'posted': '2017-04-07T06:39:31.697Z',
                    'userDistrict': 'id_district_106',
                    'votes': {'up': 3, 'down': 1}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3803',
                            'owner': 'id_user_371',
                            'editors': ['id_user_371'],
                            'text': 'Eius sunt optio soluta eos.',
                            'role': 'con',
                            'posted': '2017-04-12T07:28:08.547Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3808',
                            'owner': 'id_user_347',
                            'editors': ['id_user_347'],
                            'text': 'Non temporibus necessitatibus mollitia facilis quo placeat saepe fugit mollitia.',
                            'role': 'con',
                            'posted': '2017-04-07T06:39:31.697Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 3, 'down': 1}
                        }
                    },
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_3807',
                            'owner': 'id_user_230',
                            'editors': ['id_user_230'],
                            'text': 'Quidem cum sit libero.',
                            'role': 'pro',
                            'posted': '2017-04-07T01:05:47.330Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 2}
                        }, 'con': null
                    },
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3804',
                            'owner': 'id_user_258',
                            'editors': ['id_user_258'],
                            'text': 'Ea at harum aperiam dignissimos et commodi reprehenderit atque.',
                            'role': 'con',
                            'posted': '2017-04-03T18:26:45.481Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 2, 'down': 1}
                        }
                    }
                }
            }
        },
        'id_item_3809': {
            'total': {'votes': {'yes': 30, 'no': 38}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 6, 'no': 6},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 6, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 1, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 0, 'no': 7}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 2, 'no': 4}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 6, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 4, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_3879',
                    'owner': 'id_user_358',
                    'editors': ['id_user_358'],
                    'text': 'Odit ipsum magnam consequatur voluptatem et magni enim.',
                    'role': 'pro',
                    'posted': '2017-04-10T05:20:54.805Z',
                    'userDistrict': 'id_district_106',
                    'votes': {'up': 2, 'down': 2}
                },
                'con': {
                    'id': 'id_comment_3878',
                    'owner': 'id_user_306',
                    'editors': ['id_user_306'],
                    'text': 'Ut ut repellendus voluptas quod aut laudantium dicta.',
                    'role': 'con',
                    'posted': '2017-03-30T16:02:33.324Z',
                    'userDistrict': 'id_district_108',
                    'votes': {'up': 1, 'down': 1}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_3879',
                            'owner': 'id_user_358',
                            'editors': ['id_user_358'],
                            'text': 'Odit ipsum magnam consequatur voluptatem et magni enim.',
                            'role': 'pro',
                            'posted': '2017-04-10T05:20:54.805Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 2, 'down': 2}
                        }, 'con': null
                    },
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_3878',
                            'owner': 'id_user_306',
                            'editors': ['id_user_306'],
                            'text': 'Ut ut repellendus voluptas quod aut laudantium dicta.',
                            'role': 'con',
                            'posted': '2017-03-30T16:02:33.324Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 1}
                        }
                    },
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_3881': {
            'total': {'votes': {'yes': 55, 'no': 40}, 'comments': {'pro': 2, 'con': 1, 'neutral': 2}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 5, 'no': 3},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 6}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 8, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 4, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 3, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_106': {'votes': {'yes': 7, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 2, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 7, 'no': 1}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 7, 'no': 6}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_3980',
                    'owner': 'id_user_258',
                    'editors': ['id_user_258'],
                    'text': 'Nihil a omnis modi aut ex.',
                    'role': 'pro',
                    'posted': '2017-04-02T14:44:40.680Z',
                    'userDistrict': 'id_district_110',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_3978',
                    'owner': 'id_user_359',
                    'editors': ['id_user_359'],
                    'text': 'Qui qui quas deserunt ut.',
                    'role': 'con',
                    'posted': '2017-04-03T11:12:55.351Z',
                    'userDistrict': 'id_district_108',
                    'votes': {'up': 3, 'down': 2}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_3981',
                            'owner': 'id_user_272',
                            'editors': ['id_user_272'],
                            'text': 'Molestiae tenetur voluptates iste iure dolores exercitationem animi nobis.',
                            'role': 'pro',
                            'posted': '2017-04-02T17:19:07.148Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 1}
                        },
                        'con': {
                            'id': 'id_comment_3978',
                            'owner': 'id_user_359',
                            'editors': ['id_user_359'],
                            'text': 'Qui qui quas deserunt ut.',
                            'role': 'con',
                            'posted': '2017-04-03T11:12:55.351Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 3, 'down': 2}
                        }
                    },
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_3980',
                            'owner': 'id_user_258',
                            'editors': ['id_user_258'],
                            'text': 'Nihil a omnis modi aut ex.',
                            'role': 'pro',
                            'posted': '2017-04-02T14:44:40.680Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_3982': {
            'total': {'votes': {'yes': 55, 'no': 37}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 4, 'no': 2},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 6, 'no': 6}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 5, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 8, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 9, 'no': 7}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 6, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': null,
                'con': null,
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_4076': {
            'total': {'votes': {'yes': 38, 'no': 48}, 'comments': {'pro': 4, 'con': 5, 'neutral': 7}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 7, 'no': 4},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 1, 'no': 3}, 'comments': {'pro': 2, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 1, 'no': 6}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 4, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 5, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_108': {'votes': {'yes': 7, 'no': 9}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_110': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 0, 'con': 4, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_4163',
                    'owner': 'id_user_508',
                    'editors': ['id_user_508'],
                    'text': 'Deserunt temporibus dolorem vitae id sed.',
                    'role': 'pro',
                    'posted': '2017-04-11T22:42:45.903Z',
                    'userDistrict': 'id_district_102',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_4164',
                    'owner': 'id_user_238',
                    'editors': ['id_user_238'],
                    'text': 'Quas culpa velit non velit et nisi ut.',
                    'role': 'con',
                    'posted': '2017-04-12T00:42:18.490Z',
                    'userDistrict': 'id_district_110',
                    'votes': {'up': 0, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_4163',
                            'owner': 'id_user_508',
                            'editors': ['id_user_508'],
                            'text': 'Deserunt temporibus dolorem vitae id sed.',
                            'role': 'pro',
                            'posted': '2017-04-11T22:42:45.903Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_4164',
                            'owner': 'id_user_238',
                            'editors': ['id_user_238'],
                            'text': 'Quas culpa velit non velit et nisi ut.',
                            'role': 'con',
                            'posted': '2017-04-12T00:42:18.490Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_4179': {
            'total': {'votes': {'yes': 48, 'no': 45}, 'comments': {'pro': 0, 'con': 2, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 1, 'no': 4},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 4, 'no': 0}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 1, 'no': 7}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 5, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 2, 'no': 7}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 8, 'no': 9}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 6, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 7, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 4, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': null,
                'con': {
                    'id': 'id_comment_4274',
                    'owner': 'id_user_395',
                    'editors': ['id_user_395'],
                    'text': 'Dicta perferendis sed.',
                    'role': 'con',
                    'posted': '2017-04-02T01:31:39.492Z',
                    'userDistrict': 'id_district_102',
                    'votes': {'up': 3, 'down': 1}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_4274',
                            'owner': 'id_user_395',
                            'editors': ['id_user_395'],
                            'text': 'Dicta perferendis sed.',
                            'role': 'con',
                            'posted': '2017-04-02T01:31:39.492Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 3, 'down': 1}
                        }
                    },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_4273',
                            'owner': 'id_user_319',
                            'editors': ['id_user_319'],
                            'text': 'Odit voluptatem quae temporibus.',
                            'role': 'con',
                            'posted': '2017-04-04T17:09:44.016Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 1, 'down': 2}
                        }
                    },
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_4275': {
            'total': {'votes': {'yes': 6, 'no': 12}, 'comments': {'pro': 2, 'con': 4, 'neutral': 8}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 0, 'no': 0},
                    'comments': {'pro': 0, 'con': 1, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 0, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 2}},
                'id_district_108': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_110': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_4298',
                    'owner': 'id_user_245',
                    'editors': ['id_user_245'],
                    'text': 'Esse totam voluptate esse quidem velit consequatur commodi omnis maxime.',
                    'role': 'pro',
                    'posted': '2017-04-08T14:22:02.125Z',
                    'userDistrict': null,
                    'votes': {'up': 0, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_4305',
                    'owner': 'id_user_164',
                    'editors': ['id_user_164'],
                    'text': 'Et dolorum ex.',
                    'role': 'con',
                    'posted': '2017-04-09T19:42:48.143Z',
                    'userDistrict': 'id_district_105',
                    'votes': {'up': 2, 'down': 1}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_4300',
                            'owner': 'id_user_503',
                            'editors': ['id_user_503'],
                            'text': 'Commodi blanditiis est et.',
                            'role': 'con',
                            'posted': '2017-03-31T03:39:43.762Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_4305',
                            'owner': 'id_user_164',
                            'editors': ['id_user_164'],
                            'text': 'Et dolorum ex.',
                            'role': 'con',
                            'posted': '2017-04-09T19:42:48.143Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 2, 'down': 1}
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_4296',
                            'owner': 'id_user_119',
                            'editors': ['id_user_119'],
                            'text': 'Sit magnam placeat quia culpa aut.',
                            'role': 'con',
                            'posted': '2017-03-30T17:45:35.679Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_4307',
                            'owner': 'id_user_279',
                            'editors': ['id_user_279'],
                            'text': 'Autem doloremque numquam facilis animi modi.',
                            'role': 'con',
                            'posted': '2017-03-30T10:26:25.735Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_4308': {
            'total': {'votes': {'yes': 24, 'no': 30}, 'comments': {'pro': 20, 'con': 10, 'neutral': 15}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 2},
                    'comments': {'pro': 0, 'con': 1, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 2, 'con': 2, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 0, 'no': 0}, 'comments': {'pro': 1, 'con': 2, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 1, 'no': 5}, 'comments': {'pro': 1, 'con': 1, 'neutral': 2}},
                'id_district_105': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 1, 'con': 0, 'neutral': 4}},
                'id_district_106': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 4, 'con': 2, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 3, 'no': 5}, 'comments': {'pro': 4, 'con': 0, 'neutral': 2}},
                'id_district_109': {'votes': {'yes': 5, 'no': 4}, 'comments': {'pro': 1, 'con': 0, 'neutral': 3}},
                'id_district_110': {'votes': {'yes': 3, 'no': 1}, 'comments': {'pro': 2, 'con': 1, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_4386',
                    'owner': 'id_user_419',
                    'editors': ['id_user_419'],
                    'text': 'Reprehenderit suscipit officia voluptatibus dignissimos nihil cupiditate qui velit a.',
                    'role': 'pro',
                    'posted': '2017-04-05T19:45:45.482Z',
                    'userDistrict': null,
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_4388',
                    'owner': 'id_user_340',
                    'editors': ['id_user_340'],
                    'text': 'Ea natus suscipit aut explicabo vel cum rerum quisquam maiores.',
                    'role': 'con',
                    'posted': '2017-03-30T06:14:45.647Z',
                    'userDistrict': 'id_district_107',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_4369',
                            'owner': 'id_user_426',
                            'editors': ['id_user_426'],
                            'text': 'Voluptate similique alias laborum eveniet et beatae officia consequatur.',
                            'role': 'con',
                            'posted': '2017-04-12T13:35:55.486Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_4370',
                            'owner': 'id_user_382',
                            'editors': ['id_user_382'],
                            'text': 'Architecto eos natus non dolorum quis consequatur a eum.',
                            'role': 'pro',
                            'posted': '2017-04-05T19:21:39.527Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_4387',
                            'owner': 'id_user_467',
                            'editors': ['id_user_467'],
                            'text': 'Quo animi odit repellat.',
                            'role': 'con',
                            'posted': '2017-04-04T09:39:15.164Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_4380',
                            'owner': 'id_user_457',
                            'editors': ['id_user_457'],
                            'text': 'Sapiente aut ipsam nihil rerum.',
                            'role': 'pro',
                            'posted': '2017-03-31T19:43:07.765Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_4389',
                            'owner': 'id_user_175',
                            'editors': ['id_user_175'],
                            'text': 'Voluptatem neque sequi.',
                            'role': 'con',
                            'posted': '2017-04-12T18:38:51.572Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_4395',
                            'owner': 'id_user_333',
                            'editors': ['id_user_333'],
                            'text': 'Quia velit laboriosam facere dolor.',
                            'role': 'pro',
                            'posted': '2017-04-07T14:42:22.791Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_4396',
                            'owner': 'id_user_221',
                            'editors': ['id_user_221'],
                            'text': 'Sunt odio porro illum dignissimos optio aut voluptatem.',
                            'role': 'con',
                            'posted': '2017-04-10T07:42:56.714Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'id': 'id_comment_4399',
                            'owner': 'id_user_476',
                            'editors': ['id_user_476'],
                            'text': 'Repellat aut sint.',
                            'role': 'pro',
                            'posted': '2017-04-11T02:15:35.662Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_4365',
                            'owner': 'id_user_231',
                            'editors': ['id_user_231'],
                            'text': 'Nulla voluptas facilis iure vel consectetur impedit pariatur.',
                            'role': 'pro',
                            'posted': '2017-04-06T14:43:33.428Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_4372',
                            'owner': 'id_user_322',
                            'editors': ['id_user_322'],
                            'text': 'Veniam quisquam voluptatem magni consequatur.',
                            'role': 'con',
                            'posted': '2017-04-06T17:43:02.573Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_4363',
                            'owner': 'id_user_437',
                            'editors': ['id_user_437'],
                            'text': 'Qui omnis hic corporis voluptatem dolor sint rerum eaque.',
                            'role': 'pro',
                            'posted': '2017-03-29T23:08:43.311Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_4388',
                            'owner': 'id_user_340',
                            'editors': ['id_user_340'],
                            'text': 'Ea natus suscipit aut explicabo vel cum rerum quisquam maiores.',
                            'role': 'con',
                            'posted': '2017-03-30T06:14:45.647Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_4381',
                            'owner': 'id_user_479',
                            'editors': ['id_user_479'],
                            'text': 'A et culpa inventore suscipit ut assumenda.',
                            'role': 'pro',
                            'posted': '2017-03-31T08:48:04.422Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_4374',
                            'owner': 'id_user_307',
                            'editors': ['id_user_307'],
                            'text': 'Deleniti aut voluptates iure dignissimos sapiente.',
                            'role': 'pro',
                            'posted': '2017-04-09T02:40:10.759Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_4397',
                            'owner': 'id_user_156',
                            'editors': ['id_user_156'],
                            'text': 'Cum ducimus ab excepturi et unde quae nihil.',
                            'role': 'pro',
                            'posted': '2017-04-08T14:41:47.728Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_4407',
                            'owner': 'id_user_365',
                            'editors': ['id_user_365'],
                            'text': 'Alias doloribus velit.',
                            'role': 'con',
                            'posted': '2017-04-07T19:26:54.783Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_4408': {
            'total': {'votes': {'yes': 20, 'no': 16}, 'comments': {'pro': 1, 'con': 0, 'neutral': 2}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 0, 'no': 2},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 1, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 1, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 3, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_4447',
                    'owner': 'id_user_327',
                    'editors': ['id_user_327'],
                    'text': 'Minima ut voluptatem.',
                    'role': 'pro',
                    'posted': '2017-03-30T08:04:52.723Z',
                    'userDistrict': 'id_district_104',
                    'votes': {'up': 1, 'down': 3}
                },
                'con': null,
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_4447',
                            'owner': 'id_user_327',
                            'editors': ['id_user_327'],
                            'text': 'Minima ut voluptatem.',
                            'role': 'pro',
                            'posted': '2017-03-30T08:04:52.723Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 1, 'down': 3}
                        }, 'con': null
                    },
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_512': {
            'total': {'votes': {'yes': 45, 'no': 29}, 'comments': {'pro': 20, 'con': 14, 'neutral': 15}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 2},
                    'comments': {'pro': 3, 'con': 1, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 3, 'no': 6}, 'comments': {'pro': 0, 'con': 2, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 5, 'no': 1}, 'comments': {'pro': 5, 'con': 2, 'neutral': 2}},
                'id_district_104': {'votes': {'yes': 8, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 3}},
                'id_district_105': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 0, 'con': 2, 'neutral': 2}},
                'id_district_106': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 1, 'con': 2, 'neutral': 1}},
                'id_district_107': {'votes': {'yes': 3, 'no': 1}, 'comments': {'pro': 1, 'con': 1, 'neutral': 4}},
                'id_district_108': {'votes': {'yes': 5, 'no': 3}, 'comments': {'pro': 1, 'con': 3, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 7, 'no': 3}, 'comments': {'pro': 2, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 3, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_615',
                    'owner': 'id_user_430',
                    'editors': ['id_user_430'],
                    'text': 'Sint consequatur cupiditate qui rem.',
                    'role': 'pro',
                    'posted': '2017-04-05T14:43:43.787Z',
                    'userDistrict': 'id_district_103',
                    'votes': {'up': 2, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_610',
                    'owner': 'id_user_459',
                    'editors': ['id_user_459'],
                    'text': 'Dolorum culpa distinctio omnis accusamus non earum.',
                    'role': 'con',
                    'posted': '2017-04-02T09:03:25.829Z',
                    'userDistrict': 'id_district_102',
                    'votes': {'up': 0, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_601',
                            'owner': 'id_user_255',
                            'editors': ['id_user_255'],
                            'text': 'Qui quisquam dolor dignissimos et itaque in.',
                            'role': 'pro',
                            'posted': '2017-04-04T14:25:49.039Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_587',
                            'owner': 'id_user_232',
                            'editors': ['id_user_232'],
                            'text': 'Autem illo nisi laborum id voluptatem aliquid dicta.',
                            'role': 'con',
                            'posted': '2017-04-09T06:49:45.745Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_610',
                            'owner': 'id_user_459',
                            'editors': ['id_user_459'],
                            'text': 'Dolorum culpa distinctio omnis accusamus non earum.',
                            'role': 'con',
                            'posted': '2017-04-02T09:03:25.829Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_615',
                            'owner': 'id_user_430',
                            'editors': ['id_user_430'],
                            'text': 'Sint consequatur cupiditate qui rem.',
                            'role': 'pro',
                            'posted': '2017-04-05T14:43:43.787Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 2, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_612',
                            'owner': 'id_user_283',
                            'editors': ['id_user_283'],
                            'text': 'Expedita officiis aut ratione voluptatem.',
                            'role': 'con',
                            'posted': '2017-04-05T01:22:21.484Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_609',
                            'owner': 'id_user_221',
                            'editors': ['id_user_221'],
                            'text': 'Tempore recusandae adipisci consequatur.',
                            'role': 'pro',
                            'posted': '2017-03-30T07:34:02.947Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_625',
                            'owner': 'id_user_327',
                            'editors': ['id_user_327'],
                            'text': 'Nostrum quos alias aperiam est debitis.',
                            'role': 'con',
                            'posted': '2017-04-10T14:13:15.323Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_589',
                            'owner': 'id_user_271',
                            'editors': ['id_user_271'],
                            'text': 'Facere ut cupiditate consequatur.',
                            'role': 'con',
                            'posted': '2017-04-12T12:37:24.507Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_588',
                            'owner': 'id_user_214',
                            'editors': ['id_user_214'],
                            'text': 'Libero tempore voluptatum quo.',
                            'role': 'pro',
                            'posted': '2017-04-03T05:49:02.115Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_602',
                            'owner': 'id_user_493',
                            'editors': ['id_user_493'],
                            'text': 'Qui dignissimos alias et aspernatur dolorem sed laboriosam.',
                            'role': 'con',
                            'posted': '2017-04-10T02:47:27.177Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_599',
                            'owner': 'id_user_293',
                            'editors': ['id_user_293'],
                            'text': 'Dolores quisquam sed modi voluptatem dolorem.',
                            'role': 'pro',
                            'posted': '2017-03-30T12:24:27.746Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_631',
                            'owner': 'id_user_373',
                            'editors': ['id_user_373'],
                            'text': 'Cumque esse voluptas repellat reiciendis fuga minima.',
                            'role': 'con',
                            'posted': '2017-04-03T16:03:33.689Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_598',
                            'owner': 'id_user_237',
                            'editors': ['id_user_237'],
                            'text': 'A autem aspernatur consequatur praesentium est sunt.',
                            'role': 'pro',
                            'posted': '2017-04-11T21:46:16.737Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_586',
                            'owner': 'id_user_323',
                            'editors': ['id_user_323'],
                            'text': 'Veniam magnam magni quo et.',
                            'role': 'con',
                            'posted': '2017-03-31T09:46:10.964Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_608',
                            'owner': 'id_user_174',
                            'editors': ['id_user_174'],
                            'text': 'Accusantium commodi repudiandae exercitationem similique reiciendis qui modi nam omnis.',
                            'role': 'pro',
                            'posted': '2017-04-01T09:33:39.115Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_616',
                            'owner': 'id_user_219',
                            'editors': ['id_user_219'],
                            'text': 'Laborum maiores magni est numquam quos et ea laboriosam tempore.',
                            'role': 'pro',
                            'posted': '2017-04-11T00:27:45.182Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_634': {
            'total': {'votes': {'yes': 30, 'no': 30}, 'comments': {'pro': 16, 'con': 18, 'neutral': 13}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 3, 'no': 3},
                    'comments': {'pro': 1, 'con': 2, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 4, 'no': 3}, 'comments': {'pro': 3, 'con': 1, 'neutral': 2}},
                'id_district_104': {'votes': {'yes': 2, 'no': 4}, 'comments': {'pro': 0, 'con': 3, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 3, 'neutral': 1}},
                'id_district_106': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 4, 'con': 1, 'neutral': 3}},
                'id_district_107': {'votes': {'yes': 4, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 0, 'con': 1, 'neutral': 5}},
                'id_district_109': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 2, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 1, 'no': 6}, 'comments': {'pro': 2, 'con': 2, 'neutral': 1}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_716',
                    'owner': 'id_user_171',
                    'editors': ['id_user_171'],
                    'text': 'Dolorem et neque quis dolore inventore earum.',
                    'role': 'pro',
                    'posted': '2017-04-09T12:40:35.617Z',
                    'userDistrict': null,
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_726',
                    'owner': 'id_user_440',
                    'editors': ['id_user_440'],
                    'text': 'Eveniet vitae voluptatem autem exercitationem nihil.',
                    'role': 'con',
                    'posted': '2017-04-08T08:53:29.160Z',
                    'userDistrict': 'id_district_110',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_731',
                            'owner': 'id_user_355',
                            'editors': ['id_user_355'],
                            'text': 'Quaerat repellat dicta fugiat.',
                            'role': 'pro',
                            'posted': '2017-04-01T12:41:23.930Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_717',
                            'owner': 'id_user_345',
                            'editors': ['id_user_345'],
                            'text': 'Cum est voluptatum facere.',
                            'role': 'con',
                            'posted': '2017-04-05T16:33:04.326Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 1}
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_718',
                            'owner': 'id_user_168',
                            'editors': ['id_user_168'],
                            'text': 'Consequatur repellendus neque.',
                            'role': 'pro',
                            'posted': '2017-04-11T13:56:32.126Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 2, 'down': 1}
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_702',
                            'owner': 'id_user_507',
                            'editors': ['id_user_507'],
                            'text': 'Ut corporis dolore perspiciatis minus rerum omnis.',
                            'role': 'pro',
                            'posted': '2017-04-12T07:55:54.909Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_735',
                            'owner': 'id_user_430',
                            'editors': ['id_user_430'],
                            'text': 'Occaecati aut qui ut.',
                            'role': 'con',
                            'posted': '2017-04-07T09:02:15.112Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_728',
                            'owner': 'id_user_327',
                            'editors': ['id_user_327'],
                            'text': 'Voluptas eligendi quia consequuntur rerum ad.',
                            'role': 'con',
                            'posted': '2017-04-01T12:27:09.326Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_701',
                            'owner': 'id_user_182',
                            'editors': ['id_user_182'],
                            'text': 'Ab est non voluptatem.',
                            'role': 'con',
                            'posted': '2017-04-02T08:59:20.138Z',
                            'userDistrict': 'id_district_105',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'id': 'id_comment_696',
                            'owner': 'id_user_322',
                            'editors': ['id_user_322'],
                            'text': 'Consequatur recusandae ea non sed suscipit quas modi nobis ea.',
                            'role': 'pro',
                            'posted': '2017-04-01T22:16:07.132Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_727',
                            'owner': 'id_user_214',
                            'editors': ['id_user_214'],
                            'text': 'Cupiditate voluptas omnis cum nam.',
                            'role': 'con',
                            'posted': '2017-04-02T18:19:25.758Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_730',
                            'owner': 'id_user_410',
                            'editors': ['id_user_410'],
                            'text': 'Et laudantium maxime minus ratione ut ut.',
                            'role': 'con',
                            'posted': '2017-04-07T11:26:16.771Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_721',
                            'owner': 'id_user_448',
                            'editors': ['id_user_448'],
                            'text': 'Consequatur et eveniet consequatur soluta dolorem iure magni.',
                            'role': 'con',
                            'posted': '2017-04-03T16:18:13.022Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_700',
                            'owner': 'id_user_451',
                            'editors': ['id_user_451'],
                            'text': 'Et est optio occaecati ullam iusto est aut est.',
                            'role': 'pro',
                            'posted': '2017-04-05T07:58:39.942Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': {
                            'id': 'id_comment_703',
                            'owner': 'id_user_348',
                            'editors': ['id_user_348'],
                            'text': 'Quos nostrum eum.',
                            'role': 'pro',
                            'posted': '2017-04-04T16:21:24.983Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_726',
                            'owner': 'id_user_440',
                            'editors': ['id_user_440'],
                            'text': 'Eveniet vitae voluptatem autem exercitationem nihil.',
                            'role': 'con',
                            'posted': '2017-04-08T08:53:29.160Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 1, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_742': {
            'total': {'votes': {'yes': 37, 'no': 29}, 'comments': {'pro': 4, 'con': 3, 'neutral': 6}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 1},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 1}
                },
                'id_district_102': {'votes': {'yes': 4, 'no': 4}, 'comments': {'pro': 1, 'con': 0, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 3, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_105': {'votes': {'yes': 1, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 3, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 3, 'no': 5}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 1, 'con': 2, 'neutral': 1}},
                'id_district_109': {'votes': {'yes': 7, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_110': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_816',
                    'owner': 'id_user_448',
                    'editors': ['id_user_448'],
                    'text': 'Vel velit est error eos tempora nostrum excepturi et qui.',
                    'role': 'pro',
                    'posted': '2017-04-04T11:54:48.232Z',
                    'userDistrict': 'id_district_108',
                    'votes': {'up': 0, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_821',
                    'owner': 'id_user_460',
                    'editors': ['id_user_460'],
                    'text': 'Aut adipisci quis vel et.',
                    'role': 'con',
                    'posted': '2017-04-07T00:46:09.839Z',
                    'userDistrict': 'id_district_104',
                    'votes': {'up': 1, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_813',
                            'owner': 'id_user_115',
                            'editors': ['id_user_115'],
                            'text': 'Placeat porro qui voluptatem exercitationem non quia necessitatibus qui dolorem.',
                            'role': 'pro',
                            'posted': '2017-04-12T03:09:36.257Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 3}
                        }, 'con': null
                    },
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {
                        'pro': {
                            'id': 'id_comment_817',
                            'owner': 'id_user_438',
                            'editors': ['id_user_438'],
                            'text': 'Sapiente consequatur eaque corporis at porro aut cumque veniam sequi.',
                            'role': 'pro',
                            'posted': '2017-04-01T06:08:53.634Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 0, 'down': 2}
                        },
                        'con': {
                            'id': 'id_comment_821',
                            'owner': 'id_user_460',
                            'editors': ['id_user_460'],
                            'text': 'Aut adipisci quis vel et.',
                            'role': 'con',
                            'posted': '2017-04-07T00:46:09.839Z',
                            'userDistrict': 'id_district_104',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': {
                            'id': 'id_comment_816',
                            'owner': 'id_user_448',
                            'editors': ['id_user_448'],
                            'text': 'Vel velit est error eos tempora nostrum excepturi et qui.',
                            'role': 'pro',
                            'posted': '2017-04-04T11:54:48.232Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_812',
                            'owner': 'id_user_400',
                            'editors': ['id_user_400'],
                            'text': 'Aut et enim quisquam.',
                            'role': 'con',
                            'posted': '2017-04-08T12:24:02.243Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_822': {
            'total': {'votes': {'yes': 14, 'no': 16}, 'comments': {'pro': 4, 'con': 3, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 1, 'no': 1},
                    'comments': {'pro': 1, 'con': 1, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 1, 'con': 1, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 3, 'no': 0}, 'comments': {'pro': 1, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 3, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_856',
                    'owner': 'id_user_461',
                    'editors': ['id_user_461'],
                    'text': 'Fugit unde vel deleniti deleniti impedit optio harum.',
                    'role': 'pro',
                    'posted': '2017-04-12T09:41:42.668Z',
                    'userDistrict': 'id_district_101',
                    'votes': {'up': 1, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_859',
                    'owner': 'id_user_322',
                    'editors': ['id_user_322'],
                    'text': 'Ex fuga quidem saepe dolorum sed quis ut.',
                    'role': 'con',
                    'posted': '2017-04-02T04:37:33.764Z',
                    'userDistrict': 'id_district_106',
                    'votes': {'up': 2, 'down': 1}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'id': 'id_comment_856',
                            'owner': 'id_user_461',
                            'editors': ['id_user_461'],
                            'text': 'Fugit unde vel deleniti deleniti impedit optio harum.',
                            'role': 'pro',
                            'posted': '2017-04-12T09:41:42.668Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_853',
                            'owner': 'id_user_441',
                            'editors': ['id_user_441'],
                            'text': 'Et est iure tenetur.',
                            'role': 'con',
                            'posted': '2017-04-05T14:38:23.807Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'id': 'id_comment_854',
                            'owner': 'id_user_277',
                            'editors': ['id_user_277'],
                            'text': 'Fugit est libero libero amet.',
                            'role': 'pro',
                            'posted': '2017-04-12T12:57:16.727Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_855',
                            'owner': 'id_user_298',
                            'editors': ['id_user_298'],
                            'text': 'Aut placeat et modi et.',
                            'role': 'con',
                            'posted': '2017-04-09T07:28:03.037Z',
                            'userDistrict': 'id_district_102',
                            'votes': {'up': 0, 'down': 1}
                        }
                    },
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_859',
                            'owner': 'id_user_322',
                            'editors': ['id_user_322'],
                            'text': 'Ex fuga quidem saepe dolorum sed quis ut.',
                            'role': 'con',
                            'posted': '2017-04-02T04:37:33.764Z',
                            'userDistrict': 'id_district_106',
                            'votes': {'up': 2, 'down': 1}
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'id': 'id_comment_857',
                            'owner': 'id_user_455',
                            'editors': ['id_user_455'],
                            'text': 'Qui consequatur est id atque nihil sit quas animi.',
                            'role': 'pro',
                            'posted': '2017-03-30T19:13:42.053Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 1, 'down': 0}
                        }, 'con': null
                    },
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_860': {
            'total': {'votes': {'yes': 20, 'no': 13}, 'comments': {'pro': 4, 'con': 8, 'neutral': 5}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 3, 'no': 1},
                    'comments': {'pro': 0, 'con': 1, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 2, 'no': 0}, 'comments': {'pro': 0, 'con': 0, 'neutral': 1}},
                'id_district_103': {'votes': {'yes': 3, 'no': 2}, 'comments': {'pro': 1, 'con': 1, 'neutral': 1}},
                'id_district_104': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 2, 'con': 2, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 2, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 3}}
            },
            'topComments': {
                'pro': {
                    'id': 'id_comment_899',
                    'owner': 'id_user_332',
                    'editors': ['id_user_332'],
                    'text': 'Enim a harum deserunt omnis.',
                    'role': 'pro',
                    'posted': '2017-04-03T17:41:14.227Z',
                    'userDistrict': 'id_district_109',
                    'votes': {'up': 0, 'down': 0}
                },
                'con': {
                    'id': 'id_comment_901',
                    'owner': 'id_user_236',
                    'editors': ['id_user_236'],
                    'text': 'Cum consequuntur non qui doloremque eius.',
                    'role': 'con',
                    'posted': '2017-04-07T08:06:14.645Z',
                    'userDistrict': 'id_district_109',
                    'votes': {'up': 2, 'down': 0}
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_900',
                            'owner': 'id_user_112',
                            'editors': ['id_user_112'],
                            'text': 'Magni vel omnis dolore.',
                            'role': 'con',
                            'posted': '2017-04-04T00:56:36.087Z',
                            'userDistrict': 'id_district_101',
                            'votes': {'up': 1, 'down': 0}
                        }
                    },
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {
                        'pro': {
                            'id': 'id_comment_906',
                            'owner': 'id_user_160',
                            'editors': ['id_user_160'],
                            'text': 'Voluptas eligendi suscipit.',
                            'role': 'pro',
                            'posted': '2017-04-03T03:45:39.812Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 0, 'down': 1}
                        },
                        'con': {
                            'id': 'id_comment_907',
                            'owner': 'id_user_369',
                            'editors': ['id_user_369'],
                            'text': 'Dolor et quae.',
                            'role': 'con',
                            'posted': '2017-04-08T07:18:14.114Z',
                            'userDistrict': 'id_district_103',
                            'votes': {'up': 2, 'down': 0}
                        }
                    },
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_894',
                            'owner': 'id_user_373',
                            'editors': ['id_user_373'],
                            'text': 'Rerum doloremque qui.',
                            'role': 'con',
                            'posted': '2017-04-08T03:44:54.028Z',
                            'userDistrict': 'id_district_107',
                            'votes': {'up': 0, 'down': 0}
                        }
                    },
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {
                        'pro': {
                            'id': 'id_comment_899',
                            'owner': 'id_user_332',
                            'editors': ['id_user_332'],
                            'text': 'Enim a harum deserunt omnis.',
                            'role': 'pro',
                            'posted': '2017-04-03T17:41:14.227Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 0, 'down': 0}
                        },
                        'con': {
                            'id': 'id_comment_901',
                            'owner': 'id_user_236',
                            'editors': ['id_user_236'],
                            'text': 'Cum consequuntur non qui doloremque eius.',
                            'role': 'con',
                            'posted': '2017-04-07T08:06:14.645Z',
                            'userDistrict': 'id_district_109',
                            'votes': {'up': 2, 'down': 0}
                        }
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_897',
                            'owner': 'id_user_244',
                            'editors': ['id_user_244'],
                            'text': 'Labore hic rerum beatae.',
                            'role': 'con',
                            'posted': '2017-03-31T14:38:12.525Z',
                            'userDistrict': 'id_district_110',
                            'votes': {'up': 1, 'down': 0}
                        }
                    }
                }
            }
        },
        'id_item_911': {
            'total': {'votes': {'yes': 18, 'no': 22}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 1, 'no': 1},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 1, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 1, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 4, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 1, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 2, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 0, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 4, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': null,
                'con': null,
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {'pro': null, 'con': null},
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        },
        'id_item_952': {
            'total': {'votes': {'yes': 38, 'no': 29}, 'comments': {'pro': 0, 'con': 2, 'neutral': 0}},
            'byDistrict': {
                'id_district_101': {
                    'votes': {'yes': 2, 'no': 2},
                    'comments': {'pro': 0, 'con': 0, 'neutral': 0}
                },
                'id_district_102': {'votes': {'yes': 6, 'no': 3}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_103': {'votes': {'yes': 2, 'no': 4}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_104': {'votes': {'yes': 3, 'no': 6}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_105': {'votes': {'yes': 0, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_106': {'votes': {'yes': 4, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_107': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_108': {'votes': {'yes': 4, 'no': 1}, 'comments': {'pro': 0, 'con': 1, 'neutral': 0}},
                'id_district_109': {'votes': {'yes': 2, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}},
                'id_district_110': {'votes': {'yes': 6, 'no': 2}, 'comments': {'pro': 0, 'con': 0, 'neutral': 0}}
            },
            'topComments': {
                'pro': null,
                'con': {
                    'id': 'id_comment_1020',
                    'owner': 'id_user_462',
                    'editors': ['id_user_462'],
                    'text': 'Debitis et suscipit porro iusto repellendus qui dolorum occaecati quis.',
                    'role': 'con',
                    'posted': '2017-04-01T03:50:10.709Z',
                    'userDistrict': null,
                    'votes': {'up': 2, 'down': 1}
                },
                'byDistrict': {
                    'id_district_101': {'pro': null, 'con': null},
                    'id_district_102': {'pro': null, 'con': null},
                    'id_district_103': {'pro': null, 'con': null},
                    'id_district_104': {'pro': null, 'con': null},
                    'id_district_105': {'pro': null, 'con': null},
                    'id_district_106': {'pro': null, 'con': null},
                    'id_district_107': {'pro': null, 'con': null},
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'id': 'id_comment_1021',
                            'owner': 'id_user_226',
                            'editors': ['id_user_226'],
                            'text': 'Maiores repellat est nostrum.',
                            'role': 'con',
                            'posted': '2017-04-05T15:52:50.603Z',
                            'userDistrict': 'id_district_108',
                            'votes': {'up': 1, 'down': 1}
                        }
                    },
                    'id_district_109': {'pro': null, 'con': null},
                    'id_district_110': {'pro': null, 'con': null}
                }
            }
        }
    }
};

