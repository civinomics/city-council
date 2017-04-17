import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Meeting, MeetingStats, parseMeeting, RawMeeting } from './meeting.model';
import { AngularFireDatabase } from 'angularfire2';
import { Item } from '../item/item.model';
import { ItemService } from '../item/item.service';
import { Actions, Effect, toPayload } from '@ngrx/effects';
import { SELECT_GROUP, SELECT_MEETING } from '../core/focus.reducer';
import { Store } from '@ngrx/store';
import { AppState, getFocusedMeeting, getGroups, getItemsOnSelectedMeetingAgenda, getLoadedMeetingIds } from '../state';
import { Http } from '@angular/http';
import { parseComment } from '../comment/comment.model';
import { MeetingLoadedAction } from './meeting.reducer';

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

    public setPublished(meetingId: string, value: boolean) {
        this.db.object(`/meeting/${meetingId}`).update({ published: value });
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

const devStats = {
    'priors': [ { 'date': '2017-03-07T23:21:34.892Z', 'value': 0 }, {
        'date': '2017-04-04T22:21:34.634Z',
        'value': 0
    }, { 'date': '2017-03-21T22:21:34.762Z', 'value': 0 } ],
    'total': {
        'votes': 2487,
        'comments': 1260,
        'participants': 400,
        'byDistrict': {
            'NO_DISTRICT': { 'votes': 2487, 'comments': 183, 'participants': 55 },
            'id_district_101': { 'votes': 200, 'comments': 87, 'participants': 33 },
            'id_district_102': { 'votes': 231, 'comments': 105, 'participants': 36 },
            'id_district_103': { 'votes': 178, 'comments': 102, 'participants': 30 },
            'id_district_104': { 'votes': 194, 'comments': 113, 'participants': 31 },
            'id_district_105': { 'votes': 194, 'comments': 88, 'participants': 31 },
            'id_district_106': { 'votes': 268, 'comments': 135, 'participants': 41 },
            'id_district_107': { 'votes': 199, 'comments': 110, 'participants': 34 },
            'id_district_108': { 'votes': 218, 'comments': 112, 'participants': 34 },
            'id_district_109': { 'votes': 259, 'comments': 134, 'participants': 42 },
            'id_district_110': { 'votes': 196, 'comments': 91, 'participants': 33 }
        }
    },
    'byItem': {
        'id_item_1032': {
            'total': {
                'votes': { 'yes': 1, 'no': 0 },
                'comments': { 'pro': 12, 'con': 19, 'neutral': 13 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 0 },
                    'comments': { 'pro': 2, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 2 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 4, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 3, 'con': 2, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_429',
                    'posted': '2017-04-08T04:44:23.276Z',
                    'role': 'pro',
                    'text': 'Rerum amet dolorem ratione necessitatibus qui.',
                    'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                    'id': 'id_comment_1043',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_109',
                                'name': 'District 9',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Evangeline',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/larrybolt/128.jpg',
                        'lastName': 'Brown',
                        'id': 'id_user_429'
                    }
                },
                'con': {
                    'owner': 'id_user_256',
                    'posted': '2017-04-10T02:06:06.639Z',
                    'role': 'con',
                    'text': 'Harum dolorem rem repellat ratione recusandae a.',
                    'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                    'id': 'id_comment_1063',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_104',
                                'name': 'District 4',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Mittie',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andrewofficer/128.jpg',
                        'lastName': 'Kreiger',
                        'id': 'id_user_256'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_427',
                            'posted': '2017-04-16T20:47:53.807Z',
                            'role': 'pro',
                            'text': 'Eligendi soluta ut.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1041',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Marta',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ruzinav/128.jpg',
                                'lastName': 'Barrows',
                                'id': 'id_user_427'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_400',
                            'posted': '2017-04-16T23:33:59.522Z',
                            'role': 'pro',
                            'text': 'Dolor non quae.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1055',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Thalia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bolzanmarco/128.jpg',
                                'lastName': 'Bode',
                                'id': 'id_user_400'
                            }
                        },
                        'con': {
                            'owner': 'id_user_267',
                            'posted': '2017-04-10T21:37:24.238Z',
                            'role': 'con',
                            'text': 'Commodi corporis quia asperiores odio doloremque dolorum beatae porro.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1059',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Gabriel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marciotoledo/128.jpg',
                                'lastName': 'Predovic',
                                'id': 'id_user_267'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_287',
                            'posted': '2017-04-07T05:49:02.876Z',
                            'role': 'pro',
                            'text': 'Vero cupiditate doloribus.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1076',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Michael',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gmourier/128.jpg',
                                'lastName': 'Hodkiewicz',
                                'id': 'id_user_287'
                            }
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_256',
                            'posted': '2017-04-10T02:06:06.639Z',
                            'role': 'con',
                            'text': 'Harum dolorem rem repellat ratione recusandae a.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1063',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Mittie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andrewofficer/128.jpg',
                                'lastName': 'Kreiger',
                                'id': 'id_user_256'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_219',
                            'posted': '2017-04-08T18:02:59.110Z',
                            'role': 'con',
                            'text': 'Omnis officia ex officiis eum totam ea esse.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1050',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Obie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mufaddal_mw/128.jpg',
                                'lastName': 'Gislason',
                                'id': 'id_user_219'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_409',
                            'posted': '2017-04-17T00:18:02.667Z',
                            'role': 'con',
                            'text': 'Et et amet possimus et.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1044',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Derick',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marclgonzales/128.jpg',
                                'lastName': 'Connelly',
                                'id': 'id_user_409'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_364',
                            'posted': '2017-04-05T00:07:15.794Z',
                            'role': 'pro',
                            'text': 'Magni numquam accusamus est.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1049',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'May',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kalmerrautam/128.jpg',
                                'lastName': 'Kovacek',
                                'id': 'id_user_364'
                            }
                        },
                        'con': {
                            'owner': 'id_user_451',
                            'posted': '2017-04-12T03:05:27.787Z',
                            'role': 'con',
                            'text': 'Ut facere rerum eos ab vel harum rerum placeat.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1065',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Retta',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/michaelabehsera/128.jpg',
                                'lastName': 'Leuschke',
                                'id': 'id_user_451'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_495',
                            'posted': '2017-04-07T00:52:56.878Z',
                            'role': 'pro',
                            'text': 'Officia aut est ut quisquam facilis tempore dignissimos tempore.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1053',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Suzanne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nitinhayaran/128.jpg',
                                'lastName': 'Dicki',
                                'id': 'id_user_495'
                            }
                        },
                        'con': {
                            'owner': 'id_user_395',
                            'posted': '2017-04-10T02:57:10.079Z',
                            'role': 'con',
                            'text': 'Quas dolor natus ut.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1038',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Romaine',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jonsgotwood/128.jpg',
                                'lastName': 'Crona',
                                'id': 'id_user_395'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_429',
                            'posted': '2017-04-08T04:44:23.276Z',
                            'role': 'pro',
                            'text': 'Rerum amet dolorem ratione necessitatibus qui.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1043',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Evangeline',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/larrybolt/128.jpg',
                                'lastName': 'Brown',
                                'id': 'id_user_429'
                            }
                        },
                        'con': {
                            'owner': 'id_user_429',
                            'posted': '2017-04-07T06:50:18.841Z',
                            'role': 'con',
                            'text': 'Eos assumenda velit quas.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1052',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Evangeline',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/larrybolt/128.jpg',
                                'lastName': 'Brown',
                                'id': 'id_user_429'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_352',
                            'posted': '2017-04-10T16:07:49.332Z',
                            'role': 'con',
                            'text': 'Id distinctio praesentium est.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_1042',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Tania',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/garand/128.jpg',
                                'lastName': 'Beatty',
                                'id': 'id_user_352'
                            }
                        }
                    }
                }
            }
        },
        'id_item_1078': {
            'total': {
                'votes': { 'yes': 55, 'no': 45 },
                'comments': { 'pro': 8, 'con': 12, 'neutral': 6 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 7, 'no': 6 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 1, 'no': 7 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 5, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 7, 'no': 4 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 7, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 3 } },
                'id_district_107': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 6, 'no': 4 }, 'comments': { 'pro': 2, 'con': 3, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 6, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_378',
                    'posted': '2017-04-10T06:47:05.617Z',
                    'role': 'pro',
                    'text': 'Laboriosam qui nihil quibusdam ratione rerum nam.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_1199',
                    'votes': { 'up': 3, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Laron',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/teddyzetterlund/128.jpg',
                        'lastName': 'Boehm',
                        'id': 'id_user_378'
                    }
                },
                'con': {
                    'owner': 'id_user_155',
                    'posted': '2017-04-05T12:21:15.964Z',
                    'role': 'con',
                    'text': 'Eum sit error error doloribus rerum magni velit laborum sunt.',
                    'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                    'id': 'id_comment_1179',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_109',
                                'name': 'District 9',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Cecelia',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marciotoledo/128.jpg',
                        'lastName': 'Feeney',
                        'id': 'id_user_155'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_267',
                            'posted': '2017-04-17T08:50:57.923Z',
                            'role': 'con',
                            'text': 'Dicta itaque dolores dignissimos quas at suscipit.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1180',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Gabriel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marciotoledo/128.jpg',
                                'lastName': 'Predovic',
                                'id': 'id_user_267'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_423',
                            'posted': '2017-04-07T02:27:45.614Z',
                            'role': 'con',
                            'text': 'Odit id exercitationem quo.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1203',
                            'votes': { 'up': 1, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jovanny',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alexandermayes/128.jpg',
                                'lastName': 'Kertzmann',
                                'id': 'id_user_423'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_458',
                            'posted': '2017-04-12T03:51:15.680Z',
                            'role': 'con',
                            'text': 'Quia possimus eligendi reprehenderit et qui eos facilis quaerat esse.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1187',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Justyn',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wikiziner/128.jpg',
                                'lastName': 'Rolfson',
                                'id': 'id_user_458'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_133',
                            'posted': '2017-04-07T12:16:26.489Z',
                            'role': 'pro',
                            'text': 'Quod expedita rerum est.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1195',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Claudia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/longlivemyword/128.jpg',
                                'lastName': 'Ziemann',
                                'id': 'id_user_133'
                            }
                        },
                        'con': {
                            'owner': 'id_user_195',
                            'posted': '2017-04-04T19:34:05.976Z',
                            'role': 'con',
                            'text': 'Et omnis magni impedit occaecati vel voluptatibus laboriosam veniam.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1200',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jolie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dannol/128.jpg',
                                'lastName': 'Hoppe',
                                'id': 'id_user_195'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_264',
                            'posted': '2017-04-14T12:46:36.865Z',
                            'role': 'con',
                            'text': 'Enim id et impedit earum fugiat nemo.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1204',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Arden',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/malykhinv/128.jpg',
                                'lastName': 'Terry',
                                'id': 'id_user_264'
                            }
                        }
                    },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_378',
                            'posted': '2017-04-10T06:47:05.617Z',
                            'role': 'pro',
                            'text': 'Laboriosam qui nihil quibusdam ratione rerum nam.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1199',
                            'votes': { 'up': 3, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Laron',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/teddyzetterlund/128.jpg',
                                'lastName': 'Boehm',
                                'id': 'id_user_378'
                            }
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_382',
                            'posted': '2017-04-06T06:34:30.864Z',
                            'role': 'pro',
                            'text': 'Minima labore eligendi reiciendis est a voluptas et.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1181',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Elena',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nelsonjoyce/128.jpg',
                                'lastName': 'Breitenberg',
                                'id': 'id_user_382'
                            }
                        },
                        'con': {
                            'owner': 'id_user_155',
                            'posted': '2017-04-05T12:21:15.964Z',
                            'role': 'con',
                            'text': 'Eum sit error error doloribus rerum magni velit laborum sunt.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1179',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Cecelia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marciotoledo/128.jpg',
                                'lastName': 'Feeney',
                                'id': 'id_user_155'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_385',
                            'posted': '2017-04-09T04:04:59.861Z',
                            'role': 'pro',
                            'text': 'Sit praesentium neque est iure deserunt ratione accusantium et officiis.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_1186',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Johan',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/malgordon/128.jpg',
                                'lastName': 'Erdman',
                                'id': 'id_user_385'
                            }
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_1205': {
            'total': {
                'votes': { 'yes': 26, 'no': 26 },
                'comments': { 'pro': 14, 'con': 18, 'neutral': 18 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 1 },
                    'comments': { 'pro': 1, 'con': 2, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 1, 'con': 4, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 2 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 2 } },
                'id_district_105': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 2 } },
                'id_district_108': { 'votes': { 'yes': 8, 'no': 2 }, 'comments': { 'pro': 3, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 4, 'no': 5 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 4 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 3 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_487',
                    'posted': '2017-04-08T05:36:09.758Z',
                    'role': 'pro',
                    'text': 'Quas qui ullam sint aliquam.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_1279',
                    'votes': { 'up': 2, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Justice',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arindam_/128.jpg',
                        'lastName': 'Bechtelar',
                        'id': 'id_user_487'
                    }
                },
                'con': {
                    'owner': 'id_user_113',
                    'posted': '2017-04-04T04:22:49.910Z',
                    'role': 'con',
                    'text': 'Totam saepe velit sed.',
                    'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                    'id': 'id_comment_1265',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_101',
                                'name': 'District 1',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Amber',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dc_user/128.jpg',
                        'lastName': 'Walter',
                        'id': 'id_user_113'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_281',
                            'posted': '2017-04-06T17:45:41.959Z',
                            'role': 'pro',
                            'text': 'Impedit quod eum consequatur nobis.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1306',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Marques',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ahmadajmi/128.jpg',
                                'lastName': 'Corwin',
                                'id': 'id_user_281'
                            }
                        },
                        'con': {
                            'owner': 'id_user_113',
                            'posted': '2017-04-04T04:22:49.910Z',
                            'role': 'con',
                            'text': 'Totam saepe velit sed.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1265',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Amber',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dc_user/128.jpg',
                                'lastName': 'Walter',
                                'id': 'id_user_113'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_267',
                            'posted': '2017-04-08T14:30:45.984Z',
                            'role': 'pro',
                            'text': 'Temporibus commodi est.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1301',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Gabriel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marciotoledo/128.jpg',
                                'lastName': 'Predovic',
                                'id': 'id_user_267'
                            }
                        },
                        'con': {
                            'owner': 'id_user_121',
                            'posted': '2017-04-05T21:22:17.770Z',
                            'role': 'con',
                            'text': 'Reiciendis et quisquam nesciunt et qui nobis nesciunt adipisci voluptatibus.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1272',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Rico',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joshuaraichur/128.jpg',
                                'lastName': 'Waters',
                                'id': 'id_user_121'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_117',
                            'posted': '2017-04-12T11:00:27.864Z',
                            'role': 'con',
                            'text': 'Expedita veritatis sunt odio officia nobis.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1299',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Aiyana',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/posterjob/128.jpg',
                                'lastName': 'Hahn',
                                'id': 'id_user_117'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_297',
                            'posted': '2017-04-04T14:16:51.373Z',
                            'role': 'pro',
                            'text': 'Est unde officia ad quidem et quae.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1262',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Maximo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/katiemdaly/128.jpg',
                                'lastName': 'Doyle',
                                'id': 'id_user_297'
                            }
                        },
                        'con': {
                            'owner': 'id_user_205',
                            'posted': '2017-04-14T21:52:55.028Z',
                            'role': 'con',
                            'text': 'Modi omnis ratione et odit.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1307',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Brad',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/scottkclark/128.jpg',
                                'lastName': 'Swift',
                                'id': 'id_user_205'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_247',
                            'posted': '2017-04-05T07:19:52.544Z',
                            'role': 'con',
                            'text': 'Qui fugiat molestiae et laudantium tenetur eaque.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1285',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Westley',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kucingbelang4/128.jpg',
                                'lastName': 'Fadel',
                                'id': 'id_user_247'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_188',
                            'posted': '2017-04-12T09:37:10.396Z',
                            'role': 'con',
                            'text': 'Distinctio voluptate mollitia.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1278',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Dominique',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lepinski/128.jpg',
                                'lastName': 'Dicki',
                                'id': 'id_user_188'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_298',
                            'posted': '2017-04-09T09:11:25.980Z',
                            'role': 'pro',
                            'text': 'Rem nihil ea magnam reprehenderit non occaecati libero.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1266',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Aliyah',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arishi_/128.jpg',
                                'lastName': 'Steuber',
                                'id': 'id_user_298'
                            }
                        },
                        'con': {
                            'owner': 'id_user_482',
                            'posted': '2017-04-17T14:49:14.242Z',
                            'role': 'con',
                            'text': 'Amet incidunt necessitatibus molestias.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1268',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Kennith',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fabbianz/128.jpg',
                                'lastName': 'Veum',
                                'id': 'id_user_482'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_487',
                            'posted': '2017-04-08T05:36:09.758Z',
                            'role': 'pro',
                            'text': 'Quas qui ullam sint aliquam.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1279',
                            'votes': { 'up': 2, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Justice',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arindam_/128.jpg',
                                'lastName': 'Bechtelar',
                                'id': 'id_user_487'
                            }
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_408',
                            'posted': '2017-04-17T16:45:14.520Z',
                            'role': 'pro',
                            'text': 'Praesentium voluptas eaque laborum ex.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1290',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Stephon',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/manigm/128.jpg',
                                'lastName': 'Bernhard',
                                'id': 'id_user_408'
                            }
                        },
                        'con': {
                            'owner': 'id_user_112',
                            'posted': '2017-04-08T10:18:40.360Z',
                            'role': 'con',
                            'text': 'Sapiente dolorem id.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1281',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jayme',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/boxmodel/128.jpg',
                                'lastName': 'Casper',
                                'id': 'id_user_112'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_354',
                            'posted': '2017-04-14T12:22:20.544Z',
                            'role': 'con',
                            'text': 'Adipisci neque alias dolores voluptatum itaque assumenda voluptas aut.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_1298',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Parker',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xtopherpaul/128.jpg',
                                'lastName': 'Pagac',
                                'id': 'id_user_354'
                            }
                        }
                    }
                }
            }
        },
        'id_item_1308': {
            'total': {
                'votes': { 'yes': 35, 'no': 28 },
                'comments': { 'pro': 4, 'con': 2, 'neutral': 5 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 3 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
                'id_district_104': { 'votes': { 'yes': 3, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 8, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 5, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_140',
                    'posted': '2017-04-09T00:47:28.558Z',
                    'role': 'pro',
                    'text': 'Nobis nulla ad incidunt voluptas doloremque quo sed ut quia.',
                    'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                    'id': 'id_comment_1375',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_110',
                                'name': 'District 10',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Hershel',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jydesign/128.jpg',
                        'lastName': 'Hackett',
                        'id': 'id_user_140'
                    }
                },
                'con': {
                    'owner': 'id_user_425',
                    'posted': '2017-04-12T19:08:00.988Z',
                    'role': 'con',
                    'text': 'Rerum eos eum et maxime labore a.',
                    'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                    'id': 'id_comment_1374',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_105',
                                'name': 'District 5',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Mohammad',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/layerssss/128.jpg',
                        'lastName': 'Ledner',
                        'id': 'id_user_425'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_128',
                            'posted': '2017-04-12T16:36:47.659Z',
                            'role': 'pro',
                            'text': 'Velit itaque ut ea qui in amet sapiente.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1382',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Justina',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iamgarth/128.jpg',
                                'lastName': 'Schuppe',
                                'id': 'id_user_128'
                            }
                        }, 'con': null
                    },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_425',
                            'posted': '2017-04-12T19:08:00.988Z',
                            'role': 'con',
                            'text': 'Rerum eos eum et maxime labore a.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1374',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Mohammad',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/layerssss/128.jpg',
                                'lastName': 'Ledner',
                                'id': 'id_user_425'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_402',
                            'posted': '2017-04-12T23:12:43.075Z',
                            'role': 'pro',
                            'text': 'Unde voluptatum libero doloremque deleniti nobis quisquam ut et.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1380',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alena',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/oskarlevinson/128.jpg',
                                'lastName': 'Beahan',
                                'id': 'id_user_402'
                            }
                        }, 'con': null
                    },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_283',
                            'posted': '2017-04-16T14:07:49.308Z',
                            'role': 'pro',
                            'text': 'Dolore distinctio qui labore eum.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1376',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Nelson',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nvkznemo/128.jpg',
                                'lastName': 'Runte',
                                'id': 'id_user_283'
                            }
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_140',
                            'posted': '2017-04-09T00:47:28.558Z',
                            'role': 'pro',
                            'text': 'Nobis nulla ad incidunt voluptas doloremque quo sed ut quia.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_1375',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Hershel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jydesign/128.jpg',
                                'lastName': 'Hackett',
                                'id': 'id_user_140'
                            }
                        },
                        'con': {
                            'owner': 'id_user_385',
                            'posted': '2017-04-14T06:05:04.219Z',
                            'role': 'con',
                            'text': 'Rerum aspernatur distinctio consectetur officia ea.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_1379',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Johan',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/malgordon/128.jpg',
                                'lastName': 'Erdman',
                                'id': 'id_user_385'
                            }
                        }
                    }
                }
            }
        },
        'id_item_1383': {
            'total': {
                'votes': { 'yes': 40, 'no': 45 },
                'comments': { 'pro': 12, 'con': 13, 'neutral': 7 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 1, 'no': 2 },
                    'comments': { 'pro': 1, 'con': 1, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 4, 'no': 7 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 5, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 5, 'no': 7 }, 'comments': { 'pro': 2, 'con': 3, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 3, 'no': 5 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
                'id_district_108': { 'votes': { 'yes': 6, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 3, 'no': 6 }, 'comments': { 'pro': 3, 'con': 0, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_475',
                    'posted': '2017-04-14T19:22:52.394Z',
                    'role': 'pro',
                    'text': 'Eius deleniti eos deserunt nihil nesciunt aliquid voluptatum quis unde.',
                    'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                    'id': 'id_comment_1473',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_101',
                                'name': 'District 1',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Sophia',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gregsqueeb/128.jpg',
                        'lastName': 'Feil',
                        'id': 'id_user_475'
                    }
                },
                'con': {
                    'owner': 'id_user_440',
                    'posted': '2017-04-12T09:02:49.319Z',
                    'role': 'con',
                    'text': 'Est illo qui.',
                    'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                    'id': 'id_comment_1497',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_106',
                                'name': 'District 6',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Giuseppe',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/carlosgavina/128.jpg',
                        'lastName': 'Hahn',
                        'id': 'id_user_440'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_475',
                            'posted': '2017-04-14T19:22:52.394Z',
                            'role': 'pro',
                            'text': 'Eius deleniti eos deserunt nihil nesciunt aliquid voluptatum quis unde.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1473',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Sophia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gregsqueeb/128.jpg',
                                'lastName': 'Feil',
                                'id': 'id_user_475'
                            }
                        },
                        'con': {
                            'owner': 'id_user_474',
                            'posted': '2017-04-17T04:08:55.710Z',
                            'role': 'con',
                            'text': 'In voluptate totam itaque ratione dolorum unde nam fugit sed.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1471',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Caesar',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vj_demien/128.jpg',
                                'lastName': 'Howe',
                                'id': 'id_user_474'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_326',
                            'posted': '2017-04-11T13:14:43.703Z',
                            'role': 'con',
                            'text': 'Qui perspiciatis impedit fuga ipsa qui ea ea ut in.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1483',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Darien',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sterlingrules/128.jpg',
                                'lastName': 'Smitham',
                                'id': 'id_user_326'
                            }
                        }
                    },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_341',
                            'posted': '2017-04-08T02:32:51.140Z',
                            'role': 'pro',
                            'text': 'Eaque pariatur quae.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1478',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Brown',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jeffgolenski/128.jpg',
                                'lastName': 'McDermott',
                                'id': 'id_user_341'
                            }
                        },
                        'con': {
                            'owner': 'id_user_452',
                            'posted': '2017-04-05T10:00:23.595Z',
                            'role': 'con',
                            'text': 'Consectetur amet beatae quisquam.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1496',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alexanne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/surgeonist/128.jpg',
                                'lastName': 'Blick',
                                'id': 'id_user_452'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_146',
                            'posted': '2017-04-12T21:06:10.145Z',
                            'role': 'con',
                            'text': 'Natus laboriosam ut voluptate aut.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1477',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ericka',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/franciscoamk/128.jpg',
                                'lastName': 'Schneider',
                                'id': 'id_user_146'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_141',
                            'posted': '2017-04-09T10:01:48.657Z',
                            'role': 'pro',
                            'text': 'Sint nisi sint dolor illum aut ut neque aliquam est.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1470',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Annette',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kohette/128.jpg',
                                'lastName': 'Bednar',
                                'id': 'id_user_141'
                            }
                        },
                        'con': {
                            'owner': 'id_user_440',
                            'posted': '2017-04-12T09:02:49.319Z',
                            'role': 'con',
                            'text': 'Est illo qui.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1497',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Giuseppe',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/carlosgavina/128.jpg',
                                'lastName': 'Hahn',
                                'id': 'id_user_440'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_149',
                            'posted': '2017-04-07T03:34:45.407Z',
                            'role': 'pro',
                            'text': 'Accusantium iste illum.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1493',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Keanu',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marshallchen_/128.jpg',
                                'lastName': 'Crona',
                                'id': 'id_user_149'
                            }
                        },
                        'con': {
                            'owner': 'id_user_263',
                            'posted': '2017-04-11T20:59:24.853Z',
                            'role': 'con',
                            'text': 'Ducimus velit vel ipsam similique cumque est omnis dolores sit.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1489',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Arnold',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lingeswaran/128.jpg',
                                'lastName': 'Brakus',
                                'id': 'id_user_263'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_508',
                            'posted': '2017-04-04T21:45:11.682Z',
                            'role': 'pro',
                            'text': 'Quia error qui occaecati reprehenderit.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1498',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Destin',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nellleo/128.jpg',
                                'lastName': 'Ondricka',
                                'id': 'id_user_508'
                            }
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_252',
                            'posted': '2017-04-17T04:32:36.284Z',
                            'role': 'pro',
                            'text': 'In excepturi esse et.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1481',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Raquel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robergd/128.jpg',
                                'lastName': 'Hauck',
                                'id': 'id_user_252'
                            }
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_214',
                            'posted': '2017-04-12T14:55:13.537Z',
                            'role': 'pro',
                            'text': 'Non nostrum sed praesentium.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_1486',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Cyrus',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/balakayuriy/128.jpg',
                                'lastName': 'Lemke',
                                'id': 'id_user_214'
                            }
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_1501': {
            'total': {
                'votes': { 'yes': 14, 'no': 17 },
                'comments': { 'pro': 2, 'con': 3, 'neutral': 1 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 1 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_344',
                    'posted': '2017-04-08T04:30:23.402Z',
                    'role': 'pro',
                    'text': 'Deleniti provident eveniet occaecati impedit et.',
                    'id': 'id_comment_1538',
                    'votes': { 'up': 2, 'down': 0 },
                    'author': {
                        'firstName': 'Mariam',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/hasslunsford/128.jpg',
                        'lastName': 'Berge',
                        'id': 'id_user_344'
                    }
                },
                'con': {
                    'owner': 'id_user_287',
                    'posted': '2017-04-16T06:16:50.706Z',
                    'role': 'con',
                    'text': 'Eum a et molestias harum inventore rem qui sit.',
                    'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                    'id': 'id_comment_1533',
                    'votes': { 'up': 2, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_103',
                                'name': 'District 3',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Michael',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gmourier/128.jpg',
                        'lastName': 'Hodkiewicz',
                        'id': 'id_user_287'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_287',
                            'posted': '2017-04-16T06:16:50.706Z',
                            'role': 'con',
                            'text': 'Eum a et molestias harum inventore rem qui sit.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1533',
                            'votes': { 'up': 2, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Michael',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gmourier/128.jpg',
                                'lastName': 'Hodkiewicz',
                                'id': 'id_user_287'
                            }
                        }
                    },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_219',
                            'posted': '2017-04-17T03:17:49.580Z',
                            'role': 'con',
                            'text': 'Et quo eos velit corrupti aut quod.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1536',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Obie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mufaddal_mw/128.jpg',
                                'lastName': 'Gislason',
                                'id': 'id_user_219'
                            }
                        }
                    },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_451',
                            'posted': '2017-04-15T08:56:41.714Z',
                            'role': 'pro',
                            'text': 'Ut sunt rerum velit explicabo nesciunt.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1537',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Retta',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/michaelabehsera/128.jpg',
                                'lastName': 'Leuschke',
                                'id': 'id_user_451'
                            }
                        }, 'con': null
                    },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_430',
                            'posted': '2017-04-12T08:21:20.962Z',
                            'role': 'con',
                            'text': 'Rem fugiat dolores voluptate voluptas aliquam velit atque et.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_1535',
                            'votes': { 'up': 0, 'down': 2 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Karlie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/themrdave/128.jpg',
                                'lastName': 'Batz',
                                'id': 'id_user_430'
                            }
                        }
                    }
                }
            }
        },
        'id_item_1539': {
            'total': {
                'votes': { 'yes': 8, 'no': 6 },
                'comments': { 'pro': 14, 'con': 17, 'neutral': 14 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 1, 'no': 0 },
                    'comments': { 'pro': 2, 'con': 1, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 3 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 3 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 5, 'neutral': 2 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 2 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
                'id_district_109': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_357',
                    'posted': '2017-04-12T14:05:54.675Z',
                    'role': 'pro',
                    'text': 'Quas quisquam ut et quo eum.',
                    'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                    'id': 'id_comment_1579',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_101',
                                'name': 'District 1',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Claud',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jagan123/128.jpg',
                        'lastName': 'Kuvalis',
                        'id': 'id_user_357'
                    }
                },
                'con': {
                    'owner': 'id_user_212',
                    'posted': '2017-04-15T22:55:57.224Z',
                    'role': 'con',
                    'text': 'Provident consequatur amet autem voluptatem ad officiis corrupti accusantium.',
                    'id': 'id_comment_1564',
                    'votes': { 'up': 2, 'down': 0 },
                    'author': {
                        'firstName': 'Gia',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/r_oy/128.jpg',
                        'lastName': 'Marquardt',
                        'id': 'id_user_212'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_357',
                            'posted': '2017-04-12T14:05:54.675Z',
                            'role': 'pro',
                            'text': 'Quas quisquam ut et quo eum.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1579',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Claud',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jagan123/128.jpg',
                                'lastName': 'Kuvalis',
                                'id': 'id_user_357'
                            }
                        },
                        'con': {
                            'owner': 'id_user_281',
                            'posted': '2017-04-14T03:32:31.340Z',
                            'role': 'con',
                            'text': 'Velit libero maiores eaque quis fuga.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1581',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Marques',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ahmadajmi/128.jpg',
                                'lastName': 'Corwin',
                                'id': 'id_user_281'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_138',
                            'posted': '2017-04-06T17:32:04.819Z',
                            'role': 'con',
                            'text': 'Voluptas quae eos velit.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1568',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jaycee',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/martip07/128.jpg',
                                'lastName': 'Heller',
                                'id': 'id_user_138'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_370',
                            'posted': '2017-04-16T15:26:15.262Z',
                            'role': 'pro',
                            'text': 'Aut quidem hic repellendus.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1572',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Zackery',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinlayfield/128.jpg',
                                'lastName': 'Lowe',
                                'id': 'id_user_370'
                            }
                        },
                        'con': {
                            'owner': 'id_user_285',
                            'posted': '2017-04-06T21:45:07.070Z',
                            'role': 'con',
                            'text': 'Sit autem vero vero optio sed nobis fuga.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1594',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Elenor',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bighanddesign/128.jpg',
                                'lastName': 'Oberbrunner',
                                'id': 'id_user_285'
                            }
                        }
                    },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_472',
                            'posted': '2017-04-07T19:37:43.455Z',
                            'role': 'con',
                            'text': 'Vero accusamus reiciendis aut nisi eveniet animi autem.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1562',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Henry',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/paulfarino/128.jpg',
                                'lastName': 'Cole',
                                'id': 'id_user_472'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_250',
                            'posted': '2017-04-04T15:00:39.258Z',
                            'role': 'pro',
                            'text': 'Autem voluptas repudiandae dolorem.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1583',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Name',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ManikRathee/128.jpg',
                                'lastName': 'Ledner',
                                'id': 'id_user_250'
                            }
                        },
                        'con': {
                            'owner': 'id_user_392',
                            'posted': '2017-04-09T09:40:00.290Z',
                            'role': 'con',
                            'text': 'Voluptas sint ea.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1570',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Angelina',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/charlesrpratt/128.jpg',
                                'lastName': 'White',
                                'id': 'id_user_392'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_147',
                            'posted': '2017-04-11T13:02:45.330Z',
                            'role': 'pro',
                            'text': 'Et voluptatem dignissimos sapiente.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1559',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Avis',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/baliomega/128.jpg',
                                'lastName': 'Christiansen',
                                'id': 'id_user_147'
                            }
                        },
                        'con': {
                            'owner': 'id_user_441',
                            'posted': '2017-04-04T13:37:19.548Z',
                            'role': 'con',
                            'text': 'Voluptas quidem iure esse adipisci dolores.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1575',
                            'votes': { 'up': 1, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lionel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/trueblood_33/128.jpg',
                                'lastName': 'Berge',
                                'id': 'id_user_441'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_185',
                            'posted': '2017-04-12T04:15:52.921Z',
                            'role': 'pro',
                            'text': 'Ut libero sit autem assumenda rerum amet magni.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1561',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lysanne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/pechkinator/128.jpg',
                                'lastName': 'Roberts',
                                'id': 'id_user_185'
                            }
                        },
                        'con': {
                            'owner': 'id_user_118',
                            'posted': '2017-04-09T23:20:47.677Z',
                            'role': 'con',
                            'text': 'Ipsa molestiae ad sit.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1577',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Trinity',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/herkulano/128.jpg',
                                'lastName': 'Halvorson',
                                'id': 'id_user_118'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_368',
                            'posted': '2017-04-12T21:27:21.240Z',
                            'role': 'pro',
                            'text': 'Ipsum accusamus eius enim laudantium quia enim ea aliquid.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1578',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Mary',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/Skyhartman/128.jpg',
                                'lastName': 'Beer',
                                'id': 'id_user_368'
                            }
                        },
                        'con': {
                            'owner': 'id_user_178',
                            'posted': '2017-04-16T05:53:24.502Z',
                            'role': 'con',
                            'text': 'Consequatur totam corporis alias eius consequatur consequatur numquam qui nisi.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1597',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Haskell',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joe_black/128.jpg',
                                'lastName': 'Gulgowski',
                                'id': 'id_user_178'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_352',
                            'posted': '2017-04-16T20:30:33.008Z',
                            'role': 'pro',
                            'text': 'Et autem sunt fuga fuga deleniti.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_1563',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Tania',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/garand/128.jpg',
                                'lastName': 'Beatty',
                                'id': 'id_user_352'
                            }
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_1599': {
            'total': {
                'votes': { 'yes': 17, 'no': 22 },
                'comments': { 'pro': 12, 'con': 10, 'neutral': 9 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 1 },
                    'comments': { 'pro': 1, 'con': 1, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
                'id_district_104': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_303',
                    'posted': '2017-04-05T02:14:39.263Z',
                    'role': 'pro',
                    'text': 'Aliquid vitae sit consequatur exercitationem sed natus recusandae repellendus distinctio.',
                    'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                    'id': 'id_comment_1644',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_103',
                                'name': 'District 3',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Kiley',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/toddrew/128.jpg',
                        'lastName': 'Reynolds',
                        'id': 'id_user_303'
                    }
                },
                'con': {
                    'owner': 'id_user_114',
                    'posted': '2017-04-16T14:33:00.999Z',
                    'role': 'con',
                    'text': 'Iure veniam rerum odit tenetur id non et est eligendi.',
                    'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                    'id': 'id_comment_1654',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_104',
                                'name': 'District 4',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Jayne',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/michaelmartinho/128.jpg',
                        'lastName': 'Kohler',
                        'id': 'id_user_114'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_478',
                            'posted': '2017-04-11T02:56:14.826Z',
                            'role': 'pro',
                            'text': 'Nisi velit laudantium molestias dolores quaerat et possimus modi tempore.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1660',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Emilia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/yesmeck/128.jpg',
                                'lastName': 'Cole',
                                'id': 'id_user_478'
                            }
                        },
                        'con': {
                            'owner': 'id_user_113',
                            'posted': '2017-04-14T08:07:47.406Z',
                            'role': 'con',
                            'text': 'Reiciendis perspiciatis soluta.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1662',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Amber',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dc_user/128.jpg',
                                'lastName': 'Walter',
                                'id': 'id_user_113'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_126',
                            'posted': '2017-04-04T21:34:23.866Z',
                            'role': 'con',
                            'text': 'Minus delectus quia corporis quasi qui reiciendis eos autem.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1652',
                            'votes': { 'up': 1, 'down': 2 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Chanel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ilya_pestov/128.jpg',
                                'lastName': 'Toy',
                                'id': 'id_user_126'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_303',
                            'posted': '2017-04-05T02:14:39.263Z',
                            'role': 'pro',
                            'text': 'Aliquid vitae sit consequatur exercitationem sed natus recusandae repellendus distinctio.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1644',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Kiley',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/toddrew/128.jpg',
                                'lastName': 'Reynolds',
                                'id': 'id_user_303'
                            }
                        },
                        'con': {
                            'owner': 'id_user_173',
                            'posted': '2017-04-05T00:11:11.685Z',
                            'role': 'con',
                            'text': 'Quis est tempore et.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1641',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Yvette',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/danthms/128.jpg',
                                'lastName': 'Welch',
                                'id': 'id_user_173'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_192',
                            'posted': '2017-04-13T02:07:35.041Z',
                            'role': 'pro',
                            'text': 'Dicta est iusto voluptates vitae.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1653',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Danika',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/_yardenoon/128.jpg',
                                'lastName': 'Smitham',
                                'id': 'id_user_192'
                            }
                        },
                        'con': {
                            'owner': 'id_user_114',
                            'posted': '2017-04-16T14:33:00.999Z',
                            'role': 'con',
                            'text': 'Iure veniam rerum odit tenetur id non et est eligendi.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1654',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jayne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/michaelmartinho/128.jpg',
                                'lastName': 'Kohler',
                                'id': 'id_user_114'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_133',
                            'posted': '2017-04-05T23:59:01.866Z',
                            'role': 'pro',
                            'text': 'Optio aut quibusdam consequatur.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1655',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Claudia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/longlivemyword/128.jpg',
                                'lastName': 'Ziemann',
                                'id': 'id_user_133'
                            }
                        },
                        'con': {
                            'owner': 'id_user_398',
                            'posted': '2017-04-08T22:26:33.382Z',
                            'role': 'con',
                            'text': 'Voluptatem praesentium aut in ea exercitationem ex aut excepturi quia.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1648',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Amira',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sircalebgrove/128.jpg',
                                'lastName': 'Hirthe',
                                'id': 'id_user_398'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_463',
                            'posted': '2017-04-07T17:38:18.284Z',
                            'role': 'pro',
                            'text': 'Repudiandae ratione soluta provident officia praesentium accusantium.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1642',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jonas',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/simobenso/128.jpg',
                                'lastName': 'Metz',
                                'id': 'id_user_463'
                            }
                        },
                        'con': {
                            'owner': 'id_user_217',
                            'posted': '2017-04-16T08:16:52.772Z',
                            'role': 'con',
                            'text': 'Corporis voluptas ullam.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1665',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Julie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/aeon56/128.jpg',
                                'lastName': 'King',
                                'id': 'id_user_217'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_242',
                            'posted': '2017-04-05T12:42:29.522Z',
                            'role': 'pro',
                            'text': 'Voluptas dolores ut ipsum dolorem est atque quia.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1659',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Zetta',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jesseddy/128.jpg',
                                'lastName': 'Hartmann',
                                'id': 'id_user_242'
                            }
                        }, 'con': null
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_271',
                            'posted': '2017-04-13T12:20:18.970Z',
                            'role': 'pro',
                            'text': 'Consequatur ut voluptatem et repellat aperiam dolorem ea.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1667',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Titus',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/myastro/128.jpg',
                                'lastName': 'Ferry',
                                'id': 'id_user_271'
                            }
                        },
                        'con': {
                            'owner': 'id_user_233',
                            'posted': '2017-04-09T04:51:42.803Z',
                            'role': 'con',
                            'text': 'Aut qui non sequi quo.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1650',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Spencer',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iduuck/128.jpg',
                                'lastName': 'Zboncak',
                                'id': 'id_user_233'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_348',
                            'posted': '2017-04-17T02:03:15.200Z',
                            'role': 'pro',
                            'text': 'Amet ex facere inventore.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1647',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Filiberto',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sta1ex/128.jpg',
                                'lastName': 'Kerluke',
                                'id': 'id_user_348'
                            }
                        },
                        'con': {
                            'owner': 'id_user_155',
                            'posted': '2017-04-14T11:59:25.895Z',
                            'role': 'con',
                            'text': 'Ipsam suscipit quia vel nemo modi nulla ipsam iste ut.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1657',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Cecelia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marciotoledo/128.jpg',
                                'lastName': 'Feeney',
                                'id': 'id_user_155'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_421',
                            'posted': '2017-04-10T15:13:22.397Z',
                            'role': 'pro',
                            'text': 'Aut rerum consequatur et sed non deleniti at qui.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_1646',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Francis',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lawlbwoy/128.jpg',
                                'lastName': 'Ledner',
                                'id': 'id_user_421'
                            }
                        },
                        'con': {
                            'owner': 'id_user_352',
                            'posted': '2017-04-15T07:06:56.491Z',
                            'role': 'con',
                            'text': 'Quia necessitatibus tenetur.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_1651',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Tania',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/garand/128.jpg',
                                'lastName': 'Beatty',
                                'id': 'id_user_352'
                            }
                        }
                    }
                }
            }
        },
        'id_item_1670': {
            'total': {
                'votes': { 'yes': 18, 'no': 14 },
                'comments': { 'pro': 5, 'con': 2, 'neutral': 5 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 2 },
                    'comments': { 'pro': 1, 'con': 1, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 0, 'no': 5 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 5, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_434',
                    'posted': '2017-04-15T23:39:25.282Z',
                    'role': 'pro',
                    'text': 'Doloremque iusto accusamus debitis est dolorem.',
                    'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                    'id': 'id_comment_1709',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_106',
                                'name': 'District 6',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Clinton',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sta1ex/128.jpg',
                        'lastName': 'Vandervort',
                        'id': 'id_user_434'
                    }
                },
                'con': {
                    'owner': 'id_user_358',
                    'posted': '2017-04-13T22:43:20.622Z',
                    'role': 'con',
                    'text': 'Laborum sunt debitis consequatur.',
                    'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                    'id': 'id_comment_1704',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_101',
                                'name': 'District 1',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Filomena',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xripunov/128.jpg',
                        'lastName': 'Bergstrom',
                        'id': 'id_user_358'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_386',
                            'posted': '2017-04-13T21:03:54.768Z',
                            'role': 'pro',
                            'text': 'Minima quisquam fuga fugiat officiis quis.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1714',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Veronica',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jonathansimmons/128.jpg',
                                'lastName': 'Steuber',
                                'id': 'id_user_386'
                            }
                        },
                        'con': {
                            'owner': 'id_user_358',
                            'posted': '2017-04-13T22:43:20.622Z',
                            'role': 'con',
                            'text': 'Laborum sunt debitis consequatur.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1704',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Filomena',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xripunov/128.jpg',
                                'lastName': 'Bergstrom',
                                'id': 'id_user_358'
                            }
                        }
                    },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_321',
                            'posted': '2017-04-13T22:29:17.878Z',
                            'role': 'con',
                            'text': 'Voluptatem veritatis aut animi aut aliquid cum ipsam odio ad.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1713',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lulu',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/claudioguglieri/128.jpg',
                                'lastName': 'Dach',
                                'id': 'id_user_321'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_399',
                            'posted': '2017-04-05T09:53:38.589Z',
                            'role': 'pro',
                            'text': 'Nulla odit tempora iure hic quod ea.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1707',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Evangeline',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jacobbennett/128.jpg',
                                'lastName': 'Pollich',
                                'id': 'id_user_399'
                            }
                        }, 'con': null
                    },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_434',
                            'posted': '2017-04-15T23:39:25.282Z',
                            'role': 'pro',
                            'text': 'Doloremque iusto accusamus debitis est dolorem.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1709',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Clinton',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sta1ex/128.jpg',
                                'lastName': 'Vandervort',
                                'id': 'id_user_434'
                            }
                        }, 'con': null
                    },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_191',
                            'posted': '2017-04-16T05:33:37.905Z',
                            'role': 'pro',
                            'text': 'Enim et est qui eos et occaecati.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1708',
                            'votes': { 'up': 1, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Leatha',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/katiemdaly/128.jpg',
                                'lastName': 'Lind',
                                'id': 'id_user_191'
                            }
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_408',
                            'posted': '2017-04-14T00:47:33.031Z',
                            'role': 'pro',
                            'text': 'Iste quibusdam quasi officia perspiciatis.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1712',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Stephon',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/manigm/128.jpg',
                                'lastName': 'Bernhard',
                                'id': 'id_user_408'
                            }
                        }, 'con': null
                    },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_1715': {
            'total': {
                'votes': { 'yes': 27, 'no': 24 },
                'comments': { 'pro': 18, 'con': 17, 'neutral': 12 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 1, 'no': 1 },
                    'comments': { 'pro': 1, 'con': 0, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 5, 'con': 2, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 7, 'no': 0 }, 'comments': { 'pro': 4, 'con': 3, 'neutral': 5 } },
                'id_district_107': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 4, 'no': 4 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 2 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_380',
                    'posted': '2017-04-13T20:42:58.635Z',
                    'role': 'pro',
                    'text': 'Sint placeat accusamus et sed.',
                    'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                    'id': 'id_comment_1772',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_106',
                                'name': 'District 6',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Efren',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/blakehawksworth/128.jpg',
                        'lastName': 'Sanford',
                        'id': 'id_user_380'
                    }
                },
                'con': {
                    'owner': 'id_user_465',
                    'posted': '2017-04-17T05:47:31.548Z',
                    'role': 'con',
                    'text': 'Nobis vitae dolores voluptas exercitationem eos.',
                    'id': 'id_comment_1793',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'firstName': 'Aubrey',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bcrad/128.jpg',
                        'lastName': 'Braun',
                        'id': 'id_user_465'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_410',
                            'posted': '2017-04-11T03:47:56.316Z',
                            'role': 'pro',
                            'text': 'Maxime quia exercitationem enim odit veniam cumque maiores.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1802',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Waldo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/clubb3rry/128.jpg',
                                'lastName': 'Rice',
                                'id': 'id_user_410'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_121',
                            'posted': '2017-04-13T21:11:18.993Z',
                            'role': 'pro',
                            'text': 'Iste aspernatur at iusto laboriosam explicabo iure voluptatem iusto.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1767',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Rico',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joshuaraichur/128.jpg',
                                'lastName': 'Waters',
                                'id': 'id_user_121'
                            }
                        },
                        'con': {
                            'owner': 'id_user_115',
                            'posted': '2017-04-07T06:17:26.544Z',
                            'role': 'con',
                            'text': 'Molestiae qui veniam ea aut aut omnis qui.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1811',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Imelda',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dhoot_amit/128.jpg',
                                'lastName': 'Parker',
                                'id': 'id_user_115'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_287',
                            'posted': '2017-04-10T00:58:19.311Z',
                            'role': 'pro',
                            'text': 'Veritatis nihil consequatur.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1778',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Michael',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gmourier/128.jpg',
                                'lastName': 'Hodkiewicz',
                                'id': 'id_user_287'
                            }
                        },
                        'con': {
                            'owner': 'id_user_321',
                            'posted': '2017-04-08T09:24:46.316Z',
                            'role': 'con',
                            'text': 'Ea at magni et nam quis modi.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1794',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lulu',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/claudioguglieri/128.jpg',
                                'lastName': 'Dach',
                                'id': 'id_user_321'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_213',
                            'posted': '2017-04-12T12:36:55.895Z',
                            'role': 'con',
                            'text': 'Quae voluptas quod voluptatem numquam architecto.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1790',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Carmine',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sandywoodruff/128.jpg',
                                'lastName': 'Marks',
                                'id': 'id_user_213'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_133',
                            'posted': '2017-04-05T22:09:00.408Z',
                            'role': 'pro',
                            'text': 'Est sit error consequuntur ut.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1798',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Claudia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/longlivemyword/128.jpg',
                                'lastName': 'Ziemann',
                                'id': 'id_user_133'
                            }
                        },
                        'con': {
                            'owner': 'id_user_146',
                            'posted': '2017-04-10T01:26:38.497Z',
                            'role': 'con',
                            'text': 'Numquam dolorum consequuntur beatae.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1781',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ericka',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/franciscoamk/128.jpg',
                                'lastName': 'Schneider',
                                'id': 'id_user_146'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_380',
                            'posted': '2017-04-13T20:42:58.635Z',
                            'role': 'pro',
                            'text': 'Sint placeat accusamus et sed.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1772',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Efren',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/blakehawksworth/128.jpg',
                                'lastName': 'Sanford',
                                'id': 'id_user_380'
                            }
                        },
                        'con': {
                            'owner': 'id_user_190',
                            'posted': '2017-04-08T22:34:36.710Z',
                            'role': 'con',
                            'text': 'Eos omnis dolor non sit omnis deleniti ab.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1796',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Concepcion',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/josemarques/128.jpg',
                                'lastName': 'Roob',
                                'id': 'id_user_190'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_333',
                            'posted': '2017-04-09T20:37:37.515Z',
                            'role': 'pro',
                            'text': 'In quasi aliquid nulla officiis non rerum.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1784',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Bethel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fotomagin/128.jpg',
                                'lastName': 'Olson',
                                'id': 'id_user_333'
                            }
                        },
                        'con': {
                            'owner': 'id_user_149',
                            'posted': '2017-04-07T19:32:21.875Z',
                            'role': 'con',
                            'text': 'Et dolore enim ipsum.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_1791',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Keanu',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marshallchen_/128.jpg',
                                'lastName': 'Crona',
                                'id': 'id_user_149'
                            }
                        }
                    },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_283',
                            'posted': '2017-04-16T23:09:44.749Z',
                            'role': 'pro',
                            'text': 'Et quos officia sunt et nostrum sint voluptate ut natus.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1782',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Nelson',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nvkznemo/128.jpg',
                                'lastName': 'Runte',
                                'id': 'id_user_283'
                            }
                        },
                        'con': {
                            'owner': 'id_user_252',
                            'posted': '2017-04-09T23:53:56.369Z',
                            'role': 'con',
                            'text': 'Consequatur consequatur ut perspiciatis beatae velit et eum.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1810',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Raquel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robergd/128.jpg',
                                'lastName': 'Hauck',
                                'id': 'id_user_252'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_483',
                            'posted': '2017-04-07T08:53:56.016Z',
                            'role': 'pro',
                            'text': 'Assumenda quo maiores officia sapiente deleniti aliquid itaque.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_1787',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jonathan',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dreizle/128.jpg',
                                'lastName': 'Wunsch',
                                'id': 'id_user_483'
                            }
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_1814': {
            'total': {
                'votes': { 'yes': 39, 'no': 38 },
                'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 5 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 6, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 6, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 5, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 8, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': null,
                'con': null,
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_1892': {
            'total': {
                'votes': { 'yes': 58, 'no': 40 },
                'comments': { 'pro': 1, 'con': 3, 'neutral': 0 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 1 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 6, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 4, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 7, 'no': 4 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 5, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 8, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 6, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 6, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 3, 'no': 6 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 6, 'no': 6 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_426',
                    'posted': '2017-04-12T04:27:11.752Z',
                    'role': 'pro',
                    'text': 'Est sit quos nihil illo eum beatae dolorum inventore.',
                    'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                    'id': 'id_comment_1993',
                    'votes': { 'up': 4, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_102',
                                'name': 'District 2',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'King',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dudestein/128.jpg',
                        'lastName': 'Greenholt',
                        'id': 'id_user_426'
                    }
                },
                'con': {
                    'owner': 'id_user_347',
                    'posted': '2017-04-10T09:11:42.938Z',
                    'role': 'con',
                    'text': 'Totam quae sint incidunt suscipit cumque cumque sunt provident est.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_1994',
                    'votes': { 'up': 4, 'down': 3 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Edyth',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/franciscoamk/128.jpg',
                        'lastName': 'O\'Reilly',
                        'id': 'id_user_347'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_426',
                            'posted': '2017-04-12T04:27:11.752Z',
                            'role': 'pro',
                            'text': 'Est sit quos nihil illo eum beatae dolorum inventore.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1993',
                            'votes': { 'up': 4, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'King',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dudestein/128.jpg',
                                'lastName': 'Greenholt',
                                'id': 'id_user_426'
                            }
                        }, 'con': null
                    },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_452',
                            'posted': '2017-04-17T02:15:04.618Z',
                            'role': 'con',
                            'text': 'Alias quo dolores ut nam error placeat ipsa.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1991',
                            'votes': { 'up': 1, 'down': 2 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alexanne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/surgeonist/128.jpg',
                                'lastName': 'Blick',
                                'id': 'id_user_452'
                            }
                        }
                    },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_347',
                            'posted': '2017-04-10T09:11:42.938Z',
                            'role': 'con',
                            'text': 'Totam quae sint incidunt suscipit cumque cumque sunt provident est.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1994',
                            'votes': { 'up': 4, 'down': 3 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Edyth',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/franciscoamk/128.jpg',
                                'lastName': 'O\'Reilly',
                                'id': 'id_user_347'
                            }
                        }
                    },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_1995': {
            'total': {
                'votes': { 'yes': 33, 'no': 12 },
                'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 1 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 5, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': null,
                'con': null,
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_2041': {
            'total': {
                'votes': { 'yes': 11, 'no': 10 },
                'comments': { 'pro': 1, 'con': 10, 'neutral': 10 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 1 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 2 }
                },
                'id_district_102': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 3 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 3 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_170',
                    'posted': '2017-04-11T00:53:49.366Z',
                    'role': 'pro',
                    'text': 'Perspiciatis quod veniam corporis inventore numquam non autem in libero.',
                    'id': 'id_comment_2082',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'firstName': 'Matilda',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/hugomano/128.jpg',
                        'lastName': 'Greenholt',
                        'id': 'id_user_170'
                    }
                },
                'con': {
                    'owner': 'id_user_422',
                    'posted': '2017-04-10T03:58:52.703Z',
                    'role': 'con',
                    'text': 'Et mollitia voluptatum accusamus esse.',
                    'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                    'id': 'id_comment_2073',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_109',
                                'name': 'District 9',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Enrique',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/abelcabans/128.jpg',
                        'lastName': 'Purdy',
                        'id': 'id_user_422'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_148',
                            'posted': '2017-04-09T05:01:54.228Z',
                            'role': 'con',
                            'text': 'Dicta beatae architecto animi labore blanditiis aperiam.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2072',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Einar',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/psdesignuk/128.jpg',
                                'lastName': 'Carroll',
                                'id': 'id_user_148'
                            }
                        }
                    },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_195',
                            'posted': '2017-04-04T14:17:12.549Z',
                            'role': 'con',
                            'text': 'Voluptatem possimus quisquam in molestias.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2075',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jolie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dannol/128.jpg',
                                'lastName': 'Hoppe',
                                'id': 'id_user_195'
                            }
                        }
                    },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_263',
                            'posted': '2017-04-09T22:25:49.197Z',
                            'role': 'con',
                            'text': 'Sed officia ut beatae architecto quam.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2065',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Arnold',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lingeswaran/128.jpg',
                                'lastName': 'Brakus',
                                'id': 'id_user_263'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_259',
                            'posted': '2017-04-09T08:04:50.853Z',
                            'role': 'con',
                            'text': 'Voluptate illum unde aut voluptatem cumque ipsa.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2074',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Herbert',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/isnifer/128.jpg',
                                'lastName': 'Wisozk',
                                'id': 'id_user_259'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_422',
                            'posted': '2017-04-10T03:58:52.703Z',
                            'role': 'con',
                            'text': 'Et mollitia voluptatum accusamus esse.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2073',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Enrique',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/abelcabans/128.jpg',
                                'lastName': 'Purdy',
                                'id': 'id_user_422'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_418',
                            'posted': '2017-04-14T01:48:07.736Z',
                            'role': 'con',
                            'text': 'In incidunt sit laudantium vero.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2068',
                            'votes': { 'up': 1, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Darian',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/we_social/128.jpg',
                                'lastName': 'Ratke',
                                'id': 'id_user_418'
                            }
                        }
                    }
                }
            }
        },
        'id_item_2084': {
            'total': {
                'votes': { 'yes': 33, 'no': 24 },
                'comments': { 'pro': 15, 'con': 10, 'neutral': 8 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 2 },
                    'comments': { 'pro': 2, 'con': 0, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_467',
                    'posted': '2017-04-12T08:53:09.278Z',
                    'role': 'pro',
                    'text': 'At sint quos qui.',
                    'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                    'id': 'id_comment_2162',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_101',
                                'name': 'District 1',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Jazlyn',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/Elt_n/128.jpg',
                        'lastName': 'Turcotte',
                        'id': 'id_user_467'
                    }
                },
                'con': {
                    'owner': 'id_user_381',
                    'posted': '2017-04-15T01:51:02.602Z',
                    'role': 'con',
                    'text': 'Est aperiam unde occaecati aliquid aut cum eius voluptatem in.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_2157',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Gussie',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/orkuncaylar/128.jpg',
                        'lastName': 'Hermiston',
                        'id': 'id_user_381'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_467',
                            'posted': '2017-04-12T08:53:09.278Z',
                            'role': 'pro',
                            'text': 'At sint quos qui.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_2162',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jazlyn',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/Elt_n/128.jpg',
                                'lastName': 'Turcotte',
                                'id': 'id_user_467'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_138',
                            'posted': '2017-04-04T17:05:36.210Z',
                            'role': 'pro',
                            'text': 'Odio et consequatur.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2149',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jaycee',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/martip07/128.jpg',
                                'lastName': 'Heller',
                                'id': 'id_user_138'
                            }
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_232',
                            'posted': '2017-04-11T02:31:51.458Z',
                            'role': 'pro',
                            'text': 'Pariatur in aspernatur sunt commodi vero consequuntur placeat voluptatem velit.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2146',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Hadley',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/samscouto/128.jpg',
                                'lastName': 'Upton',
                                'id': 'id_user_232'
                            }
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_460',
                            'posted': '2017-04-15T16:59:57.992Z',
                            'role': 'pro',
                            'text': 'Dolorum accusamus atque.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2155',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Mack',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/felipecsl/128.jpg',
                                'lastName': 'Wisozk',
                                'id': 'id_user_460'
                            }
                        },
                        'con': {
                            'owner': 'id_user_458',
                            'posted': '2017-04-07T04:52:18.069Z',
                            'role': 'con',
                            'text': 'Et quia quae cupiditate et.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2151',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Justyn',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wikiziner/128.jpg',
                                'lastName': 'Rolfson',
                                'id': 'id_user_458'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_361',
                            'posted': '2017-04-04T13:16:43.581Z',
                            'role': 'con',
                            'text': 'Autem nisi consequuntur quisquam deleniti magni.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2152',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Tillman',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kimcool/128.jpg',
                                'lastName': 'Wunsch',
                                'id': 'id_user_361'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_124',
                            'posted': '2017-04-07T01:30:37.628Z',
                            'role': 'pro',
                            'text': 'Ipsam dolorem rem aut sapiente.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2172',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Hardy',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dshster/128.jpg',
                                'lastName': 'Shanahan',
                                'id': 'id_user_124'
                            }
                        },
                        'con': {
                            'owner': 'id_user_294',
                            'posted': '2017-04-15T23:18:43.120Z',
                            'role': 'con',
                            'text': 'Laboriosam qui velit sunt qui.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2142',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Luciano',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sawrb/128.jpg',
                                'lastName': 'Steuber',
                                'id': 'id_user_294'
                            }
                        }
                    },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_381',
                            'posted': '2017-04-15T01:51:02.602Z',
                            'role': 'con',
                            'text': 'Est aperiam unde occaecati aliquid aut cum eius voluptatem in.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2157',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Gussie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/orkuncaylar/128.jpg',
                                'lastName': 'Hermiston',
                                'id': 'id_user_381'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_178',
                            'posted': '2017-04-14T21:17:40.217Z',
                            'role': 'pro',
                            'text': 'Eum sed dolores voluptatem voluptatem ipsam molestias laudantium.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2148',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Haskell',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joe_black/128.jpg',
                                'lastName': 'Gulgowski',
                                'id': 'id_user_178'
                            }
                        },
                        'con': {
                            'owner': 'id_user_252',
                            'posted': '2017-04-04T19:32:31.192Z',
                            'role': 'con',
                            'text': 'Eveniet voluptatem rerum.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2166',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Raquel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robergd/128.jpg',
                                'lastName': 'Hauck',
                                'id': 'id_user_252'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_304',
                            'posted': '2017-04-06T15:51:46.295Z',
                            'role': 'pro',
                            'text': 'In aut velit voluptate dicta voluptatum aut provident inventore.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2153',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Eve',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/adellecharles/128.jpg',
                                'lastName': 'Grant',
                                'id': 'id_user_304'
                            }
                        },
                        'con': {
                            'owner': 'id_user_166',
                            'posted': '2017-04-07T20:06:53.170Z',
                            'role': 'con',
                            'text': 'Natus et dignissimos aliquid.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2156',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ubaldo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iamkeithmason/128.jpg',
                                'lastName': 'Cruickshank',
                                'id': 'id_user_166'
                            }
                        }
                    }
                }
            }
        },
        'id_item_2175': {
            'total': {
                'votes': { 'yes': 50, 'no': 35 },
                'comments': { 'pro': 8, 'con': 12, 'neutral': 14 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 5 },
                    'comments': { 'pro': 0, 'con': 1, 'neutral': 2 }
                },
                'id_district_102': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 5 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
                'id_district_104': { 'votes': { 'yes': 8, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 6, 'no': 8 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 2 } },
                'id_district_106': { 'votes': { 'yes': 7, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 6, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_162',
                    'posted': '2017-04-09T12:24:36.174Z',
                    'role': 'pro',
                    'text': 'Magnam nihil incidunt maxime facilis.',
                    'id': 'id_comment_2286',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'firstName': 'Rosetta',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/layerssss/128.jpg',
                        'lastName': 'Graham',
                        'id': 'id_user_162'
                    }
                },
                'con': {
                    'owner': 'id_user_352',
                    'posted': '2017-04-12T05:33:33.699Z',
                    'role': 'con',
                    'text': 'Doloribus fuga dicta illum.',
                    'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                    'id': 'id_comment_2281',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_110',
                                'name': 'District 10',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Tania',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/garand/128.jpg',
                        'lastName': 'Beatty',
                        'id': 'id_user_352'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_201',
                            'posted': '2017-04-05T03:32:31.083Z',
                            'role': 'con',
                            'text': 'Temporibus non doloremque.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_2273',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Frank',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/instalox/128.jpg',
                                'lastName': 'Moore',
                                'id': 'id_user_201'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_329',
                            'posted': '2017-04-04T12:02:59.944Z',
                            'role': 'pro',
                            'text': 'Quibusdam consequuntur reprehenderit repudiandae ipsum officia.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2282',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Horacio',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vivekprvr/128.jpg',
                                'lastName': 'Carter',
                                'id': 'id_user_329'
                            }
                        },
                        'con': {
                            'owner': 'id_user_300',
                            'posted': '2017-04-04T03:33:11.785Z',
                            'role': 'con',
                            'text': 'Eum nisi vitae ducimus accusantium cum reprehenderit quibusdam.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2278',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jaylin',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mizhgan/128.jpg',
                                'lastName': 'Green',
                                'id': 'id_user_300'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_285',
                            'posted': '2017-04-05T07:53:28.283Z',
                            'role': 'pro',
                            'text': 'Incidunt natus molestiae.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2269',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Elenor',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bighanddesign/128.jpg',
                                'lastName': 'Oberbrunner',
                                'id': 'id_user_285'
                            }
                        },
                        'con': {
                            'owner': 'id_user_287',
                            'posted': '2017-04-08T09:48:41.928Z',
                            'role': 'con',
                            'text': 'Et assumenda autem optio quibusdam sunt.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2290',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Michael',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gmourier/128.jpg',
                                'lastName': 'Hodkiewicz',
                                'id': 'id_user_287'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_452',
                            'posted': '2017-04-08T19:32:58.532Z',
                            'role': 'pro',
                            'text': 'Quaerat voluptatum veniam velit deleniti at unde aut esse ad.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2283',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alexanne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/surgeonist/128.jpg',
                                'lastName': 'Blick',
                                'id': 'id_user_452'
                            }
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_398',
                            'posted': '2017-04-08T05:24:11.558Z',
                            'role': 'con',
                            'text': 'Aut eius unde voluptas est.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2265',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Amira',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sircalebgrove/128.jpg',
                                'lastName': 'Hirthe',
                                'id': 'id_user_398'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_415',
                            'posted': '2017-04-06T16:33:44.415Z',
                            'role': 'pro',
                            'text': 'Autem sit repudiandae dolores aut aut cum enim.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2280',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Albina',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/frankiefreesbie/128.jpg',
                                'lastName': 'Senger',
                                'id': 'id_user_415'
                            }
                        },
                        'con': {
                            'owner': 'id_user_442',
                            'posted': '2017-04-07T02:13:04.258Z',
                            'role': 'con',
                            'text': 'Et recusandae illo corrupti.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2285',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Natasha',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bergmartin/128.jpg',
                                'lastName': 'Abshire',
                                'id': 'id_user_442'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_306',
                            'posted': '2017-04-17T07:56:05.100Z',
                            'role': 'con',
                            'text': 'Et veritatis temporibus aut enim optio aut.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2263',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'River',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/naitanamoreno/128.jpg',
                                'lastName': 'Schmidt',
                                'id': 'id_user_306'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_265',
                            'posted': '2017-04-11T15:09:04.683Z',
                            'role': 'con',
                            'text': 'Excepturi dolorem ex.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2270',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Giovanna',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arpitnj/128.jpg',
                                'lastName': 'Jast',
                                'id': 'id_user_265'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_383',
                            'posted': '2017-04-05T08:15:39.608Z',
                            'role': 'pro',
                            'text': 'Et sequi molestias animi quis officiis id.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2292',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Carlee',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/elbuscainfo/128.jpg',
                                'lastName': 'Heller',
                                'id': 'id_user_383'
                            }
                        },
                        'con': {
                            'owner': 'id_user_180',
                            'posted': '2017-04-06T06:53:55.768Z',
                            'role': 'con',
                            'text': 'Et aut a qui fugit.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2266',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Chyna',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/eddiechen/128.jpg',
                                'lastName': 'Baumbach',
                                'id': 'id_user_180'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_468',
                            'posted': '2017-04-12T08:27:35.716Z',
                            'role': 'pro',
                            'text': 'Temporibus aut quibusdam id magni voluptas sint dicta.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2291',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Vita',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jghyllebert/128.jpg',
                                'lastName': 'Fritsch',
                                'id': 'id_user_468'
                            }
                        },
                        'con': {
                            'owner': 'id_user_352',
                            'posted': '2017-04-12T05:33:33.699Z',
                            'role': 'con',
                            'text': 'Doloribus fuga dicta illum.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2281',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Tania',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/garand/128.jpg',
                                'lastName': 'Beatty',
                                'id': 'id_user_352'
                            }
                        }
                    }
                }
            }
        },
        'id_item_2295': {
            'total': {
                'votes': { 'yes': 2, 'no': 4 },
                'comments': { 'pro': 22, 'con': 16, 'neutral': 9 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 0 },
                    'comments': { 'pro': 3, 'con': 1, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 4, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 1, 'con': 4, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
                'id_district_107': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 2 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 2 } },
                'id_district_109': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_195',
                    'posted': '2017-04-13T12:03:32.911Z',
                    'role': 'pro',
                    'text': 'Tenetur autem nulla temporibus.',
                    'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                    'id': 'id_comment_2319',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_105',
                                'name': 'District 5',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Jolie',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dannol/128.jpg',
                        'lastName': 'Hoppe',
                        'id': 'id_user_195'
                    }
                },
                'con': {
                    'owner': 'id_user_323',
                    'posted': '2017-04-14T06:53:46.080Z',
                    'role': 'con',
                    'text': 'Ipsa officia optio totam voluptates expedita numquam.',
                    'id': 'id_comment_2337',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'firstName': 'Bernice',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/keryilmaz/128.jpg',
                        'lastName': 'Beahan',
                        'id': 'id_user_323'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_130',
                            'posted': '2017-04-17T12:33:53.752Z',
                            'role': 'pro',
                            'text': 'Magni labore minima voluptatibus ut rerum qui non reprehenderit.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_2307',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Delores',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alsobrooks/128.jpg',
                                'lastName': 'Ullrich',
                                'id': 'id_user_130'
                            }
                        },
                        'con': {
                            'owner': 'id_user_357',
                            'posted': '2017-04-14T18:59:26.378Z',
                            'role': 'con',
                            'text': 'Culpa qui modi voluptas dolorem.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_2341',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Claud',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jagan123/128.jpg',
                                'lastName': 'Kuvalis',
                                'id': 'id_user_357'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_314',
                            'posted': '2017-04-14T22:55:54.409Z',
                            'role': 'pro',
                            'text': 'Suscipit et aut.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2313',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ned',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/adammarsbar/128.jpg',
                                'lastName': 'Ratke',
                                'id': 'id_user_314'
                            }
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_388',
                            'posted': '2017-04-11T23:44:27.114Z',
                            'role': 'pro',
                            'text': 'Quos distinctio illum recusandae et ut magnam sit.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2322',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Darryl',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/francis_vega/128.jpg',
                                'lastName': 'Boyer',
                                'id': 'id_user_388'
                            }
                        },
                        'con': {
                            'owner': 'id_user_470',
                            'posted': '2017-04-11T16:13:49.902Z',
                            'role': 'con',
                            'text': 'Velit perferendis vitae magni totam laboriosam assumenda odio dolor.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2347',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Morris',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mattlat/128.jpg',
                                'lastName': 'Schmidt',
                                'id': 'id_user_470'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_458',
                            'posted': '2017-04-06T07:22:18.316Z',
                            'role': 'pro',
                            'text': 'Natus sit est odio.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2334',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Justyn',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wikiziner/128.jpg',
                                'lastName': 'Rolfson',
                                'id': 'id_user_458'
                            }
                        },
                        'con': {
                            'owner': 'id_user_192',
                            'posted': '2017-04-10T17:31:03.862Z',
                            'role': 'con',
                            'text': 'Eligendi nemo iste quam qui reiciendis accusantium nobis.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2318',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Danika',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/_yardenoon/128.jpg',
                                'lastName': 'Smitham',
                                'id': 'id_user_192'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_195',
                            'posted': '2017-04-13T12:03:32.911Z',
                            'role': 'pro',
                            'text': 'Tenetur autem nulla temporibus.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2319',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jolie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dannol/128.jpg',
                                'lastName': 'Hoppe',
                                'id': 'id_user_195'
                            }
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_442',
                            'posted': '2017-04-16T08:05:39.368Z',
                            'role': 'pro',
                            'text': 'Et et exercitationem qui et illo illum nesciunt modi enim.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2324',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Natasha',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bergmartin/128.jpg',
                                'lastName': 'Abshire',
                                'id': 'id_user_442'
                            }
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_490',
                            'posted': '2017-04-06T23:57:45.140Z',
                            'role': 'pro',
                            'text': 'Temporibus minima odio perferendis fugit aut hic repellat dolorum.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2312',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Kristopher',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jodytaggart/128.jpg',
                                'lastName': 'Hartmann',
                                'id': 'id_user_490'
                            }
                        },
                        'con': {
                            'owner': 'id_user_273',
                            'posted': '2017-04-16T05:32:46.547Z',
                            'role': 'con',
                            'text': 'Perferendis voluptatum quibusdam beatae autem.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2309',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Judd',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wim1k/128.jpg',
                                'lastName': 'Jakubowski',
                                'id': 'id_user_273'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_262',
                            'posted': '2017-04-10T13:42:11.760Z',
                            'role': 'pro',
                            'text': 'Tempore quasi veniam.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2304',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Nicole',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vladyn/128.jpg',
                                'lastName': 'Gutmann',
                                'id': 'id_user_262'
                            }
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_178',
                            'posted': '2017-04-09T19:24:47.892Z',
                            'role': 'pro',
                            'text': 'Ea temporibus consectetur voluptate.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2315',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Haskell',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joe_black/128.jpg',
                                'lastName': 'Gulgowski',
                                'id': 'id_user_178'
                            }
                        },
                        'con': {
                            'owner': 'id_user_342',
                            'posted': '2017-04-07T17:42:12.560Z',
                            'role': 'con',
                            'text': 'Consequuntur quasi eos eum eveniet eum molestiae.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2338',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'George',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iqonicd/128.jpg',
                                'lastName': 'Watsica',
                                'id': 'id_user_342'
                            }
                        }
                    },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_2349': {
            'total': {
                'votes': { 'yes': 0, 'no': 0 },
                'comments': { 'pro': 20, 'con': 11, 'neutral': 11 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 0 },
                    'comments': { 'pro': 1, 'con': 0, 'neutral': 2 }
                },
                'id_district_102': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 4, 'con': 0, 'neutral': 2 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 2 } },
                'id_district_109': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 3, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_300',
                    'posted': '2017-04-14T15:10:03.158Z',
                    'role': 'pro',
                    'text': 'Quas qui vitae hic numquam eos rem consequatur.',
                    'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                    'id': 'id_comment_2386',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_102',
                                'name': 'District 2',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Jaylin',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mizhgan/128.jpg',
                        'lastName': 'Green',
                        'id': 'id_user_300'
                    }
                },
                'con': {
                    'owner': 'id_user_274',
                    'posted': '2017-04-12T01:18:15.710Z',
                    'role': 'con',
                    'text': 'Illum aliquam ipsam aut minus reiciendis vitae sunt.',
                    'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                    'id': 'id_comment_2370',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_110',
                                'name': 'District 10',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Magdalen',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nerrsoft/128.jpg',
                        'lastName': 'Wuckert',
                        'id': 'id_user_274'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_454',
                            'posted': '2017-04-15T06:51:11.296Z',
                            'role': 'pro',
                            'text': 'Hic aliquam itaque rem ut cumque aut saepe voluptatem odit.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_2357',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Anahi',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/Chakintosh/128.jpg',
                                'lastName': 'Schmeler',
                                'id': 'id_user_454'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_300',
                            'posted': '2017-04-14T15:10:03.158Z',
                            'role': 'pro',
                            'text': 'Quas qui vitae hic numquam eos rem consequatur.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2386',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jaylin',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mizhgan/128.jpg',
                                'lastName': 'Green',
                                'id': 'id_user_300'
                            }
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_321',
                            'posted': '2017-04-14T15:11:24.780Z',
                            'role': 'pro',
                            'text': 'Laborum expedita tempora at deserunt voluptates quia molestiae.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2372',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lulu',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/claudioguglieri/128.jpg',
                                'lastName': 'Dach',
                                'id': 'id_user_321'
                            }
                        },
                        'con': {
                            'owner': 'id_user_449',
                            'posted': '2017-04-13T01:03:24.261Z',
                            'role': 'con',
                            'text': 'Dolore asperiores rem nostrum accusamus.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2373',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Philip',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/d33pthought/128.jpg',
                                'lastName': 'Corwin',
                                'id': 'id_user_449'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_379',
                            'posted': '2017-04-11T08:40:45.235Z',
                            'role': 'pro',
                            'text': 'Reprehenderit consectetur quidem.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2376',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Sophie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/namankreative/128.jpg',
                                'lastName': 'Bahringer',
                                'id': 'id_user_379'
                            }
                        },
                        'con': {
                            'owner': 'id_user_452',
                            'posted': '2017-04-15T10:42:47.257Z',
                            'role': 'con',
                            'text': 'Esse ullam doloribus quia dolores et odit dicta.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2367',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alexanne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/surgeonist/128.jpg',
                                'lastName': 'Blick',
                                'id': 'id_user_452'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_472',
                            'posted': '2017-04-10T02:49:32.648Z',
                            'role': 'con',
                            'text': 'Laborum voluptas consequatur nulla nisi iure sit cum.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2359',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Henry',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/paulfarino/128.jpg',
                                'lastName': 'Cole',
                                'id': 'id_user_472'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_295',
                            'posted': '2017-04-14T02:43:12.655Z',
                            'role': 'pro',
                            'text': 'Repudiandae iure et officia reprehenderit.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2391',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lucie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/j_drake_/128.jpg',
                                'lastName': 'Mertz',
                                'id': 'id_user_295'
                            }
                        },
                        'con': {
                            'owner': 'id_user_479',
                            'posted': '2017-04-15T11:59:29.238Z',
                            'role': 'con',
                            'text': 'Accusamus inventore modi architecto sit itaque at quia occaecati ipsam.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2381',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Shayna',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinclediere/128.jpg',
                                'lastName': 'Jones',
                                'id': 'id_user_479'
                            }
                        }
                    },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_378',
                            'posted': '2017-04-10T21:33:25.873Z',
                            'role': 'pro',
                            'text': 'Ea odio voluptate est id qui nostrum qui.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2385',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Laron',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/teddyzetterlund/128.jpg',
                                'lastName': 'Boehm',
                                'id': 'id_user_378'
                            }
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_348',
                            'posted': '2017-04-07T16:50:53.294Z',
                            'role': 'pro',
                            'text': 'Consequatur optio vel itaque et aliquam quaerat.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2384',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Filiberto',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sta1ex/128.jpg',
                                'lastName': 'Kerluke',
                                'id': 'id_user_348'
                            }
                        },
                        'con': {
                            'owner': 'id_user_383',
                            'posted': '2017-04-15T21:29:51.641Z',
                            'role': 'con',
                            'text': 'Eaque sint et.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2368',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Carlee',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/elbuscainfo/128.jpg',
                                'lastName': 'Heller',
                                'id': 'id_user_383'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_193',
                            'posted': '2017-04-11T14:41:45.427Z',
                            'role': 'pro',
                            'text': 'Corporis eum exercitationem quas provident impedit harum.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2366',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Serena',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/madewulf/128.jpg',
                                'lastName': 'Connelly',
                                'id': 'id_user_193'
                            }
                        },
                        'con': {
                            'owner': 'id_user_274',
                            'posted': '2017-04-12T01:18:15.710Z',
                            'role': 'con',
                            'text': 'Illum aliquam ipsam aut minus reiciendis vitae sunt.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2370',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Magdalen',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nerrsoft/128.jpg',
                                'lastName': 'Wuckert',
                                'id': 'id_user_274'
                            }
                        }
                    }
                }
            }
        },
        'id_item_2392': {
            'total': {
                'votes': { 'yes': 17, 'no': 18 },
                'comments': { 'pro': 18, 'con': 19, 'neutral': 8 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 0 },
                    'comments': { 'pro': 2, 'con': 1, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 4, 'con': 2, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 2 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 1, 'con': 3, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 2, 'con': 5, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 2 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_112',
                    'posted': '2017-04-08T03:31:28.631Z',
                    'role': 'pro',
                    'text': 'Aliquid est quae qui molestiae et non et nihil quia.',
                    'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                    'id': 'id_comment_2463',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_109',
                                'name': 'District 9',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Jayme',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/boxmodel/128.jpg',
                        'lastName': 'Casper',
                        'id': 'id_user_112'
                    }
                },
                'con': {
                    'owner': 'id_user_316',
                    'posted': '2017-04-14T22:44:19.867Z',
                    'role': 'con',
                    'text': 'Natus non enim quos veritatis ab tempora et cum vitae.',
                    'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                    'id': 'id_comment_2438',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_107',
                                'name': 'District 7',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Caesar',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/namankreative/128.jpg',
                        'lastName': 'Hagenes',
                        'id': 'id_user_316'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_404',
                            'posted': '2017-04-04T22:23:36.633Z',
                            'role': 'pro',
                            'text': 'Ad est officia iusto.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_2454',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Tyshawn',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/uxpiper/128.jpg',
                                'lastName': 'Stehr',
                                'id': 'id_user_404'
                            }
                        },
                        'con': {
                            'owner': 'id_user_480',
                            'posted': '2017-04-04T13:31:27.541Z',
                            'role': 'con',
                            'text': 'Esse non cumque exercitationem possimus qui maxime inventore.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_2471',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Esta',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/svenlen/128.jpg',
                                'lastName': 'Kub',
                                'id': 'id_user_480'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_329',
                            'posted': '2017-04-12T03:05:20.226Z',
                            'role': 'pro',
                            'text': 'Animi dicta dolores et consectetur aliquid iste cumque.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2441',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Horacio',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vivekprvr/128.jpg',
                                'lastName': 'Carter',
                                'id': 'id_user_329'
                            }
                        },
                        'con': {
                            'owner': 'id_user_267',
                            'posted': '2017-04-08T03:09:59.852Z',
                            'role': 'con',
                            'text': 'Consequatur provident velit iure nemo voluptates.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2468',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Gabriel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marciotoledo/128.jpg',
                                'lastName': 'Predovic',
                                'id': 'id_user_267'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_261',
                            'posted': '2017-04-06T17:34:51.433Z',
                            'role': 'pro',
                            'text': 'Fugiat sit rerum tempore necessitatibus inventore.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2472',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Calista',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cadikkara/128.jpg',
                                'lastName': 'Bayer',
                                'id': 'id_user_261'
                            }
                        },
                        'con': {
                            'owner': 'id_user_232',
                            'posted': '2017-04-14T04:51:36.194Z',
                            'role': 'con',
                            'text': 'Et dolore vel qui ipsa minima iure quos.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2455',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Hadley',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/samscouto/128.jpg',
                                'lastName': 'Upton',
                                'id': 'id_user_232'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_266',
                            'posted': '2017-04-05T14:55:52.197Z',
                            'role': 'pro',
                            'text': 'Ullam ratione quia aspernatur repellat sunt eligendi.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2437',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Zachariah',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/AlbertoCococi/128.jpg',
                                'lastName': 'Nolan',
                                'id': 'id_user_266'
                            }
                        },
                        'con': {
                            'owner': 'id_user_254',
                            'posted': '2017-04-10T15:05:21.169Z',
                            'role': 'con',
                            'text': 'Omnis illo soluta quibusdam ut nisi odio.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2429',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lynn',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/duivvv/128.jpg',
                                'lastName': 'Pfannerstill',
                                'id': 'id_user_254'
                            }
                        }
                    },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_493',
                            'posted': '2017-04-15T09:18:42.378Z',
                            'role': 'pro',
                            'text': 'Voluptatem cumque pariatur.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2430',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Eduardo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kamal_chaneman/128.jpg',
                                'lastName': 'Stark',
                                'id': 'id_user_493'
                            }
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_234',
                            'posted': '2017-04-11T14:25:46.857Z',
                            'role': 'pro',
                            'text': 'Temporibus autem perspiciatis nemo est.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2439',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jacinto',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/eduardostuart/128.jpg',
                                'lastName': 'Crooks',
                                'id': 'id_user_234'
                            }
                        },
                        'con': {
                            'owner': 'id_user_316',
                            'posted': '2017-04-14T22:44:19.867Z',
                            'role': 'con',
                            'text': 'Natus non enim quos veritatis ab tempora et cum vitae.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2438',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Caesar',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/namankreative/128.jpg',
                                'lastName': 'Hagenes',
                                'id': 'id_user_316'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_156',
                            'posted': '2017-04-17T17:41:21.636Z',
                            'role': 'pro',
                            'text': 'Unde numquam ex iusto.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2461',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Eunice',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ramanathan_pdy/128.jpg',
                                'lastName': 'Veum',
                                'id': 'id_user_156'
                            }
                        },
                        'con': {
                            'owner': 'id_user_506',
                            'posted': '2017-04-17T03:02:57.650Z',
                            'role': 'con',
                            'text': 'Et non occaecati in ipsa nostrum.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2436',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Brad',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/omnizya/128.jpg',
                                'lastName': 'Kautzer',
                                'id': 'id_user_506'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_112',
                            'posted': '2017-04-08T03:31:28.631Z',
                            'role': 'pro',
                            'text': 'Aliquid est quae qui molestiae et non et nihil quia.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2463',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jayme',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/boxmodel/128.jpg',
                                'lastName': 'Casper',
                                'id': 'id_user_112'
                            }
                        },
                        'con': {
                            'owner': 'id_user_111',
                            'posted': '2017-04-12T07:11:27.107Z',
                            'role': 'con',
                            'text': 'Qui quia ipsam distinctio magnam nulla perspiciatis.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2440',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Gideon',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sasha_shestakov/128.jpg',
                                'lastName': 'Rosenbaum',
                                'id': 'id_user_111'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_412',
                            'posted': '2017-04-08T13:16:12.804Z',
                            'role': 'pro',
                            'text': 'Culpa sunt quo.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2443',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Shanelle',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/samuelkraft/128.jpg',
                                'lastName': 'Kling',
                                'id': 'id_user_412'
                            }
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_2473': {
            'total': {
                'votes': { 'yes': 13, 'no': 7 },
                'comments': { 'pro': 1, 'con': 2, 'neutral': 1 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 1, 'no': 0 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_263',
                    'posted': '2017-04-14T12:08:15.744Z',
                    'role': 'pro',
                    'text': 'Aut tenetur occaecati at nihil consectetur.',
                    'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                    'id': 'id_comment_2495',
                    'votes': { 'up': 2, 'down': 1 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_107',
                                'name': 'District 7',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Arnold',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lingeswaran/128.jpg',
                        'lastName': 'Brakus',
                        'id': 'id_user_263'
                    }
                },
                'con': {
                    'owner': 'id_user_296',
                    'posted': '2017-04-16T18:10:24.867Z',
                    'role': 'con',
                    'text': 'Temporibus eum nesciunt quod et iste laudantium voluptatem ut.',
                    'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                    'id': 'id_comment_2494',
                    'votes': { 'up': 2, 'down': 2 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_105',
                                'name': 'District 5',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Ezekiel',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dgajjar/128.jpg',
                        'lastName': 'Spencer',
                        'id': 'id_user_296'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_153',
                            'posted': '2017-04-16T14:50:19.974Z',
                            'role': 'con',
                            'text': 'Eum nostrum laboriosam est a amet et delectus ipsam.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2497',
                            'votes': { 'up': 1, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Theron',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/agromov/128.jpg',
                                'lastName': 'Little',
                                'id': 'id_user_153'
                            }
                        }
                    },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_296',
                            'posted': '2017-04-16T18:10:24.867Z',
                            'role': 'con',
                            'text': 'Temporibus eum nesciunt quod et iste laudantium voluptatem ut.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2494',
                            'votes': { 'up': 2, 'down': 2 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ezekiel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dgajjar/128.jpg',
                                'lastName': 'Spencer',
                                'id': 'id_user_296'
                            }
                        }
                    },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_263',
                            'posted': '2017-04-14T12:08:15.744Z',
                            'role': 'pro',
                            'text': 'Aut tenetur occaecati at nihil consectetur.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2495',
                            'votes': { 'up': 2, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Arnold',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lingeswaran/128.jpg',
                                'lastName': 'Brakus',
                                'id': 'id_user_263'
                            }
                        }, 'con': null
                    },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_2498': {
            'total': { 'votes': { 'yes': 5, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 0 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': null,
                'con': null,
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_2509': {
            'total': {
                'votes': { 'yes': 22, 'no': 25 },
                'comments': { 'pro': 10, 'con': 7, 'neutral': 7 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 1 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 2 } },
                'id_district_106': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 4 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_259',
                    'posted': '2017-04-17T04:23:17.844Z',
                    'role': 'pro',
                    'text': 'Iure esse corrupti similique.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_2560',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Herbert',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/isnifer/128.jpg',
                        'lastName': 'Wisozk',
                        'id': 'id_user_259'
                    }
                },
                'con': {
                    'owner': 'id_user_126',
                    'posted': '2017-04-04T17:34:32.372Z',
                    'role': 'con',
                    'text': 'Delectus qui consequuntur.',
                    'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                    'id': 'id_comment_2576',
                    'votes': { 'up': 2, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_102',
                                'name': 'District 2',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Chanel',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ilya_pestov/128.jpg',
                        'lastName': 'Toy',
                        'id': 'id_user_126'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_400',
                            'posted': '2017-04-11T07:03:48.369Z',
                            'role': 'pro',
                            'text': 'Eum accusantium doloremque officia excepturi praesentium explicabo in exercitationem dolorum.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2573',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Thalia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bolzanmarco/128.jpg',
                                'lastName': 'Bode',
                                'id': 'id_user_400'
                            }
                        },
                        'con': {
                            'owner': 'id_user_126',
                            'posted': '2017-04-04T17:34:32.372Z',
                            'role': 'con',
                            'text': 'Delectus qui consequuntur.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2576',
                            'votes': { 'up': 2, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Chanel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ilya_pestov/128.jpg',
                                'lastName': 'Toy',
                                'id': 'id_user_126'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_349',
                            'posted': '2017-04-13T04:08:44.704Z',
                            'role': 'pro',
                            'text': 'Odio nulla consequatur.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2565',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lemuel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/matbeedotcom/128.jpg',
                                'lastName': 'Kuvalis',
                                'id': 'id_user_349'
                            }
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_297',
                            'posted': '2017-04-15T19:26:54.134Z',
                            'role': 'pro',
                            'text': 'Officiis ratione earum ut enim.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2580',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Maximo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/katiemdaly/128.jpg',
                                'lastName': 'Doyle',
                                'id': 'id_user_297'
                            }
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_472',
                            'posted': '2017-04-11T14:12:42.905Z',
                            'role': 'con',
                            'text': 'Voluptates aut saepe laborum consequuntur quasi quis qui assumenda quia.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2570',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Henry',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/paulfarino/128.jpg',
                                'lastName': 'Cole',
                                'id': 'id_user_472'
                            }
                        }
                    },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_337',
                            'posted': '2017-04-14T10:39:12.627Z',
                            'role': 'pro',
                            'text': 'Amet saepe omnis sapiente.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2572',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Kathlyn',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mkginfo/128.jpg',
                                'lastName': 'Gusikowski',
                                'id': 'id_user_337'
                            }
                        },
                        'con': {
                            'owner': 'id_user_333',
                            'posted': '2017-04-14T13:22:33.538Z',
                            'role': 'con',
                            'text': 'Quo facere mollitia ipsa accusantium nesciunt.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2577',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Bethel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fotomagin/128.jpg',
                                'lastName': 'Olson',
                                'id': 'id_user_333'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_259',
                            'posted': '2017-04-17T04:23:17.844Z',
                            'role': 'pro',
                            'text': 'Iure esse corrupti similique.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2560',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Herbert',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/isnifer/128.jpg',
                                'lastName': 'Wisozk',
                                'id': 'id_user_259'
                            }
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_180',
                            'posted': '2017-04-06T06:27:01.508Z',
                            'role': 'pro',
                            'text': 'Laudantium sunt eius officia porro enim.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2575',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Chyna',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/eddiechen/128.jpg',
                                'lastName': 'Baumbach',
                                'id': 'id_user_180'
                            }
                        },
                        'con': {
                            'owner': 'id_user_342',
                            'posted': '2017-04-15T14:55:36.343Z',
                            'role': 'con',
                            'text': 'Aspernatur necessitatibus et.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2561',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'George',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iqonicd/128.jpg',
                                'lastName': 'Watsica',
                                'id': 'id_user_342'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_354',
                            'posted': '2017-04-17T17:10:00.330Z',
                            'role': 'pro',
                            'text': 'Possimus dolorum similique facilis facere eveniet.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2564',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Parker',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xtopherpaul/128.jpg',
                                'lastName': 'Pagac',
                                'id': 'id_user_354'
                            }
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_2581': {
            'total': {
                'votes': { 'yes': 48, 'no': 43 },
                'comments': { 'pro': 13, 'con': 12, 'neutral': 12 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 3 },
                    'comments': { 'pro': 3, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 4, 'no': 4 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 5, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 3 } },
                'id_district_105': { 'votes': { 'yes': 6, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 5, 'no': 6 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 5, 'no': 5 }, 'comments': { 'pro': 1, 'con': 4, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_397',
                    'posted': '2017-04-09T13:37:32.208Z',
                    'role': 'pro',
                    'text': 'Dolores qui architecto.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_2694',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Freeda',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/isacosta/128.jpg',
                        'lastName': 'Connelly',
                        'id': 'id_user_397'
                    }
                },
                'con': {
                    'owner': 'id_user_343',
                    'posted': '2017-04-05T07:58:20.619Z',
                    'role': 'con',
                    'text': 'Harum excepturi cumque vero voluptas magni.',
                    'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                    'id': 'id_comment_2703',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_103',
                                'name': 'District 3',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Raegan',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artd_sign/128.jpg',
                        'lastName': 'Adams',
                        'id': 'id_user_343'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_401',
                            'posted': '2017-04-12T13:13:14.538Z',
                            'role': 'pro',
                            'text': 'Et incidunt autem ipsam eius laboriosam ut nihil.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_2677',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Otilia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rweve/128.jpg',
                                'lastName': 'Morar',
                                'id': 'id_user_401'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_160',
                            'posted': '2017-04-14T13:37:39.900Z',
                            'role': 'pro',
                            'text': 'Non totam voluptatibus omnis veniam iure non sed omnis.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2679',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ruby',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andysolomon/128.jpg',
                                'lastName': 'Wyman',
                                'id': 'id_user_160'
                            }
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_343',
                            'posted': '2017-04-05T07:58:20.619Z',
                            'role': 'con',
                            'text': 'Harum excepturi cumque vero voluptas magni.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2703',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Raegan',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artd_sign/128.jpg',
                                'lastName': 'Adams',
                                'id': 'id_user_343'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_459',
                            'posted': '2017-04-12T19:15:13.818Z',
                            'role': 'pro',
                            'text': 'Aut aut iusto autem deserunt a et accusantium non non.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2686',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jordyn',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alessandroribe/128.jpg',
                                'lastName': 'Schultz',
                                'id': 'id_user_459'
                            }
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_398',
                            'posted': '2017-04-09T11:44:31.723Z',
                            'role': 'con',
                            'text': 'Quidem sed eaque dolorem sed.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2706',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Amira',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sircalebgrove/128.jpg',
                                'lastName': 'Hirthe',
                                'id': 'id_user_398'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_250',
                            'posted': '2017-04-06T16:23:32.613Z',
                            'role': 'pro',
                            'text': 'Ducimus eveniet voluptates rerum beatae quia fuga laborum.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2705',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Name',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ManikRathee/128.jpg',
                                'lastName': 'Ledner',
                                'id': 'id_user_250'
                            }
                        },
                        'con': {
                            'owner': 'id_user_230',
                            'posted': '2017-04-08T05:58:33.971Z',
                            'role': 'con',
                            'text': 'Est ipsam quis dolor voluptas fuga non sunt enim.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2678',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ella',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/betraydan/128.jpg',
                                'lastName': 'Heaney',
                                'id': 'id_user_230'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_441',
                            'posted': '2017-04-09T08:50:34.494Z',
                            'role': 'pro',
                            'text': 'Suscipit vitae aliquam facere reprehenderit ullam.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2673',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lionel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/trueblood_33/128.jpg',
                                'lastName': 'Berge',
                                'id': 'id_user_441'
                            }
                        },
                        'con': {
                            'owner': 'id_user_234',
                            'posted': '2017-04-08T23:30:41.686Z',
                            'role': 'con',
                            'text': 'Illum vitae est ut accusamus voluptatum consectetur.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2704',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jacinto',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/eduardostuart/128.jpg',
                                'lastName': 'Crooks',
                                'id': 'id_user_234'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_397',
                            'posted': '2017-04-09T13:37:32.208Z',
                            'role': 'pro',
                            'text': 'Dolores qui architecto.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2694',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Freeda',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/isacosta/128.jpg',
                                'lastName': 'Connelly',
                                'id': 'id_user_397'
                            }
                        },
                        'con': {
                            'owner': 'id_user_317',
                            'posted': '2017-04-05T20:12:50.595Z',
                            'role': 'con',
                            'text': 'Iure commodi enim rerum quia cum sit sit in.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2676',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Isabella',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artem_kostenko/128.jpg',
                                'lastName': 'Friesen',
                                'id': 'id_user_317'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_134',
                            'posted': '2017-04-15T17:11:48.371Z',
                            'role': 'pro',
                            'text': 'Et dolorem odit.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2701',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Trevor',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rpeezy/128.jpg',
                                'lastName': 'Raynor',
                                'id': 'id_user_134'
                            }
                        },
                        'con': {
                            'owner': 'id_user_111',
                            'posted': '2017-04-09T22:49:23.521Z',
                            'role': 'con',
                            'text': 'Molestiae itaque perferendis ut nesciunt exercitationem alias.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2690',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Gideon',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sasha_shestakov/128.jpg',
                                'lastName': 'Rosenbaum',
                                'id': 'id_user_111'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_129',
                            'posted': '2017-04-09T14:31:20.622Z',
                            'role': 'pro',
                            'text': 'Ipsam quibusdam aut.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2688',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Wanda',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/russoedu/128.jpg',
                                'lastName': 'Beer',
                                'id': 'id_user_129'
                            }
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_2710': {
            'total': {
                'votes': { 'yes': 12, 'no': 10 },
                'comments': { 'pro': 9, 'con': 6, 'neutral': 4 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 0 },
                    'comments': { 'pro': 1, 'con': 0, 'neutral': 2 }
                },
                'id_district_102': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_179',
                    'posted': '2017-04-10T16:11:36.974Z',
                    'role': 'pro',
                    'text': 'Ab placeat possimus.',
                    'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                    'id': 'id_comment_2750',
                    'votes': { 'up': 3, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_104',
                                'name': 'District 4',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Lera',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sawrb/128.jpg',
                        'lastName': 'Grant',
                        'id': 'id_user_179'
                    }
                },
                'con': {
                    'owner': 'id_user_312',
                    'posted': '2017-04-07T04:47:17.202Z',
                    'role': 'con',
                    'text': 'Dolores doloremque dolor consequatur.',
                    'id': 'id_comment_2736',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'firstName': 'Rasheed',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/boxmodel/128.jpg',
                        'lastName': 'Rice',
                        'id': 'id_user_312'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_405',
                            'posted': '2017-04-15T02:59:54.126Z',
                            'role': 'pro',
                            'text': 'Quo corporis facere dolor ea dolor rem aut.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_2742',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Marcelino',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/okansurreel/128.jpg',
                                'lastName': 'Kutch',
                                'id': 'id_user_405'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_374',
                            'posted': '2017-04-17T04:36:34.144Z',
                            'role': 'pro',
                            'text': 'Debitis eligendi ipsa repudiandae exercitationem consectetur provident consequatur.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2738',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jaycee',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/grrr_nl/128.jpg',
                                'lastName': 'Kuhlman',
                                'id': 'id_user_374'
                            }
                        },
                        'con': {
                            'owner': 'id_user_494',
                            'posted': '2017-04-16T09:44:17.572Z',
                            'role': 'con',
                            'text': 'Id nobis velit.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2747',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Darren',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/maz/128.jpg',
                                'lastName': 'Stamm',
                                'id': 'id_user_494'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_261',
                            'posted': '2017-04-12T08:04:50.656Z',
                            'role': 'pro',
                            'text': 'Animi iusto dolores iste itaque nihil quia perferendis porro perspiciatis.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2743',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Calista',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cadikkara/128.jpg',
                                'lastName': 'Bayer',
                                'id': 'id_user_261'
                            }
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_179',
                            'posted': '2017-04-10T16:11:36.974Z',
                            'role': 'pro',
                            'text': 'Ab placeat possimus.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2750',
                            'votes': { 'up': 3, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lera',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sawrb/128.jpg',
                                'lastName': 'Grant',
                                'id': 'id_user_179'
                            }
                        }, 'con': null
                    },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_380',
                            'posted': '2017-04-07T18:35:04.848Z',
                            'role': 'pro',
                            'text': 'Temporibus officia voluptatibus eum maxime hic ut quibusdam vero illo.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2737',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Efren',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/blakehawksworth/128.jpg',
                                'lastName': 'Sanford',
                                'id': 'id_user_380'
                            }
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_263',
                            'posted': '2017-04-06T23:54:57.433Z',
                            'role': 'con',
                            'text': 'Hic assumenda numquam voluptate sed beatae impedit consequatur aspernatur.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2741',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Arnold',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lingeswaran/128.jpg',
                                'lastName': 'Brakus',
                                'id': 'id_user_263'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_435',
                            'posted': '2017-04-09T14:44:07.384Z',
                            'role': 'pro',
                            'text': 'Temporibus molestiae vero et eos eius qui.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2740',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Eldora',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/puzik/128.jpg',
                                'lastName': 'Hermann',
                                'id': 'id_user_435'
                            }
                        }, 'con': null
                    },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_2752': {
            'total': {
                'votes': { 'yes': 37, 'no': 13 },
                'comments': { 'pro': 6, 'con': 6, 'neutral': 7 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 2 },
                    'comments': { 'pro': 1, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 5, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 2 } },
                'id_district_104': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_209',
                    'posted': '2017-04-10T20:09:30.304Z',
                    'role': 'pro',
                    'text': 'Ducimus molestiae quisquam voluptatem nemo in doloremque quod possimus aut.',
                    'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                    'id': 'id_comment_2805',
                    'votes': { 'up': 2, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_104',
                                'name': 'District 4',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Jody',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nicklacke/128.jpg',
                        'lastName': 'Bailey',
                        'id': 'id_user_209'
                    }
                },
                'con': {
                    'owner': 'id_user_361',
                    'posted': '2017-04-06T02:07:42.779Z',
                    'role': 'con',
                    'text': 'Qui ratione dolores itaque impedit et.',
                    'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                    'id': 'id_comment_2807',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_105',
                                'name': 'District 5',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Tillman',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kimcool/128.jpg',
                        'lastName': 'Wunsch',
                        'id': 'id_user_361'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_288',
                            'posted': '2017-04-12T03:07:07.147Z',
                            'role': 'pro',
                            'text': 'Eveniet rerum blanditiis voluptatem et est molestiae.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_2815',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Trevion',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/matt3224/128.jpg',
                                'lastName': 'Armstrong',
                                'id': 'id_user_288'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_426',
                            'posted': '2017-04-12T02:01:07.465Z',
                            'role': 'pro',
                            'text': 'Delectus ducimus iusto.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2808',
                            'votes': { 'up': 1, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'King',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dudestein/128.jpg',
                                'lastName': 'Greenholt',
                                'id': 'id_user_426'
                            }
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_199',
                            'posted': '2017-04-13T00:21:43.706Z',
                            'role': 'con',
                            'text': 'Voluptate ex incidunt dolorum in repudiandae autem nemo ut.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2818',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Agnes',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vladarbatov/128.jpg',
                                'lastName': 'Wilkinson',
                                'id': 'id_user_199'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_209',
                            'posted': '2017-04-10T20:09:30.304Z',
                            'role': 'pro',
                            'text': 'Ducimus molestiae quisquam voluptatem nemo in doloremque quod possimus aut.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2805',
                            'votes': { 'up': 2, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jody',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nicklacke/128.jpg',
                                'lastName': 'Bailey',
                                'id': 'id_user_209'
                            }
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_340',
                            'posted': '2017-04-16T04:58:05.974Z',
                            'role': 'pro',
                            'text': 'Earum voluptatibus asperiores dolorem porro qui.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2814',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Stone',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mhaligowski/128.jpg',
                                'lastName': 'Rutherford',
                                'id': 'id_user_340'
                            }
                        },
                        'con': {
                            'owner': 'id_user_361',
                            'posted': '2017-04-06T02:07:42.779Z',
                            'role': 'con',
                            'text': 'Qui ratione dolores itaque impedit et.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2807',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Tillman',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kimcool/128.jpg',
                                'lastName': 'Wunsch',
                                'id': 'id_user_361'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_132',
                            'posted': '2017-04-10T20:33:34.709Z',
                            'role': 'con',
                            'text': 'Corporis sed doloremque deserunt quis.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2817',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Vivienne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/daniloc/128.jpg',
                                'lastName': 'Heller',
                                'id': 'id_user_132'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_229',
                            'posted': '2017-04-17T20:09:51.005Z',
                            'role': 'con',
                            'text': 'Aut maiores et saepe ratione aliquam provident ipsa sapiente.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2809',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ophelia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/logorado/128.jpg',
                                'lastName': 'Gorczany',
                                'id': 'id_user_229'
                            }
                        }
                    },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_243',
                            'posted': '2017-04-14T11:10:18.772Z',
                            'role': 'pro',
                            'text': 'Sapiente fugit fugiat quasi reiciendis perspiciatis quia velit.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2804',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Maybell',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gizmeedevil1991/128.jpg',
                                'lastName': 'Waelchi',
                                'id': 'id_user_243'
                            }
                        }, 'con': null
                    },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_2822': {
            'total': {
                'votes': { 'yes': 22, 'no': 16 },
                'comments': { 'pro': 2, 'con': 1, 'neutral': 2 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 1, 'no': 1 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_208',
                    'posted': '2017-04-07T00:36:37.562Z',
                    'role': 'pro',
                    'text': 'Et dolor quibusdam et et aut deleniti qui et.',
                    'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                    'id': 'id_comment_2862',
                    'votes': { 'up': 1, 'down': 1 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_102',
                                'name': 'District 2',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Paxton',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/klefue/128.jpg',
                        'lastName': 'Hagenes',
                        'id': 'id_user_208'
                    }
                },
                'con': {
                    'owner': 'id_user_415',
                    'posted': '2017-04-15T22:02:19.229Z',
                    'role': 'con',
                    'text': 'Minus voluptatem laborum qui enim unde odio dignissimos voluptatem sit.',
                    'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                    'id': 'id_comment_2863',
                    'votes': { 'up': 2, 'down': 1 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_106',
                                'name': 'District 6',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Albina',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/frankiefreesbie/128.jpg',
                        'lastName': 'Senger',
                        'id': 'id_user_415'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_208',
                            'posted': '2017-04-07T00:36:37.562Z',
                            'role': 'pro',
                            'text': 'Et dolor quibusdam et et aut deleniti qui et.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2862',
                            'votes': { 'up': 1, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Paxton',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/klefue/128.jpg',
                                'lastName': 'Hagenes',
                                'id': 'id_user_208'
                            }
                        }, 'con': null
                    },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_415',
                            'posted': '2017-04-15T22:02:19.229Z',
                            'role': 'con',
                            'text': 'Minus voluptatem laborum qui enim unde odio dignissimos voluptatem sit.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2863',
                            'votes': { 'up': 2, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Albina',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/frankiefreesbie/128.jpg',
                                'lastName': 'Senger',
                                'id': 'id_user_415'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_336',
                            'posted': '2017-04-17T01:19:44.592Z',
                            'role': 'pro',
                            'text': 'Perspiciatis expedita atque molestias rerum.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2864',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Eddie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joannefournier/128.jpg',
                                'lastName': 'O\'Keefe',
                                'id': 'id_user_336'
                            }
                        }, 'con': null
                    },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_2866': {
            'total': {
                'votes': { 'yes': 1, 'no': 0 },
                'comments': { 'pro': 17, 'con': 12, 'neutral': 7 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 0 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 2 } },
                'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 5, 'con': 3, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_117',
                    'posted': '2017-04-10T05:46:20.377Z',
                    'role': 'pro',
                    'text': 'Qui neque voluptatem omnis.',
                    'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                    'id': 'id_comment_2897',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_103',
                                'name': 'District 3',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Aiyana',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/posterjob/128.jpg',
                        'lastName': 'Hahn',
                        'id': 'id_user_117'
                    }
                },
                'con': {
                    'owner': 'id_user_117',
                    'posted': '2017-04-05T00:21:23.392Z',
                    'role': 'con',
                    'text': 'Repudiandae ut fugit repellendus tempora voluptas veniam aut animi inventore.',
                    'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                    'id': 'id_comment_2882',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_103',
                                'name': 'District 3',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Aiyana',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/posterjob/128.jpg',
                        'lastName': 'Hahn',
                        'id': 'id_user_117'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_246',
                            'posted': '2017-04-15T04:09:35.942Z',
                            'role': 'pro',
                            'text': 'Enim est non cupiditate quia ut suscipit.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2877',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Madeline',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/abdullindenis/128.jpg',
                                'lastName': 'Hane',
                                'id': 'id_user_246'
                            }
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_117',
                            'posted': '2017-04-10T05:46:20.377Z',
                            'role': 'pro',
                            'text': 'Qui neque voluptatem omnis.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2897',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Aiyana',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/posterjob/128.jpg',
                                'lastName': 'Hahn',
                                'id': 'id_user_117'
                            }
                        },
                        'con': {
                            'owner': 'id_user_117',
                            'posted': '2017-04-05T00:21:23.392Z',
                            'role': 'con',
                            'text': 'Repudiandae ut fugit repellendus tempora voluptas veniam aut animi inventore.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2882',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Aiyana',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/posterjob/128.jpg',
                                'lastName': 'Hahn',
                                'id': 'id_user_117'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_209',
                            'posted': '2017-04-08T22:15:43.127Z',
                            'role': 'pro',
                            'text': 'Quae rerum sed provident impedit et corrupti qui quia.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2888',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jody',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nicklacke/128.jpg',
                                'lastName': 'Bailey',
                                'id': 'id_user_209'
                            }
                        },
                        'con': {
                            'owner': 'id_user_279',
                            'posted': '2017-04-12T15:12:36.477Z',
                            'role': 'con',
                            'text': 'Corporis blanditiis ab dicta sint quia.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2875',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Sherman',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bluefx_/128.jpg',
                                'lastName': 'Williamson',
                                'id': 'id_user_279'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_142',
                            'posted': '2017-04-14T09:45:12.016Z',
                            'role': 'con',
                            'text': 'Labore dolor est exercitationem.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2868',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Aiyana',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/billyroshan/128.jpg',
                                'lastName': 'Luettgen',
                                'id': 'id_user_142'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_380',
                            'posted': '2017-04-11T09:18:39.074Z',
                            'role': 'pro',
                            'text': 'Accusantium sunt dolor nihil maiores quae rerum expedita.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2872',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Efren',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/blakehawksworth/128.jpg',
                                'lastName': 'Sanford',
                                'id': 'id_user_380'
                            }
                        },
                        'con': {
                            'owner': 'id_user_359',
                            'posted': '2017-04-05T23:20:36.078Z',
                            'role': 'con',
                            'text': 'Quis illum molestiae nisi voluptates sunt ipsam.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_2883',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Connor',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/themrdave/128.jpg',
                                'lastName': 'Stiedemann',
                                'id': 'id_user_359'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_502',
                            'posted': '2017-04-10T02:17:37.615Z',
                            'role': 'con',
                            'text': 'Dicta consequuntur esse nisi qui sint aut dicta sapiente repudiandae.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2885',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Zachary',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alecarpentier/128.jpg',
                                'lastName': 'Lockman',
                                'id': 'id_user_502'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_118',
                            'posted': '2017-04-09T14:39:09.408Z',
                            'role': 'pro',
                            'text': 'Vitae exercitationem suscipit minima molestiae vero eum ipsa sed reprehenderit.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2900',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Trinity',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/herkulano/128.jpg',
                                'lastName': 'Halvorson',
                                'id': 'id_user_118'
                            }
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_178',
                            'posted': '2017-04-15T20:57:23.153Z',
                            'role': 'pro',
                            'text': 'Eaque assumenda et dolore omnis impedit minus.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2878',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Haskell',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joe_black/128.jpg',
                                'lastName': 'Gulgowski',
                                'id': 'id_user_178'
                            }
                        },
                        'con': {
                            'owner': 'id_user_200',
                            'posted': '2017-04-04T05:42:45.159Z',
                            'role': 'con',
                            'text': 'Quae ut omnis nobis dolor perspiciatis eligendi et.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_2903',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Vernie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/happypeter1983/128.jpg',
                                'lastName': 'Harvey',
                                'id': 'id_user_200'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_140',
                            'posted': '2017-04-16T07:03:22.410Z',
                            'role': 'con',
                            'text': 'Qui suscipit voluptatum accusamus laborum praesentium minima dolorum.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2901',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Hershel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jydesign/128.jpg',
                                'lastName': 'Hackett',
                                'id': 'id_user_140'
                            }
                        }
                    }
                }
            }
        },
        'id_item_2904': {
            'total': {
                'votes': { 'yes': 23, 'no': 29 },
                'comments': { 'pro': 5, 'con': 6, 'neutral': 3 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 2 },
                    'comments': { 'pro': 1, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 3, 'no': 8 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_387',
                    'posted': '2017-04-10T06:35:37.113Z',
                    'role': 'pro',
                    'text': 'Non accusamus voluptatibus sequi facilis autem ex alias.',
                    'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                    'id': 'id_comment_2963',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_101',
                                'name': 'District 1',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Jamir',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/foczzi/128.jpg',
                        'lastName': 'Zboncak',
                        'id': 'id_user_387'
                    }
                },
                'con': {
                    'owner': 'id_user_388',
                    'posted': '2017-04-10T00:03:21.523Z',
                    'role': 'con',
                    'text': 'Ut ipsam sunt ut aut iusto dolorem est.',
                    'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                    'id': 'id_comment_2961',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_103',
                                'name': 'District 3',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Darryl',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/francis_vega/128.jpg',
                        'lastName': 'Boyer',
                        'id': 'id_user_388'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_387',
                            'posted': '2017-04-10T06:35:37.113Z',
                            'role': 'pro',
                            'text': 'Non accusamus voluptatibus sequi facilis autem ex alias.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_2963',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jamir',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/foczzi/128.jpg',
                                'lastName': 'Zboncak',
                                'id': 'id_user_387'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_231',
                            'posted': '2017-04-17T03:07:29.429Z',
                            'role': 'con',
                            'text': 'Perspiciatis quibusdam dolores beatae.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_2966',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alan',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/pierrestoffe/128.jpg',
                                'lastName': 'Schoen',
                                'id': 'id_user_231'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_388',
                            'posted': '2017-04-10T00:03:21.523Z',
                            'role': 'con',
                            'text': 'Ut ipsam sunt ut aut iusto dolorem est.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_2961',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Darryl',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/francis_vega/128.jpg',
                                'lastName': 'Boyer',
                                'id': 'id_user_388'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_213',
                            'posted': '2017-04-16T03:45:11.242Z',
                            'role': 'pro',
                            'text': 'Modi cumque veritatis voluptas doloribus repudiandae.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_2960',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Carmine',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sandywoodruff/128.jpg',
                                'lastName': 'Marks',
                                'id': 'id_user_213'
                            }
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_363',
                            'posted': '2017-04-15T09:41:18.497Z',
                            'role': 'con',
                            'text': 'Aut asperiores eum rerum nihil illo quia quam ut.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_2962',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Burnice',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/her_ruu/128.jpg',
                                'lastName': 'Fritsch',
                                'id': 'id_user_363'
                            }
                        }
                    },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_316',
                            'posted': '2017-04-12T17:40:54.091Z',
                            'role': 'pro',
                            'text': 'Aut incidunt ea quam quod accusamus et numquam repudiandae quis.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2965',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Caesar',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/namankreative/128.jpg',
                                'lastName': 'Hagenes',
                                'id': 'id_user_316'
                            }
                        },
                        'con': {
                            'owner': 'id_user_120',
                            'posted': '2017-04-12T10:44:23.082Z',
                            'role': 'con',
                            'text': 'Tenetur ad praesentium quos sit ut consequuntur quae nesciunt beatae.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_2964',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Leone',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/d_kobelyatsky/128.jpg',
                                'lastName': 'Schmeler',
                                'id': 'id_user_120'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_506',
                            'posted': '2017-04-09T03:54:58.682Z',
                            'role': 'con',
                            'text': 'Libero quia excepturi et.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_2969',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Brad',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/omnizya/128.jpg',
                                'lastName': 'Kautzer',
                                'id': 'id_user_506'
                            }
                        }
                    },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_211',
                            'posted': '2017-04-16T18:34:04.815Z',
                            'role': 'pro',
                            'text': 'Eius vel reiciendis rerum dignissimos doloribus fugit minima perspiciatis.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2959',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Hugh',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/foczzi/128.jpg',
                                'lastName': 'Conn',
                                'id': 'id_user_211'
                            }
                        },
                        'con': {
                            'owner': 'id_user_412',
                            'posted': '2017-04-07T01:37:13.338Z',
                            'role': 'con',
                            'text': 'Odio a dicta autem tempora laudantium.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_2957',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Shanelle',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/samuelkraft/128.jpg',
                                'lastName': 'Kling',
                                'id': 'id_user_412'
                            }
                        }
                    }
                }
            }
        },
        'id_item_2971': {
            'total': {
                'votes': { 'yes': 45, 'no': 39 },
                'comments': { 'pro': 16, 'con': 8, 'neutral': 9 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 4 },
                    'comments': { 'pro': 1, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 4, 'no': 4 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 6, 'no': 2 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 2 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 5, 'no': 4 }, 'comments': { 'pro': 4, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 6, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 4, 'no': 6 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_240',
                    'posted': '2017-04-17T18:27:11.225Z',
                    'role': 'pro',
                    'text': 'Magni error non qui dolorem.',
                    'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                    'id': 'id_comment_3058',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_103',
                                'name': 'District 3',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Donny',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/emsgulam/128.jpg',
                        'lastName': 'Abshire',
                        'id': 'id_user_240'
                    }
                },
                'con': {
                    'owner': 'id_user_293',
                    'posted': '2017-04-13T21:03:40.788Z',
                    'role': 'con',
                    'text': 'Et quo facilis ea et dolores sint.',
                    'id': 'id_comment_3059',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'firstName': 'Julien',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mikemai2awesome/128.jpg',
                        'lastName': 'Collier',
                        'id': 'id_user_293'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_405',
                            'posted': '2017-04-08T01:18:53.071Z',
                            'role': 'pro',
                            'text': 'Ut illum dolorum et.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3060',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Marcelino',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/okansurreel/128.jpg',
                                'lastName': 'Kutch',
                                'id': 'id_user_405'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_128',
                            'posted': '2017-04-10T17:29:25.220Z',
                            'role': 'con',
                            'text': 'Vero quae dolorem molestiae enim et sint omnis aliquid non.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3083',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Justina',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iamgarth/128.jpg',
                                'lastName': 'Schuppe',
                                'id': 'id_user_128'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_240',
                            'posted': '2017-04-17T18:27:11.225Z',
                            'role': 'pro',
                            'text': 'Magni error non qui dolorem.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3058',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Donny',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/emsgulam/128.jpg',
                                'lastName': 'Abshire',
                                'id': 'id_user_240'
                            }
                        },
                        'con': {
                            'owner': 'id_user_261',
                            'posted': '2017-04-13T15:22:06.132Z',
                            'role': 'con',
                            'text': 'Quos reprehenderit natus pariatur deleniti consequatur numquam.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3075',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Calista',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cadikkara/128.jpg',
                                'lastName': 'Bayer',
                                'id': 'id_user_261'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_399',
                            'posted': '2017-04-05T02:01:38.472Z',
                            'role': 'pro',
                            'text': 'Ducimus labore qui et et aspernatur reprehenderit eligendi voluptates aperiam.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_3057',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Evangeline',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jacobbennett/128.jpg',
                                'lastName': 'Pollich',
                                'id': 'id_user_399'
                            }
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_335',
                            'posted': '2017-04-10T04:41:25.958Z',
                            'role': 'pro',
                            'text': 'Perspiciatis vel explicabo consequuntur sed sint.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3072',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Willie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alessandroribe/128.jpg',
                                'lastName': 'Robel',
                                'id': 'id_user_335'
                            }
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_479',
                            'posted': '2017-04-17T02:48:52.919Z',
                            'role': 'pro',
                            'text': 'Voluptatem perferendis molestiae quia dicta nobis officia beatae quo et.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3080',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Shayna',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinclediere/128.jpg',
                                'lastName': 'Jones',
                                'id': 'id_user_479'
                            }
                        },
                        'con': {
                            'owner': 'id_user_250',
                            'posted': '2017-04-17T12:06:15.925Z',
                            'role': 'con',
                            'text': 'Aliquid temporibus animi natus voluptatem deserunt.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3071',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Name',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ManikRathee/128.jpg',
                                'lastName': 'Ledner',
                                'id': 'id_user_250'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_234',
                            'posted': '2017-04-09T01:17:14.338Z',
                            'role': 'con',
                            'text': 'Harum fugiat non nesciunt quod saepe ullam.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3076',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jacinto',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/eduardostuart/128.jpg',
                                'lastName': 'Crooks',
                                'id': 'id_user_234'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_233',
                            'posted': '2017-04-07T05:44:37.203Z',
                            'role': 'pro',
                            'text': 'Officia qui minus ut.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3077',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Spencer',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iduuck/128.jpg',
                                'lastName': 'Zboncak',
                                'id': 'id_user_233'
                            }
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_206',
                            'posted': '2017-04-12T01:09:12.103Z',
                            'role': 'pro',
                            'text': 'Sit facere fugit nostrum mollitia autem vero ut accusamus quae.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3066',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Sister',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sunlandictwin/128.jpg',
                                'lastName': 'Abernathy',
                                'id': 'id_user_206'
                            }
                        },
                        'con': {
                            'owner': 'id_user_167',
                            'posted': '2017-04-05T23:34:49.735Z',
                            'role': 'con',
                            'text': 'Optio dolor porro voluptatem perferendis et impedit et hic.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3074',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Kariane',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/judzhin_miles/128.jpg',
                                'lastName': 'Kutch',
                                'id': 'id_user_167'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_497',
                            'posted': '2017-04-12T12:34:32.346Z',
                            'role': 'pro',
                            'text': 'Nesciunt consectetur enim qui ducimus aut est non possimus.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_3070',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lowell',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/karthipanraj/128.jpg',
                                'lastName': 'Gorczany',
                                'id': 'id_user_497'
                            }
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_3089': {
            'total': {
                'votes': { 'yes': 21, 'no': 6 },
                'comments': { 'pro': 11, 'con': 9, 'neutral': 9 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 0 },
                    'comments': { 'pro': 2, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 3, 'con': 2, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_330',
                    'posted': '2017-04-16T19:48:08.962Z',
                    'role': 'pro',
                    'text': 'Placeat animi aut dicta.',
                    'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                    'id': 'id_comment_3132',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_110',
                                'name': 'District 10',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Ernest',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nutzumi/128.jpg',
                        'lastName': 'Aufderhar',
                        'id': 'id_user_330'
                    }
                },
                'con': {
                    'owner': 'id_user_270',
                    'posted': '2017-04-13T01:45:04.104Z',
                    'role': 'con',
                    'text': 'Quisquam voluptates sed hic quia sed voluptas.',
                    'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                    'id': 'id_comment_3131',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_104',
                                'name': 'District 4',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Laurel',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/richardgarretts/128.jpg',
                        'lastName': 'Blick',
                        'id': 'id_user_270'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_277',
                            'posted': '2017-04-10T12:23:07.883Z',
                            'role': 'pro',
                            'text': 'Officia distinctio sed sint sint.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3121',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alanis',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mds/128.jpg',
                                'lastName': 'Ryan',
                                'id': 'id_user_277'
                            }
                        }, 'con': null
                    },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_349',
                            'posted': '2017-04-04T00:11:37.511Z',
                            'role': 'con',
                            'text': 'Officiis beatae optio numquam enim quisquam.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3118',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lemuel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/matbeedotcom/128.jpg',
                                'lastName': 'Kuvalis',
                                'id': 'id_user_349'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_270',
                            'posted': '2017-04-13T01:45:04.104Z',
                            'role': 'con',
                            'text': 'Quisquam voluptates sed hic quia sed voluptas.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_3131',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Laurel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/richardgarretts/128.jpg',
                                'lastName': 'Blick',
                                'id': 'id_user_270'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_443',
                            'posted': '2017-04-12T17:48:07.487Z',
                            'role': 'pro',
                            'text': 'Quaerat velit est dignissimos voluptatem animi tempore excepturi commodi nemo.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3123',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Rubie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kojourin/128.jpg',
                                'lastName': 'Hirthe',
                                'id': 'id_user_443'
                            }
                        },
                        'con': {
                            'owner': 'id_user_133',
                            'posted': '2017-04-10T03:11:26.531Z',
                            'role': 'con',
                            'text': 'Qui unde et deserunt quo cumque.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3130',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Claudia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/longlivemyword/128.jpg',
                                'lastName': 'Ziemann',
                                'id': 'id_user_133'
                            }
                        }
                    },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_159',
                            'posted': '2017-04-07T15:08:10.046Z',
                            'role': 'pro',
                            'text': 'Dolores id voluptatem cum nisi nesciunt aut quam consequuntur eos.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3145',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ora',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/baires/128.jpg',
                                'lastName': 'Rau',
                                'id': 'id_user_159'
                            }
                        }, 'con': null
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_397',
                            'posted': '2017-04-17T18:31:37.405Z',
                            'role': 'pro',
                            'text': 'Quam et veniam sint voluptas est rem.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3122',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Freeda',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/isacosta/128.jpg',
                                'lastName': 'Connelly',
                                'id': 'id_user_397'
                            }
                        },
                        'con': {
                            'owner': 'id_user_495',
                            'posted': '2017-04-13T14:00:34.340Z',
                            'role': 'con',
                            'text': 'Placeat consequatur est quod cumque labore sapiente eum.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3138',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Suzanne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nitinhayaran/128.jpg',
                                'lastName': 'Dicki',
                                'id': 'id_user_495'
                            }
                        }
                    },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_330',
                            'posted': '2017-04-16T19:48:08.962Z',
                            'role': 'pro',
                            'text': 'Placeat animi aut dicta.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_3132',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ernest',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nutzumi/128.jpg',
                                'lastName': 'Aufderhar',
                                'id': 'id_user_330'
                            }
                        }, 'con': null
                    }
                }
            }
        },
        'id_item_3146': {
            'total': {
                'votes': { 'yes': 8, 'no': 2 },
                'comments': { 'pro': 18, 'con': 9, 'neutral': 11 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 1, 'no': 0 },
                    'comments': { 'pro': 3, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 3, 'con': 0, 'neutral': 2 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 3, 'con': 2, 'neutral': 4 } },
                'id_district_107': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 4, 'con': 1, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 2 } },
                'id_district_110': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_225',
                    'posted': '2017-04-09T18:11:31.182Z',
                    'role': 'pro',
                    'text': 'Sed saepe a et necessitatibus quisquam incidunt ipsa similique vitae.',
                    'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                    'id': 'id_comment_3170',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_101',
                                'name': 'District 1',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Deangelo',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/coderdiaz/128.jpg',
                        'lastName': 'Kulas',
                        'id': 'id_user_225'
                    }
                },
                'con': {
                    'owner': 'id_user_347',
                    'posted': '2017-04-12T23:41:24.598Z',
                    'role': 'con',
                    'text': 'Consequatur et possimus quia eius.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_3157',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Edyth',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/franciscoamk/128.jpg',
                        'lastName': 'O\'Reilly',
                        'id': 'id_user_347'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_225',
                            'posted': '2017-04-09T18:11:31.182Z',
                            'role': 'pro',
                            'text': 'Sed saepe a et necessitatibus quisquam incidunt ipsa similique vitae.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3170',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Deangelo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/coderdiaz/128.jpg',
                                'lastName': 'Kulas',
                                'id': 'id_user_225'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_160',
                            'posted': '2017-04-12T22:39:41.724Z',
                            'role': 'con',
                            'text': 'Et aut enim consequuntur odit totam et sint quis.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3169',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ruby',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andysolomon/128.jpg',
                                'lastName': 'Wyman',
                                'id': 'id_user_160'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_240',
                            'posted': '2017-04-09T05:07:35.692Z',
                            'role': 'pro',
                            'text': 'Facere at quibusdam enim velit itaque.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3165',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Donny',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/emsgulam/128.jpg',
                                'lastName': 'Abshire',
                                'id': 'id_user_240'
                            }
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_171',
                            'posted': '2017-04-17T00:56:45.112Z',
                            'role': 'pro',
                            'text': 'Numquam voluptatem et deleniti nam fugiat error.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_3158',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Iliana',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/terpimost/128.jpg',
                                'lastName': 'Hoeger',
                                'id': 'id_user_171'
                            }
                        },
                        'con': {
                            'owner': 'id_user_450',
                            'posted': '2017-04-05T08:47:44.669Z',
                            'role': 'con',
                            'text': 'Id fuga cumque.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_3171',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Melissa',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buryaknick/128.jpg',
                                'lastName': 'Crona',
                                'id': 'id_user_450'
                            }
                        }
                    },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_440',
                            'posted': '2017-04-05T09:55:14.593Z',
                            'role': 'pro',
                            'text': 'Quibusdam harum totam ratione laboriosam ipsa magnam voluptatem repellat voluptatibus.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3163',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Giuseppe',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/carlosgavina/128.jpg',
                                'lastName': 'Hahn',
                                'id': 'id_user_440'
                            }
                        },
                        'con': {
                            'owner': 'id_user_365',
                            'posted': '2017-04-04T23:37:47.635Z',
                            'role': 'con',
                            'text': 'Ipsam qui nostrum dolorum amet ut quia nostrum.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3162',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Augusta',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kevinjohndayy/128.jpg',
                                'lastName': 'Mertz',
                                'id': 'id_user_365'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_471',
                            'posted': '2017-04-13T17:35:20.667Z',
                            'role': 'pro',
                            'text': 'Est tempora iure aperiam vitae explicabo.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3161',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Otto',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mactopus/128.jpg',
                                'lastName': 'Bins',
                                'id': 'id_user_471'
                            }
                        },
                        'con': {
                            'owner': 'id_user_482',
                            'posted': '2017-04-14T03:27:09.437Z',
                            'role': 'con',
                            'text': 'Est sapiente eius alias.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3168',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Kennith',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fabbianz/128.jpg',
                                'lastName': 'Veum',
                                'id': 'id_user_482'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_222',
                            'posted': '2017-04-07T04:39:48.375Z',
                            'role': 'pro',
                            'text': 'Non corporis dicta eaque.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3188',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Sandy',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/teylorfeliz/128.jpg',
                                'lastName': 'Howe',
                                'id': 'id_user_222'
                            }
                        },
                        'con': {
                            'owner': 'id_user_347',
                            'posted': '2017-04-12T23:41:24.598Z',
                            'role': 'con',
                            'text': 'Consequatur et possimus quia eius.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3157',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Edyth',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/franciscoamk/128.jpg',
                                'lastName': 'O\'Reilly',
                                'id': 'id_user_347'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_422',
                            'posted': '2017-04-13T19:17:46.516Z',
                            'role': 'con',
                            'text': 'Pariatur similique deleniti qui aut.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3167',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Enrique',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/abelcabans/128.jpg',
                                'lastName': 'Purdy',
                                'id': 'id_user_422'
                            }
                        }
                    },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_3195': {
            'total': {
                'votes': { 'yes': 16, 'no': 19 },
                'comments': { 'pro': 15, 'con': 14, 'neutral': 11 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 1 },
                    'comments': { 'pro': 1, 'con': 0, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 2, 'con': 4, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 0, 'no': 6 }, 'comments': { 'pro': 2, 'con': 3, 'neutral': 2 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_406',
                    'posted': '2017-04-08T12:54:24.418Z',
                    'role': 'pro',
                    'text': 'Explicabo quam vel et iusto voluptas ab.',
                    'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                    'id': 'id_comment_3255',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_105',
                                'name': 'District 5',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Hugh',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vaughanmoffitt/128.jpg',
                        'lastName': 'Kuhic',
                        'id': 'id_user_406'
                    }
                },
                'con': {
                    'owner': 'id_user_215',
                    'posted': '2017-04-05T20:38:31.937Z',
                    'role': 'con',
                    'text': 'Reiciendis earum et vitae sit corporis laboriosam rerum debitis.',
                    'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                    'id': 'id_comment_3248',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_109',
                                'name': 'District 9',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Johnathan',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wearesavas/128.jpg',
                        'lastName': 'Pouros',
                        'id': 'id_user_215'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_113',
                            'posted': '2017-04-07T02:56:54.962Z',
                            'role': 'pro',
                            'text': 'Aut velit minus.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3245',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Amber',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dc_user/128.jpg',
                                'lastName': 'Walter',
                                'id': 'id_user_113'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_208',
                            'posted': '2017-04-11T10:33:47.580Z',
                            'role': 'pro',
                            'text': 'Consequatur eos corporis repudiandae beatae.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3252',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Paxton',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/klefue/128.jpg',
                                'lastName': 'Hagenes',
                                'id': 'id_user_208'
                            }
                        },
                        'con': {
                            'owner': 'id_user_494',
                            'posted': '2017-04-04T15:14:10.497Z',
                            'role': 'con',
                            'text': 'Provident molestias autem.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3260',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Darren',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/maz/128.jpg',
                                'lastName': 'Stamm',
                                'id': 'id_user_494'
                            }
                        }
                    },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_279',
                            'posted': '2017-04-11T14:27:52.736Z',
                            'role': 'pro',
                            'text': 'Officiis eos officia aperiam.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_3269',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Sherman',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bluefx_/128.jpg',
                                'lastName': 'Williamson',
                                'id': 'id_user_279'
                            }
                        },
                        'con': {
                            'owner': 'id_user_310',
                            'posted': '2017-04-07T22:33:52.160Z',
                            'role': 'con',
                            'text': 'Quaerat sed voluptas.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_3239',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jarrett',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sprayaga/128.jpg',
                                'lastName': 'Nolan',
                                'id': 'id_user_310'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_406',
                            'posted': '2017-04-08T12:54:24.418Z',
                            'role': 'pro',
                            'text': 'Explicabo quam vel et iusto voluptas ab.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3255',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Hugh',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vaughanmoffitt/128.jpg',
                                'lastName': 'Kuhic',
                                'id': 'id_user_406'
                            }
                        },
                        'con': {
                            'owner': 'id_user_133',
                            'posted': '2017-04-14T13:03:00.485Z',
                            'role': 'con',
                            'text': 'Quas voluptas veritatis inventore aliquid ipsa magni officia dolorum.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3264',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Claudia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/longlivemyword/128.jpg',
                                'lastName': 'Ziemann',
                                'id': 'id_user_133'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_132',
                            'posted': '2017-04-13T09:45:19.355Z',
                            'role': 'con',
                            'text': 'Fuga qui nemo ea est labore quisquam optio quod et.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3257',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Vivienne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/daniloc/128.jpg',
                                'lastName': 'Heller',
                                'id': 'id_user_132'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_298',
                            'posted': '2017-04-10T04:49:32.323Z',
                            'role': 'con',
                            'text': 'Aliquam eligendi est.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3235',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Aliyah',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arishi_/128.jpg',
                                'lastName': 'Steuber',
                                'id': 'id_user_298'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_271',
                            'posted': '2017-04-05T12:15:29.999Z',
                            'role': 'pro',
                            'text': 'Nostrum quaerat saepe labore architecto ab adipisci.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3251',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Titus',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/myastro/128.jpg',
                                'lastName': 'Ferry',
                                'id': 'id_user_271'
                            }
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_429',
                            'posted': '2017-04-17T09:20:00.442Z',
                            'role': 'pro',
                            'text': 'Ab in voluptatum quidem aliquid optio molestiae debitis aut.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3262',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Evangeline',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/larrybolt/128.jpg',
                                'lastName': 'Brown',
                                'id': 'id_user_429'
                            }
                        },
                        'con': {
                            'owner': 'id_user_215',
                            'posted': '2017-04-05T20:38:31.937Z',
                            'role': 'con',
                            'text': 'Reiciendis earum et vitae sit corporis laboriosam rerum debitis.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3248',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Johnathan',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wearesavas/128.jpg',
                                'lastName': 'Pouros',
                                'id': 'id_user_215'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_193',
                            'posted': '2017-04-12T03:09:19.733Z',
                            'role': 'pro',
                            'text': 'Numquam accusamus iusto.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_3268',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Serena',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/madewulf/128.jpg',
                                'lastName': 'Connelly',
                                'id': 'id_user_193'
                            }
                        },
                        'con': {
                            'owner': 'id_user_453',
                            'posted': '2017-04-15T09:41:44.447Z',
                            'role': 'con',
                            'text': 'Amet consequatur possimus consequatur voluptate optio non et.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_3237',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Pamela',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/martip07/128.jpg',
                                'lastName': 'Shanahan',
                                'id': 'id_user_453'
                            }
                        }
                    }
                }
            }
        },
        'id_item_3271': {
            'total': {
                'votes': { 'yes': 24, 'no': 17 },
                'comments': { 'pro': 8, 'con': 8, 'neutral': 5 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 2 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_339',
                    'posted': '2017-04-09T16:08:00.054Z',
                    'role': 'pro',
                    'text': 'In corrupti eligendi alias.',
                    'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                    'id': 'id_comment_3333',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_106',
                                'name': 'District 6',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Adolphus',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/baluli/128.jpg',
                        'lastName': 'Haley',
                        'id': 'id_user_339'
                    }
                },
                'con': {
                    'owner': 'id_user_209',
                    'posted': '2017-04-16T18:47:27.923Z',
                    'role': 'con',
                    'text': 'Laboriosam vel dignissimos ab id itaque sit consequatur.',
                    'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                    'id': 'id_comment_3317',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_104',
                                'name': 'District 4',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Jody',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nicklacke/128.jpg',
                        'lastName': 'Bailey',
                        'id': 'id_user_209'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_499',
                            'posted': '2017-04-09T10:23:33.531Z',
                            'role': 'pro',
                            'text': 'Quam nihil ut officia quam dolores.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3328',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lorena',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xadhix/128.jpg',
                                'lastName': 'Hauck',
                                'id': 'id_user_499'
                            }
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_232',
                            'posted': '2017-04-15T14:35:48.662Z',
                            'role': 'con',
                            'text': 'Doloribus error quam et est ea et et.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3326',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Hadley',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/samscouto/128.jpg',
                                'lastName': 'Upton',
                                'id': 'id_user_232'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_209',
                            'posted': '2017-04-16T18:47:27.923Z',
                            'role': 'con',
                            'text': 'Laboriosam vel dignissimos ab id itaque sit consequatur.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_3317',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jody',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nicklacke/128.jpg',
                                'lastName': 'Bailey',
                                'id': 'id_user_209'
                            }
                        }
                    },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_339',
                            'posted': '2017-04-09T16:08:00.054Z',
                            'role': 'pro',
                            'text': 'In corrupti eligendi alias.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3333',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Adolphus',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/baluli/128.jpg',
                                'lastName': 'Haley',
                                'id': 'id_user_339'
                            }
                        },
                        'con': {
                            'owner': 'id_user_295',
                            'posted': '2017-04-08T20:21:15.711Z',
                            'role': 'con',
                            'text': 'Optio aut in excepturi.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3318',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lucie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/j_drake_/128.jpg',
                                'lastName': 'Mertz',
                                'id': 'id_user_295'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_120',
                            'posted': '2017-04-03T23:10:00.583Z',
                            'role': 'pro',
                            'text': 'Harum ab numquam.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3315',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Leone',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/d_kobelyatsky/128.jpg',
                                'lastName': 'Schmeler',
                                'id': 'id_user_120'
                            }
                        },
                        'con': {
                            'owner': 'id_user_336',
                            'posted': '2017-04-07T09:00:12.841Z',
                            'role': 'con',
                            'text': 'Aperiam quod mollitia ad omnis ipsa.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3331',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Eddie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joannefournier/128.jpg',
                                'lastName': 'O\'Keefe',
                                'id': 'id_user_336'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_505',
                            'posted': '2017-04-05T00:34:28.543Z',
                            'role': 'pro',
                            'text': 'Debitis id sint beatae delectus aut.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3316',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Wendell',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kudretkeskin/128.jpg',
                                'lastName': 'Farrell',
                                'id': 'id_user_505'
                            }
                        },
                        'con': {
                            'owner': 'id_user_185',
                            'posted': '2017-04-11T03:40:05.513Z',
                            'role': 'con',
                            'text': 'Alias voluptatum soluta.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3322',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lysanne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/pechkinator/128.jpg',
                                'lastName': 'Roberts',
                                'id': 'id_user_185'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_180',
                            'posted': '2017-04-15T07:17:11.727Z',
                            'role': 'pro',
                            'text': 'Atque aspernatur aut laboriosam beatae eos praesentium officia accusantium occaecati.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3325',
                            'votes': { 'up': 1, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Chyna',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/eddiechen/128.jpg',
                                'lastName': 'Baumbach',
                                'id': 'id_user_180'
                            }
                        }, 'con': null
                    },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_3334': {
            'total': {
                'votes': { 'yes': 16, 'no': 9 },
                'comments': { 'pro': 9, 'con': 23, 'neutral': 15 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 2 },
                    'comments': { 'pro': 1, 'con': 1, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 3, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 2 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 2, 'con': 3, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 1, 'con': 4, 'neutral': 3 } },
                'id_district_108': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 3 } },
                'id_district_109': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_172',
                    'posted': '2017-04-07T21:58:42.540Z',
                    'role': 'pro',
                    'text': 'Illum sed temporibus.',
                    'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                    'id': 'id_comment_3360',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_106',
                                'name': 'District 6',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Jazmin',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kudretkeskin/128.jpg',
                        'lastName': 'Hermann',
                        'id': 'id_user_172'
                    }
                },
                'con': {
                    'owner': 'id_user_414',
                    'posted': '2017-04-09T21:47:59.852Z',
                    'role': 'con',
                    'text': 'Sequi blanditiis rerum sit esse.',
                    'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                    'id': 'id_comment_3381',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_110',
                                'name': 'District 10',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Ludwig',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/leehambley/128.jpg',
                        'lastName': 'Wolf',
                        'id': 'id_user_414'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_410',
                            'posted': '2017-04-17T14:42:34.234Z',
                            'role': 'pro',
                            'text': 'Modi eveniet qui repellendus rerum cumque pariatur perspiciatis.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3403',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Waldo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/clubb3rry/128.jpg',
                                'lastName': 'Rice',
                                'id': 'id_user_410'
                            }
                        },
                        'con': {
                            'owner': 'id_user_358',
                            'posted': '2017-04-16T06:55:27.273Z',
                            'role': 'con',
                            'text': 'Facilis odio sint.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3362',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Filomena',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xripunov/128.jpg',
                                'lastName': 'Bergstrom',
                                'id': 'id_user_358'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_245',
                            'posted': '2017-04-08T11:38:36.036Z',
                            'role': 'pro',
                            'text': 'Consequatur consectetur et voluptatem error neque ratione laboriosam.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3374',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Raul',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/benjamin_knight/128.jpg',
                                'lastName': 'Leuschke',
                                'id': 'id_user_245'
                            }
                        },
                        'con': {
                            'owner': 'id_user_258',
                            'posted': '2017-04-10T07:17:20.912Z',
                            'role': 'con',
                            'text': 'Quia autem molestiae cupiditate exercitationem rerum earum eos est dignissimos.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3369',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Vita',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/keryilmaz/128.jpg',
                                'lastName': 'Lowe',
                                'id': 'id_user_258'
                            }
                        }
                    },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_310',
                            'posted': '2017-04-17T08:16:42.915Z',
                            'role': 'con',
                            'text': 'Error iste pariatur quo id adipisci.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_3373',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jarrett',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sprayaga/128.jpg',
                                'lastName': 'Nolan',
                                'id': 'id_user_310'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_461',
                            'posted': '2017-04-14T21:24:35.544Z',
                            'role': 'pro',
                            'text': 'Dolor sint occaecati maxime architecto deserunt excepturi dignissimos velit.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3387',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alexys',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dc_user/128.jpg',
                                'lastName': 'Murphy',
                                'id': 'id_user_461'
                            }
                        },
                        'con': {
                            'owner': 'id_user_131',
                            'posted': '2017-04-11T14:31:50.719Z',
                            'role': 'con',
                            'text': 'Non quidem illo expedita ut reiciendis magnam.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3398',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Andreane',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/superoutman/128.jpg',
                                'lastName': 'Sporer',
                                'id': 'id_user_131'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_172',
                            'posted': '2017-04-07T21:58:42.540Z',
                            'role': 'pro',
                            'text': 'Illum sed temporibus.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3360',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jazmin',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kudretkeskin/128.jpg',
                                'lastName': 'Hermann',
                                'id': 'id_user_172'
                            }
                        },
                        'con': {
                            'owner': 'id_user_230',
                            'posted': '2017-04-14T01:26:30.647Z',
                            'role': 'con',
                            'text': 'Rerum repellendus pariatur placeat dolore recusandae expedita amet.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3363',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ella',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/betraydan/128.jpg',
                                'lastName': 'Heaney',
                                'id': 'id_user_230'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_305',
                            'posted': '2017-04-04T02:20:23.263Z',
                            'role': 'pro',
                            'text': 'Fuga est voluptatum.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3402',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alek',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/prheemo/128.jpg',
                                'lastName': 'Muller',
                                'id': 'id_user_305'
                            }
                        },
                        'con': {
                            'owner': 'id_user_436',
                            'posted': '2017-04-12T22:22:39.731Z',
                            'role': 'con',
                            'text': 'Omnis est similique ab quasi aspernatur.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3383',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Frances',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alek_djuric/128.jpg',
                                'lastName': 'Ziemann',
                                'id': 'id_user_436'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_222',
                            'posted': '2017-04-05T17:30:51.223Z',
                            'role': 'con',
                            'text': 'Aperiam dignissimos quaerat rem repudiandae veritatis.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3366',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Sandy',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/teylorfeliz/128.jpg',
                                'lastName': 'Howe',
                                'id': 'id_user_222'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_228',
                            'posted': '2017-04-06T01:51:14.429Z',
                            'role': 'pro',
                            'text': 'Dolor voluptatem fugiat aut.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3405',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ethyl',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rpeezy/128.jpg',
                                'lastName': 'Bogan',
                                'id': 'id_user_228'
                            }
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_414',
                            'posted': '2017-04-09T21:47:59.852Z',
                            'role': 'con',
                            'text': 'Sequi blanditiis rerum sit esse.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_3381',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ludwig',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/leehambley/128.jpg',
                                'lastName': 'Wolf',
                                'id': 'id_user_414'
                            }
                        }
                    }
                }
            }
        },
        'id_item_3407': {
            'total': { 'votes': { 'yes': 9, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 0 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': null,
                'con': null,
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_3422': {
            'total': {
                'votes': { 'yes': 40, 'no': 44 },
                'comments': { 'pro': 5, 'con': 4, 'neutral': 4 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 6, 'no': 4 },
                    'comments': { 'pro': 0, 'con': 1, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 6, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 5, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 3, 'no': 5 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 2, 'no': 6 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 7, 'no': 5 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 1, 'no': 6 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_173',
                    'posted': '2017-04-13T05:10:23.946Z',
                    'role': 'pro',
                    'text': 'Ut inventore sapiente dolores architecto minus dolores.',
                    'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                    'id': 'id_comment_3509',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_103',
                                'name': 'District 3',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Yvette',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/danthms/128.jpg',
                        'lastName': 'Welch',
                        'id': 'id_user_173'
                    }
                },
                'con': {
                    'owner': 'id_user_433',
                    'posted': '2017-04-16T17:46:30.320Z',
                    'role': 'con',
                    'text': 'Dolor est consectetur suscipit aperiam.',
                    'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                    'id': 'id_comment_3507',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_107',
                                'name': 'District 7',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Modesto',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/uxpiper/128.jpg',
                        'lastName': 'Dooley',
                        'id': 'id_user_433'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_292',
                            'posted': '2017-04-09T20:29:40.960Z',
                            'role': 'con',
                            'text': 'Voluptatibus quia aperiam vitae laborum commodi ipsam sed vel.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3511',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Mario',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/safrankov/128.jpg',
                                'lastName': 'Howe',
                                'id': 'id_user_292'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_355',
                            'posted': '2017-04-15T03:42:39.089Z',
                            'role': 'con',
                            'text': 'Doloremque sed ab officiis nihil a.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3516',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Caleigh',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/smenov/128.jpg',
                                'lastName': 'O\'Reilly',
                                'id': 'id_user_355'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_173',
                            'posted': '2017-04-13T05:10:23.946Z',
                            'role': 'pro',
                            'text': 'Ut inventore sapiente dolores architecto minus dolores.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3509',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Yvette',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/danthms/128.jpg',
                                'lastName': 'Welch',
                                'id': 'id_user_173'
                            }
                        }, 'con': null
                    },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_445',
                            'posted': '2017-04-12T07:30:35.021Z',
                            'role': 'pro',
                            'text': 'Nesciunt quis aperiam saepe quia a architecto repellat.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3517',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Mckayla',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/flashmurphy/128.jpg',
                                'lastName': 'Jerde',
                                'id': 'id_user_445'
                            }
                        },
                        'con': {
                            'owner': 'id_user_443',
                            'posted': '2017-04-17T07:50:25.558Z',
                            'role': 'con',
                            'text': 'Pariatur quasi dolores adipisci ut optio est.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3512',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Rubie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kojourin/128.jpg',
                                'lastName': 'Hirthe',
                                'id': 'id_user_443'
                            }
                        }
                    },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_433',
                            'posted': '2017-04-16T17:46:30.320Z',
                            'role': 'con',
                            'text': 'Dolor est consectetur suscipit aperiam.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3507',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Modesto',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/uxpiper/128.jpg',
                                'lastName': 'Dooley',
                                'id': 'id_user_433'
                            }
                        }
                    },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_178',
                            'posted': '2017-04-07T21:59:24.669Z',
                            'role': 'pro',
                            'text': 'Quis ratione hic.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3508',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Haskell',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joe_black/128.jpg',
                                'lastName': 'Gulgowski',
                                'id': 'id_user_178'
                            }
                        }, 'con': null
                    },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_3520': {
            'total': {
                'votes': { 'yes': 41, 'no': 45 },
                'comments': { 'pro': 17, 'con': 14, 'neutral': 16 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 8 },
                    'comments': { 'pro': 2, 'con': 1, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 6, 'no': 6 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 3, 'con': 2, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 4, 'no': 5 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 3 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 5, 'no': 7 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 6, 'no': 3 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 3 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_266',
                    'posted': '2017-04-17T06:06:20.012Z',
                    'role': 'pro',
                    'text': 'Magnam dolorum quos.',
                    'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                    'id': 'id_comment_3608',
                    'votes': { 'up': 1, 'down': 1 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_104',
                                'name': 'District 4',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Zachariah',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/AlbertoCococi/128.jpg',
                        'lastName': 'Nolan',
                        'id': 'id_user_266'
                    }
                },
                'con': {
                    'owner': 'id_user_219',
                    'posted': '2017-04-12T23:10:13.157Z',
                    'role': 'con',
                    'text': 'Accusantium quia doloremque ut.',
                    'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                    'id': 'id_comment_3633',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_105',
                                'name': 'District 5',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Obie',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mufaddal_mw/128.jpg',
                        'lastName': 'Gislason',
                        'id': 'id_user_219'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_357',
                            'posted': '2017-04-13T06:46:44.607Z',
                            'role': 'pro',
                            'text': 'Sed iure quis ullam.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3630',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Claud',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jagan123/128.jpg',
                                'lastName': 'Kuvalis',
                                'id': 'id_user_357'
                            }
                        },
                        'con': {
                            'owner': 'id_user_358',
                            'posted': '2017-04-05T19:23:59.771Z',
                            'role': 'con',
                            'text': 'Vitae ut odio aliquid incidunt ut velit dignissimos.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3618',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Filomena',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xripunov/128.jpg',
                                'lastName': 'Bergstrom',
                                'id': 'id_user_358'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_160',
                            'posted': '2017-04-16T06:26:18.211Z',
                            'role': 'pro',
                            'text': 'Explicabo fuga saepe aliquid numquam sint.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3614',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ruby',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andysolomon/128.jpg',
                                'lastName': 'Wyman',
                                'id': 'id_user_160'
                            }
                        },
                        'con': {
                            'owner': 'id_user_160',
                            'posted': '2017-04-06T14:22:28.692Z',
                            'role': 'con',
                            'text': 'Consequatur eligendi officia et quia ipsam et.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3621',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ruby',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andysolomon/128.jpg',
                                'lastName': 'Wyman',
                                'id': 'id_user_160'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_199',
                            'posted': '2017-04-10T02:52:35.439Z',
                            'role': 'pro',
                            'text': 'Sit omnis fugiat molestiae est laboriosam sed esse vel id.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3619',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Agnes',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vladarbatov/128.jpg',
                                'lastName': 'Wilkinson',
                                'id': 'id_user_199'
                            }
                        },
                        'con': {
                            'owner': 'id_user_321',
                            'posted': '2017-04-10T06:06:14.670Z',
                            'role': 'con',
                            'text': 'Rem sed error quo explicabo ullam alias dicta magni ab.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3628',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lulu',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/claudioguglieri/128.jpg',
                                'lastName': 'Dach',
                                'id': 'id_user_321'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_266',
                            'posted': '2017-04-17T06:06:20.012Z',
                            'role': 'pro',
                            'text': 'Magnam dolorum quos.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_3608',
                            'votes': { 'up': 1, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Zachariah',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/AlbertoCococi/128.jpg',
                                'lastName': 'Nolan',
                                'id': 'id_user_266'
                            }
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_219',
                            'posted': '2017-04-12T23:10:13.157Z',
                            'role': 'con',
                            'text': 'Accusantium quia doloremque ut.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3633',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Obie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mufaddal_mw/128.jpg',
                                'lastName': 'Gislason',
                                'id': 'id_user_219'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_493',
                            'posted': '2017-04-04T20:02:58.584Z',
                            'role': 'pro',
                            'text': 'Qui aut maiores sapiente et eaque similique nostrum.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3643',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Eduardo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kamal_chaneman/128.jpg',
                                'lastName': 'Stark',
                                'id': 'id_user_493'
                            }
                        },
                        'con': {
                            'owner': 'id_user_294',
                            'posted': '2017-04-13T13:19:49.318Z',
                            'role': 'con',
                            'text': 'Veniam quos sint omnis consequatur qui.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3626',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Luciano',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sawrb/128.jpg',
                                'lastName': 'Steuber',
                                'id': 'id_user_294'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_433',
                            'posted': '2017-04-04T08:00:48.877Z',
                            'role': 'pro',
                            'text': 'Minus aspernatur ut sunt minima ea dolores dicta.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3638',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Modesto',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/uxpiper/128.jpg',
                                'lastName': 'Dooley',
                                'id': 'id_user_433'
                            }
                        }, 'con': null
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_260',
                            'posted': '2017-04-05T10:17:53.086Z',
                            'role': 'pro',
                            'text': 'Unde et harum voluptate officia quidem beatae itaque.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3652',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Salvador',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/meln1ks/128.jpg',
                                'lastName': 'Rempel',
                                'id': 'id_user_260'
                            }
                        },
                        'con': {
                            'owner': 'id_user_435',
                            'posted': '2017-04-17T17:51:55.228Z',
                            'role': 'con',
                            'text': 'Et quia eum in et odio architecto.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3631',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Eldora',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/puzik/128.jpg',
                                'lastName': 'Hermann',
                                'id': 'id_user_435'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_420',
                            'posted': '2017-04-06T18:14:14.953Z',
                            'role': 'pro',
                            'text': 'Ut enim ut similique corporis sapiente eius error.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3613',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Marjory',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/teeragit/128.jpg',
                                'lastName': 'Krajcik',
                                'id': 'id_user_420'
                            }
                        },
                        'con': {
                            'owner': 'id_user_157',
                            'posted': '2017-04-15T19:09:29.599Z',
                            'role': 'con',
                            'text': 'Non quasi et magni ipsa repellendus dolores eum eveniet accusantium.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3615',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Kaylin',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dannol/128.jpg',
                                'lastName': 'Medhurst',
                                'id': 'id_user_157'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_354',
                            'posted': '2017-04-13T04:49:31.923Z',
                            'role': 'pro',
                            'text': 'Ut est fuga quis repellendus eius enim alias sed.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_3627',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Parker',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xtopherpaul/128.jpg',
                                'lastName': 'Pagac',
                                'id': 'id_user_354'
                            }
                        },
                        'con': {
                            'owner': 'id_user_352',
                            'posted': '2017-04-14T18:22:37.377Z',
                            'role': 'con',
                            'text': 'Esse similique recusandae voluptas.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_3653',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Tania',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/garand/128.jpg',
                                'lastName': 'Beatty',
                                'id': 'id_user_352'
                            }
                        }
                    }
                }
            }
        },
        'id_item_3654': {
            'total': {
                'votes': { 'yes': 21, 'no': 11 },
                'comments': { 'pro': 1, 'con': 0, 'neutral': 2 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 1 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_183',
                    'posted': '2017-04-07T01:11:28.113Z',
                    'role': 'pro',
                    'text': 'Aperiam dolorum aliquam earum blanditiis consequatur.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_3689',
                    'votes': { 'up': 2, 'down': 1 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Rubye',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/imomenui/128.jpg',
                        'lastName': 'Bernier',
                        'id': 'id_user_183'
                    }
                },
                'con': null,
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_183',
                            'posted': '2017-04-07T01:11:28.113Z',
                            'role': 'pro',
                            'text': 'Aperiam dolorum aliquam earum blanditiis consequatur.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3689',
                            'votes': { 'up': 2, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Rubye',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/imomenui/128.jpg',
                                'lastName': 'Bernier',
                                'id': 'id_user_183'
                            }
                        }, 'con': null
                    },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_3690': {
            'total': {
                'votes': { 'yes': 55, 'no': 42 },
                'comments': { 'pro': 6, 'con': 6, 'neutral': 9 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 9 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
                'id_district_105': { 'votes': { 'yes': 5, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
                'id_district_106': { 'votes': { 'yes': 6, 'no': 2 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 4, 'no': 5 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 6, 'no': 4 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 6, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 5, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_156',
                    'posted': '2017-04-08T08:46:14.415Z',
                    'role': 'pro',
                    'text': 'Facilis et cum voluptatum eos.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_3808',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Eunice',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ramanathan_pdy/128.jpg',
                        'lastName': 'Veum',
                        'id': 'id_user_156'
                    }
                },
                'con': {
                    'owner': 'id_user_506',
                    'posted': '2017-04-07T03:29:00.774Z',
                    'role': 'con',
                    'text': 'Ab ex odit.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_3796',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Brad',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/omnizya/128.jpg',
                        'lastName': 'Kautzer',
                        'id': 'id_user_506'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_248',
                            'posted': '2017-04-13T04:24:06.293Z',
                            'role': 'pro',
                            'text': 'Aut et sed quibusdam non.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3800',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jayne',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joshuaraichur/128.jpg',
                                'lastName': 'Runolfsson',
                                'id': 'id_user_248'
                            }
                        },
                        'con': {
                            'owner': 'id_user_208',
                            'posted': '2017-04-15T11:51:44.869Z',
                            'role': 'con',
                            'text': 'Illum ut aut.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3798',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Paxton',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/klefue/128.jpg',
                                'lastName': 'Hagenes',
                                'id': 'id_user_208'
                            }
                        }
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_321',
                            'posted': '2017-04-11T18:42:20.054Z',
                            'role': 'pro',
                            'text': 'Possimus qui repellendus qui rem.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3807',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lulu',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/claudioguglieri/128.jpg',
                                'lastName': 'Dach',
                                'id': 'id_user_321'
                            }
                        }, 'con': null
                    },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_124',
                            'posted': '2017-04-12T05:28:39.159Z',
                            'role': 'pro',
                            'text': 'Et nesciunt fugiat earum ad omnis delectus amet aut eum.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3790',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Hardy',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dshster/128.jpg',
                                'lastName': 'Shanahan',
                                'id': 'id_user_124'
                            }
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_263',
                            'posted': '2017-04-14T06:23:48.326Z',
                            'role': 'con',
                            'text': 'Quia vero beatae.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3788',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Arnold',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lingeswaran/128.jpg',
                                'lastName': 'Brakus',
                                'id': 'id_user_263'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_156',
                            'posted': '2017-04-08T08:46:14.415Z',
                            'role': 'pro',
                            'text': 'Facilis et cum voluptatum eos.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3808',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Eunice',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ramanathan_pdy/128.jpg',
                                'lastName': 'Veum',
                                'id': 'id_user_156'
                            }
                        },
                        'con': {
                            'owner': 'id_user_506',
                            'posted': '2017-04-07T03:29:00.774Z',
                            'role': 'con',
                            'text': 'Ab ex odit.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3796',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Brad',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/omnizya/128.jpg',
                                'lastName': 'Kautzer',
                                'id': 'id_user_506'
                            }
                        }
                    },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_3809': {
            'total': {
                'votes': { 'yes': 42, 'no': 37 },
                'comments': { 'pro': 8, 'con': 10, 'neutral': 9 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 1, 'no': 1 },
                    'comments': { 'pro': 0, 'con': 2, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 2, 'no': 8 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 6, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 4, 'no': 6 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 2 } },
                'id_district_108': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 6, 'no': 8 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_304',
                    'posted': '2017-04-16T00:56:58.043Z',
                    'role': 'pro',
                    'text': 'Sit aliquid sed sit illum et veniam quis sed laboriosam.',
                    'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                    'id': 'id_comment_3913',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_110',
                                'name': 'District 10',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Eve',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/adellecharles/128.jpg',
                        'lastName': 'Grant',
                        'id': 'id_user_304'
                    }
                },
                'con': {
                    'owner': 'id_user_474',
                    'posted': '2017-04-08T01:28:08.834Z',
                    'role': 'con',
                    'text': 'Dolorem ipsum totam deserunt non non nam.',
                    'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                    'id': 'id_comment_3892',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_101',
                                'name': 'District 1',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Caesar',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vj_demien/128.jpg',
                        'lastName': 'Howe',
                        'id': 'id_user_474'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_474',
                            'posted': '2017-04-08T01:28:08.834Z',
                            'role': 'con',
                            'text': 'Dolorem ipsum totam deserunt non non nam.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3892',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Caesar',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vj_demien/128.jpg',
                                'lastName': 'Howe',
                                'id': 'id_user_474'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_121',
                            'posted': '2017-04-16T16:03:50.752Z',
                            'role': 'pro',
                            'text': 'Non repudiandae voluptas cupiditate esse vel.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_3908',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Rico',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joshuaraichur/128.jpg',
                                'lastName': 'Waters',
                                'id': 'id_user_121'
                            }
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_117',
                            'posted': '2017-04-14T19:54:07.906Z',
                            'role': 'pro',
                            'text': 'Cum inventore eveniet.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3905',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Aiyana',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/posterjob/128.jpg',
                                'lastName': 'Hahn',
                                'id': 'id_user_117'
                            }
                        },
                        'con': {
                            'owner': 'id_user_343',
                            'posted': '2017-04-07T20:40:53.343Z',
                            'role': 'con',
                            'text': 'Et rerum voluptatibus quae quisquam assumenda ut et ut quia.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3906',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Raegan',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artd_sign/128.jpg',
                                'lastName': 'Adams',
                                'id': 'id_user_343'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_372',
                            'posted': '2017-04-07T05:08:51.721Z',
                            'role': 'pro',
                            'text': 'Aut hic nostrum vero vel voluptas quibusdam aut ab.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_3912',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Delilah',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/netonet_il/128.jpg',
                                'lastName': 'Rodriguez',
                                'id': 'id_user_372'
                            }
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_340',
                            'posted': '2017-04-06T01:23:57.097Z',
                            'role': 'con',
                            'text': 'Ipsum eum ducimus saepe aperiam consectetur aut nihil.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3902',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Stone',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mhaligowski/128.jpg',
                                'lastName': 'Rutherford',
                                'id': 'id_user_340'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_255',
                            'posted': '2017-04-13T06:31:33.945Z',
                            'role': 'con',
                            'text': 'Enim eos harum.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3911',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Louvenia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jodytaggart/128.jpg',
                                'lastName': 'Ritchie',
                                'id': 'id_user_255'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_241',
                            'posted': '2017-04-15T09:10:05.303Z',
                            'role': 'pro',
                            'text': 'Consequuntur magni sed enim facere cupiditate.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3904',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Shea',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/baliomega/128.jpg',
                                'lastName': 'Mayer',
                                'id': 'id_user_241'
                            }
                        }, 'con': null
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_353',
                            'posted': '2017-04-10T16:20:50.717Z',
                            'role': 'con',
                            'text': 'Ab amet iusto provident vitae expedita nobis magnam.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3890',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Beaulah',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/goddardlewis/128.jpg',
                                'lastName': 'Kuvalis',
                                'id': 'id_user_353'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_408',
                            'posted': '2017-04-11T19:15:31.227Z',
                            'role': 'con',
                            'text': 'Beatae qui aut sed vel ut omnis odit.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3915',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Stephon',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/manigm/128.jpg',
                                'lastName': 'Bernhard',
                                'id': 'id_user_408'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_304',
                            'posted': '2017-04-16T00:56:58.043Z',
                            'role': 'pro',
                            'text': 'Sit aliquid sed sit illum et veniam quis sed laboriosam.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_3913',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Eve',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/adellecharles/128.jpg',
                                'lastName': 'Grant',
                                'id': 'id_user_304'
                            }
                        },
                        'con': {
                            'owner': 'id_user_129',
                            'posted': '2017-04-08T09:09:08.359Z',
                            'role': 'con',
                            'text': 'Dolor inventore perspiciatis.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_3891',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Wanda',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/russoedu/128.jpg',
                                'lastName': 'Beer',
                                'id': 'id_user_129'
                            }
                        }
                    }
                }
            }
        },
        'id_item_3916': {
            'total': {
                'votes': { 'yes': 12, 'no': 9 },
                'comments': { 'pro': 14, 'con': 11, 'neutral': 10 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 0 },
                    'comments': { 'pro': 1, 'con': 1, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 4, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 4, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 6, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 3, 'con': 2, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_165',
                    'posted': '2017-04-07T06:15:48.865Z',
                    'role': 'pro',
                    'text': 'Sint corrupti voluptatum deleniti saepe ea deleniti aut.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_3945',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Ashlee',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nbirckel/128.jpg',
                        'lastName': 'Kulas',
                        'id': 'id_user_165'
                    }
                },
                'con': {
                    'owner': 'id_user_177',
                    'posted': '2017-04-09T13:21:52.566Z',
                    'role': 'con',
                    'text': 'Adipisci quisquam optio doloremque illo.',
                    'id': 'id_comment_3970',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'firstName': 'Name',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/baluli/128.jpg',
                        'lastName': 'Grady',
                        'id': 'id_user_177'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_386',
                            'posted': '2017-04-10T09:39:27.149Z',
                            'role': 'pro',
                            'text': 'Quod sit praesentium iusto ut est illum voluptatum minus.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3964',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Veronica',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jonathansimmons/128.jpg',
                                'lastName': 'Steuber',
                                'id': 'id_user_386'
                            }
                        },
                        'con': {
                            'owner': 'id_user_387',
                            'posted': '2017-04-06T07:52:32.863Z',
                            'role': 'con',
                            'text': 'Porro rerum aut eos alias.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_3961',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jamir',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/foczzi/128.jpg',
                                'lastName': 'Zboncak',
                                'id': 'id_user_387'
                            }
                        }
                    },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_388',
                            'posted': '2017-04-17T05:27:48.954Z',
                            'role': 'con',
                            'text': 'Sed itaque sed qui voluptate placeat et.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_3965',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Darryl',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/francis_vega/128.jpg',
                                'lastName': 'Boyer',
                                'id': 'id_user_388'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_379',
                            'posted': '2017-04-16T04:19:11.989Z',
                            'role': 'pro',
                            'text': 'Voluptas quia necessitatibus rerum sunt accusamus at iusto debitis magnam.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_3952',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Sophie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/namankreative/128.jpg',
                                'lastName': 'Bahringer',
                                'id': 'id_user_379'
                            }
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_142',
                            'posted': '2017-04-04T21:38:50.265Z',
                            'role': 'pro',
                            'text': 'Aut itaque saepe delectus porro.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_3958',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Aiyana',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/billyroshan/128.jpg',
                                'lastName': 'Luettgen',
                                'id': 'id_user_142'
                            }
                        }, 'con': null
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_164',
                            'posted': '2017-04-09T21:15:09.212Z',
                            'role': 'pro',
                            'text': 'Est laboriosam necessitatibus maiores aperiam pariatur voluptas.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3949',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Titus',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/adamsxu/128.jpg',
                                'lastName': 'Kunde',
                                'id': 'id_user_164'
                            }
                        },
                        'con': {
                            'owner': 'id_user_164',
                            'posted': '2017-04-09T09:12:50.457Z',
                            'role': 'con',
                            'text': 'Consequatur dolore dolorem repellendus optio.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_3955',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Titus',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/adamsxu/128.jpg',
                                'lastName': 'Kunde',
                                'id': 'id_user_164'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_273',
                            'posted': '2017-04-14T14:26:13.189Z',
                            'role': 'pro',
                            'text': 'Aut qui minus quo aperiam.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_3953',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Judd',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wim1k/128.jpg',
                                'lastName': 'Jakubowski',
                                'id': 'id_user_273'
                            }
                        }, 'con': null
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_165',
                            'posted': '2017-04-07T06:15:48.865Z',
                            'role': 'pro',
                            'text': 'Sint corrupti voluptatum deleniti saepe ea deleniti aut.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_3945',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ashlee',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nbirckel/128.jpg',
                                'lastName': 'Kulas',
                                'id': 'id_user_165'
                            }
                        }, 'con': null
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_383',
                            'posted': '2017-04-12T03:43:24.135Z',
                            'role': 'pro',
                            'text': 'Atque nobis doloremque qui dolor consequatur enim.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_3972',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Carlee',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/elbuscainfo/128.jpg',
                                'lastName': 'Heller',
                                'id': 'id_user_383'
                            }
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_352',
                            'posted': '2017-04-10T07:01:25.879Z',
                            'role': 'pro',
                            'text': 'Quae aliquam molestiae id eum in dolorem quod ut.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_3946',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Tania',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/garand/128.jpg',
                                'lastName': 'Beatty',
                                'id': 'id_user_352'
                            }
                        },
                        'con': {
                            'owner': 'id_user_211',
                            'posted': '2017-04-15T03:38:22.698Z',
                            'role': 'con',
                            'text': 'Ipsam consectetur modi quidem aut ipsum qui.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_3941',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Hugh',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/foczzi/128.jpg',
                                'lastName': 'Conn',
                                'id': 'id_user_211'
                            }
                        }
                    }
                }
            }
        },
        'id_item_3973': {
            'total': {
                'votes': { 'yes': 45, 'no': 32 },
                'comments': { 'pro': 3, 'con': 8, 'neutral': 4 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 10, 'no': 1 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 5, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_269',
                    'posted': '2017-04-07T12:38:03.757Z',
                    'role': 'pro',
                    'text': 'Assumenda sequi ut eaque sed est corporis veniam voluptatibus sint.',
                    'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                    'id': 'id_comment_4057',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_109',
                                'name': 'District 9',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Travis',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/denisepires/128.jpg',
                        'lastName': 'Carroll',
                        'id': 'id_user_269'
                    }
                },
                'con': {
                    'owner': 'id_user_222',
                    'posted': '2017-04-04T01:40:03.981Z',
                    'role': 'con',
                    'text': 'Harum assumenda unde.',
                    'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                    'id': 'id_comment_4063',
                    'votes': { 'up': 2, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_108',
                                'name': 'District 8',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Sandy',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/teylorfeliz/128.jpg',
                        'lastName': 'Howe',
                        'id': 'id_user_222'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_424',
                            'posted': '2017-04-05T15:05:06.101Z',
                            'role': 'pro',
                            'text': 'Et veritatis rerum aliquid corrupti officiis molestias natus.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_4052',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Kaia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nacho/128.jpg',
                                'lastName': 'Bartoletti',
                                'id': 'id_user_424'
                            }
                        },
                        'con': {
                            'owner': 'id_user_127',
                            'posted': '2017-04-10T00:06:13.298Z',
                            'role': 'con',
                            'text': 'Voluptate dignissimos voluptas aut.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_4055',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Bailee',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/uxward/128.jpg',
                                'lastName': 'Halvorson',
                                'id': 'id_user_127'
                            }
                        }
                    },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_264',
                            'posted': '2017-04-04T16:26:50.064Z',
                            'role': 'con',
                            'text': 'Voluptates neque aspernatur eius labore explicabo commodi saepe.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_4054',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Arden',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/malykhinv/128.jpg',
                                'lastName': 'Terry',
                                'id': 'id_user_264'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_241',
                            'posted': '2017-04-16T19:33:06.907Z',
                            'role': 'con',
                            'text': 'Sit corrupti exercitationem soluta.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_4056',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Shea',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/baliomega/128.jpg',
                                'lastName': 'Mayer',
                                'id': 'id_user_241'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_222',
                            'posted': '2017-04-04T01:40:03.981Z',
                            'role': 'con',
                            'text': 'Harum assumenda unde.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_4063',
                            'votes': { 'up': 2, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Sandy',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/teylorfeliz/128.jpg',
                                'lastName': 'Howe',
                                'id': 'id_user_222'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_269',
                            'posted': '2017-04-07T12:38:03.757Z',
                            'role': 'pro',
                            'text': 'Assumenda sequi ut eaque sed est corporis veniam voluptatibus sint.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_4057',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Travis',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/denisepires/128.jpg',
                                'lastName': 'Carroll',
                                'id': 'id_user_269'
                            }
                        }, 'con': null
                    },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_4066': {
            'total': {
                'votes': { 'yes': 30, 'no': 36 },
                'comments': { 'pro': 3, 'con': 2, 'neutral': 1 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 0 },
                    'comments': { 'pro': 1, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 4, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 5, 'no': 6 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 2, 'no': 6 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_112',
                    'posted': '2017-04-09T05:21:23.593Z',
                    'role': 'pro',
                    'text': 'Nemo minus iste cum.',
                    'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                    'id': 'id_comment_4133',
                    'votes': { 'up': 4, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_109',
                                'name': 'District 9',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Jayme',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/boxmodel/128.jpg',
                        'lastName': 'Casper',
                        'id': 'id_user_112'
                    }
                },
                'con': {
                    'owner': 'id_user_302',
                    'posted': '2017-04-12T11:06:33.214Z',
                    'role': 'con',
                    'text': 'Id praesentium voluptatibus pariatur odit rerum.',
                    'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                    'id': 'id_comment_4136',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_110',
                                'name': 'District 10',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Elliott',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/giancarlon/128.jpg',
                        'lastName': 'Prohaska',
                        'id': 'id_user_302'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_130',
                            'posted': '2017-04-15T09:07:50.378Z',
                            'role': 'pro',
                            'text': 'Facere aliquid vel.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_4134',
                            'votes': { 'up': 0, 'down': 2 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Delores',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alsobrooks/128.jpg',
                                'lastName': 'Ullrich',
                                'id': 'id_user_130'
                            }
                        }, 'con': null
                    },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_112',
                            'posted': '2017-04-09T05:21:23.593Z',
                            'role': 'pro',
                            'text': 'Nemo minus iste cum.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_4133',
                            'votes': { 'up': 4, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jayme',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/boxmodel/128.jpg',
                                'lastName': 'Casper',
                                'id': 'id_user_112'
                            }
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_302',
                            'posted': '2017-04-12T11:06:33.214Z',
                            'role': 'con',
                            'text': 'Id praesentium voluptatibus pariatur odit rerum.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_4136',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Elliott',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/giancarlon/128.jpg',
                                'lastName': 'Prohaska',
                                'id': 'id_user_302'
                            }
                        }
                    }
                }
            }
        },
        'id_item_4139': {
            'total': {
                'votes': { 'yes': 13, 'no': 10 },
                'comments': { 'pro': 12, 'con': 12, 'neutral': 11 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 1 },
                    'comments': { 'pro': 0, 'con': 1, 'neutral': 2 }
                },
                'id_district_102': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 3, 'con': 2, 'neutral': 2 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_247',
                    'posted': '2017-04-08T17:44:45.610Z',
                    'role': 'pro',
                    'text': 'Sequi officiis alias a magnam iusto inventore nesciunt qui consequatur.',
                    'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                    'id': 'id_comment_4187',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_105',
                                'name': 'District 5',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Westley',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kucingbelang4/128.jpg',
                        'lastName': 'Fadel',
                        'id': 'id_user_247'
                    }
                },
                'con': {
                    'owner': 'id_user_439',
                    'posted': '2017-04-04T08:22:32.483Z',
                    'role': 'con',
                    'text': 'Quia quae ut maxime explicabo ut.',
                    'id': 'id_comment_4186',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'firstName': 'Raheem',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/switmer777/128.jpg',
                        'lastName': 'Koelpin',
                        'id': 'id_user_439'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_427',
                            'posted': '2017-04-08T05:47:26.129Z',
                            'role': 'con',
                            'text': 'Repellendus velit reiciendis sed.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_4194',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Marta',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ruzinav/128.jpg',
                                'lastName': 'Barrows',
                                'id': 'id_user_427'
                            }
                        }
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_231',
                            'posted': '2017-04-13T07:14:56.828Z',
                            'role': 'pro',
                            'text': 'Modi aperiam corporis.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_4168',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alan',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/pierrestoffe/128.jpg',
                                'lastName': 'Schoen',
                                'id': 'id_user_231'
                            }
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_428',
                            'posted': '2017-04-13T16:54:36.745Z',
                            'role': 'pro',
                            'text': 'Expedita at voluptatem fuga quod aut natus.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_4197',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Cameron',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cadikkara/128.jpg',
                                'lastName': 'Wolff',
                                'id': 'id_user_428'
                            }
                        },
                        'con': {
                            'owner': 'id_user_182',
                            'posted': '2017-04-14T12:45:27.299Z',
                            'role': 'con',
                            'text': 'Quia impedit vel.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_4170',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jude',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dimaposnyy/128.jpg',
                                'lastName': 'Rau',
                                'id': 'id_user_182'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_226',
                            'posted': '2017-04-04T00:48:05.556Z',
                            'role': 'con',
                            'text': 'Corporis nam facilis a.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_4189',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Mortimer',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/davidsasda/128.jpg',
                                'lastName': 'Veum',
                                'id': 'id_user_226'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_247',
                            'posted': '2017-04-08T17:44:45.610Z',
                            'role': 'pro',
                            'text': 'Sequi officiis alias a magnam iusto inventore nesciunt qui consequatur.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_4187',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Westley',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kucingbelang4/128.jpg',
                                'lastName': 'Fadel',
                                'id': 'id_user_247'
                            }
                        },
                        'con': {
                            'owner': 'id_user_142',
                            'posted': '2017-04-07T05:10:46.488Z',
                            'role': 'con',
                            'text': 'Repudiandae consequatur aspernatur facere aut nihil similique id ad sunt.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_4166',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Aiyana',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/billyroshan/128.jpg',
                                'lastName': 'Luettgen',
                                'id': 'id_user_142'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_384',
                            'posted': '2017-04-12T06:33:40.681Z',
                            'role': 'pro',
                            'text': 'Ut reprehenderit maxime et ratione et.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_4173',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Savion',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/okcoker/128.jpg',
                                'lastName': 'Parker',
                                'id': 'id_user_384'
                            }
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_433',
                            'posted': '2017-04-15T14:02:27.724Z',
                            'role': 'pro',
                            'text': 'Id recusandae laboriosam voluptas corrupti sunt.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_4163',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Modesto',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/uxpiper/128.jpg',
                                'lastName': 'Dooley',
                                'id': 'id_user_433'
                            }
                        },
                        'con': {
                            'owner': 'id_user_316',
                            'posted': '2017-04-04T03:40:21.954Z',
                            'role': 'con',
                            'text': 'Eaque excepturi blanditiis voluptatum ad possimus nihil.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_4167',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Caesar',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/namankreative/128.jpg',
                                'lastName': 'Hagenes',
                                'id': 'id_user_316'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_345',
                            'posted': '2017-04-07T19:13:44.285Z',
                            'role': 'pro',
                            'text': 'Aut rerum amet.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_4193',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Americo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fran_mchamy/128.jpg',
                                'lastName': 'Gleichner',
                                'id': 'id_user_345'
                            }
                        },
                        'con': {
                            'owner': 'id_user_353',
                            'posted': '2017-04-16T00:55:07.738Z',
                            'role': 'con',
                            'text': 'Natus vitae illo voluptatibus suscipit est libero voluptatibus voluptas ad.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_4179',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Beaulah',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/goddardlewis/128.jpg',
                                'lastName': 'Kuvalis',
                                'id': 'id_user_353'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_429',
                            'posted': '2017-04-16T16:34:33.068Z',
                            'role': 'pro',
                            'text': 'Soluta repudiandae aut sed doloremque est dolore quae deleniti.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_4174',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Evangeline',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/larrybolt/128.jpg',
                                'lastName': 'Brown',
                                'id': 'id_user_429'
                            }
                        },
                        'con': {
                            'owner': 'id_user_382',
                            'posted': '2017-04-04T20:09:55.914Z',
                            'role': 'con',
                            'text': 'Nulla ut non iste molestiae nesciunt asperiores.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_4165',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Elena',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nelsonjoyce/128.jpg',
                                'lastName': 'Breitenberg',
                                'id': 'id_user_382'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_140',
                            'posted': '2017-04-12T12:30:29.024Z',
                            'role': 'con',
                            'text': 'Est temporibus suscipit.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_4184',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Hershel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jydesign/128.jpg',
                                'lastName': 'Hackett',
                                'id': 'id_user_140'
                            }
                        }
                    }
                }
            }
        },
        'id_item_4198': {
            'total': {
                'votes': { 'yes': 45, 'no': 31 },
                'comments': { 'pro': 1, 'con': 0, 'neutral': 0 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 2 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 5, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 8, 'no': 7 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 5, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_150',
                    'posted': '2017-04-10T11:44:06.678Z',
                    'role': 'pro',
                    'text': 'Ut cum ipsam maxime sit doloremque nobis eum pariatur voluptatum.',
                    'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                    'id': 'id_comment_4275',
                    'votes': { 'up': 7, 'down': 3 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_106',
                                'name': 'District 6',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Tiana',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marclgonzales/128.jpg',
                        'lastName': 'Metz',
                        'id': 'id_user_150'
                    }
                },
                'con': null,
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': { 'pro': null, 'con': null },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_150',
                            'posted': '2017-04-10T11:44:06.678Z',
                            'role': 'pro',
                            'text': 'Ut cum ipsam maxime sit doloremque nobis eum pariatur voluptatum.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_4275',
                            'votes': { 'up': 7, 'down': 3 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Tiana',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marclgonzales/128.jpg',
                                'lastName': 'Metz',
                                'id': 'id_user_150'
                            }
                        }, 'con': null
                    },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_4276': {
            'total': {
                'votes': { 'yes': 17, 'no': 11 },
                'comments': { 'pro': 1, 'con': 1, 'neutral': 4 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 0 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 3 }
                },
                'id_district_102': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_115',
                    'posted': '2017-04-04T04:14:36.897Z',
                    'role': 'pro',
                    'text': 'Eos exercitationem fuga sed consequatur sit qui cupiditate.',
                    'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                    'id': 'id_comment_4307',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_102',
                                'name': 'District 2',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Imelda',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dhoot_amit/128.jpg',
                        'lastName': 'Parker',
                        'id': 'id_user_115'
                    }
                },
                'con': {
                    'owner': 'id_user_450',
                    'posted': '2017-04-10T18:06:22.035Z',
                    'role': 'con',
                    'text': 'Qui consequuntur sint consequatur impedit.',
                    'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                    'id': 'id_comment_4308',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_104',
                                'name': 'District 4',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Melissa',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buryaknick/128.jpg',
                        'lastName': 'Crona',
                        'id': 'id_user_450'
                    }
                },
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_115',
                            'posted': '2017-04-04T04:14:36.897Z',
                            'role': 'pro',
                            'text': 'Eos exercitationem fuga sed consequatur sit qui cupiditate.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_4307',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Imelda',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dhoot_amit/128.jpg',
                                'lastName': 'Parker',
                                'id': 'id_user_115'
                            }
                        }, 'con': null
                    },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_450',
                            'posted': '2017-04-10T18:06:22.035Z',
                            'role': 'con',
                            'text': 'Qui consequuntur sint consequatur impedit.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_4308',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Melissa',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buryaknick/128.jpg',
                                'lastName': 'Crona',
                                'id': 'id_user_450'
                            }
                        }
                    },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_512': {
            'total': {
                'votes': { 'yes': 55, 'no': 42 },
                'comments': { 'pro': 18, 'con': 11, 'neutral': 11 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 4, 'no': 4 },
                    'comments': { 'pro': 2, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
                'id_district_103': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 6, 'no': 5 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
                'id_district_106': { 'votes': { 'yes': 3, 'no': 6 }, 'comments': { 'pro': 4, 'con': 3, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 5, 'no': 5 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 3, 'no': 5 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 1 } },
                'id_district_109': { 'votes': { 'yes': 5, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 2 } },
                'id_district_110': { 'votes': { 'yes': 6, 'no': 6 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_294',
                    'posted': '2017-04-11T09:08:30.357Z',
                    'role': 'pro',
                    'text': 'Placeat voluptatem beatae sed ipsum veritatis ut qui aut quia.',
                    'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                    'id': 'id_comment_618',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_106',
                                'name': 'District 6',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Luciano',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sawrb/128.jpg',
                        'lastName': 'Steuber',
                        'id': 'id_user_294'
                    }
                },
                'con': {
                    'owner': 'id_user_223',
                    'posted': '2017-04-05T23:33:23.193Z',
                    'role': 'con',
                    'text': 'Tempora natus et.',
                    'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                    'id': 'id_comment_636',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_110',
                                'name': 'District 10',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Roselyn',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/scips/128.jpg',
                        'lastName': 'Hammes',
                        'id': 'id_user_223'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_357',
                            'posted': '2017-04-11T15:49:32.275Z',
                            'role': 'pro',
                            'text': 'Ea necessitatibus perspiciatis commodi dolorem ducimus et id.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_632',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Claud',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jagan123/128.jpg',
                                'lastName': 'Kuvalis',
                                'id': 'id_user_357'
                            }
                        }, 'con': null
                    },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_419',
                            'posted': '2017-04-15T19:04:47.496Z',
                            'role': 'pro',
                            'text': 'Qui aut dolorem ipsa.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_634',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Avery',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mrebay007/128.jpg',
                                'lastName': 'Wiegand',
                                'id': 'id_user_419'
                            }
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_270',
                            'posted': '2017-04-08T14:43:22.382Z',
                            'role': 'pro',
                            'text': 'Qui at expedita et dolores.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_612',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Laurel',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/richardgarretts/128.jpg',
                                'lastName': 'Blick',
                                'id': 'id_user_270'
                            }
                        },
                        'con': {
                            'owner': 'id_user_213',
                            'posted': '2017-04-04T09:38:38.575Z',
                            'role': 'con',
                            'text': 'Consectetur corrupti quam nam quos voluptatem amet.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_644',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Carmine',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sandywoodruff/128.jpg',
                                'lastName': 'Marks',
                                'id': 'id_user_213'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_131',
                            'posted': '2017-04-15T09:45:10.906Z',
                            'role': 'con',
                            'text': 'Hic ipsa facilis ratione ab sed ipsa.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_614',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Andreane',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/superoutman/128.jpg',
                                'lastName': 'Sporer',
                                'id': 'id_user_131'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_294',
                            'posted': '2017-04-11T09:08:30.357Z',
                            'role': 'pro',
                            'text': 'Placeat voluptatem beatae sed ipsum veritatis ut qui aut quia.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_618',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Luciano',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sawrb/128.jpg',
                                'lastName': 'Steuber',
                                'id': 'id_user_294'
                            }
                        },
                        'con': {
                            'owner': 'id_user_365',
                            'posted': '2017-04-11T00:18:20.805Z',
                            'role': 'con',
                            'text': 'Cumque est earum aut suscipit quidem nemo et ex.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_621',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Augusta',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kevinjohndayy/128.jpg',
                                'lastName': 'Mertz',
                                'id': 'id_user_365'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_433',
                            'posted': '2017-04-08T12:20:29.435Z',
                            'role': 'pro',
                            'text': 'Unde pariatur et omnis.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_625',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Modesto',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/uxpiper/128.jpg',
                                'lastName': 'Dooley',
                                'id': 'id_user_433'
                            }
                        },
                        'con': {
                            'owner': 'id_user_159',
                            'posted': '2017-04-14T03:09:56.203Z',
                            'role': 'con',
                            'text': 'Ut ducimus consequuntur aliquam.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_620',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ora',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/baires/128.jpg',
                                'lastName': 'Rau',
                                'id': 'id_user_159'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_435',
                            'posted': '2017-04-11T06:57:19.761Z',
                            'role': 'pro',
                            'text': 'Qui optio dolores corporis est.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_633',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Eldora',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/puzik/128.jpg',
                                'lastName': 'Hermann',
                                'id': 'id_user_435'
                            }
                        },
                        'con': {
                            'owner': 'id_user_378',
                            'posted': '2017-04-16T02:04:38.932Z',
                            'role': 'con',
                            'text': 'Saepe in eligendi temporibus iusto.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_622',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Laron',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/teddyzetterlund/128.jpg',
                                'lastName': 'Boehm',
                                'id': 'id_user_378'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_368',
                            'posted': '2017-04-06T04:24:00.607Z',
                            'role': 'pro',
                            'text': 'Pariatur quidem delectus ex nihil.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_617',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Mary',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/Skyhartman/128.jpg',
                                'lastName': 'Beer',
                                'id': 'id_user_368'
                            }
                        }, 'con': null
                    },
                    'id_district_110': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_223',
                            'posted': '2017-04-05T23:33:23.193Z',
                            'role': 'con',
                            'text': 'Tempora natus et.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_636',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Roselyn',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/scips/128.jpg',
                                'lastName': 'Hammes',
                                'id': 'id_user_223'
                            }
                        }
                    }
                }
            }
        },
        'id_item_650': {
            'total': {
                'votes': { 'yes': 1, 'no': 1 },
                'comments': { 'pro': 9, 'con': 20, 'neutral': 11 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 0 },
                    'comments': { 'pro': 1, 'con': 0, 'neutral': 2 }
                },
                'id_district_102': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 4, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 3 } },
                'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 3 } },
                'id_district_108': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_338',
                    'posted': '2017-04-08T04:18:33.710Z',
                    'role': 'pro',
                    'text': 'Accusantium voluptas voluptates.',
                    'id': 'id_comment_661',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'firstName': 'Helena',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/akmur/128.jpg',
                        'lastName': 'Rodriguez',
                        'id': 'id_user_338'
                    }
                },
                'con': {
                    'owner': 'id_user_219',
                    'posted': '2017-04-07T22:05:24.407Z',
                    'role': 'con',
                    'text': 'Asperiores neque magnam ut et rerum quia culpa sint.',
                    'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                    'id': 'id_comment_684',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_105',
                                'name': 'District 5',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Obie',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mufaddal_mw/128.jpg',
                        'lastName': 'Gislason',
                        'id': 'id_user_219'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_281',
                            'posted': '2017-04-12T10:52:49.774Z',
                            'role': 'pro',
                            'text': 'Aspernatur odit quia necessitatibus soluta possimus quia vel.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_686',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Marques',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ahmadajmi/128.jpg',
                                'lastName': 'Corwin',
                                'id': 'id_user_281'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_237',
                            'posted': '2017-04-11T03:18:51.315Z',
                            'role': 'pro',
                            'text': 'Accusantium illo sed et eos quas aut delectus.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_691',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ruthe',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buddhasource/128.jpg',
                                'lastName': 'Douglas',
                                'id': 'id_user_237'
                            }
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_449',
                            'posted': '2017-04-15T09:15:46.050Z',
                            'role': 'pro',
                            'text': 'Nemo distinctio atque ab eveniet et repellendus suscipit et ut.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_654',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Philip',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/d33pthought/128.jpg',
                                'lastName': 'Corwin',
                                'id': 'id_user_449'
                            }
                        },
                        'con': {
                            'owner': 'id_user_373',
                            'posted': '2017-04-17T11:08:50.292Z',
                            'role': 'con',
                            'text': 'Reprehenderit consectetur provident aperiam sapiente.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_666',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Bell',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/claudioguglieri/128.jpg',
                                'lastName': 'Tromp',
                                'id': 'id_user_373'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_266',
                            'posted': '2017-04-12T02:08:15.708Z',
                            'role': 'con',
                            'text': 'Dolor vitae dolorem quibusdam et a.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_653',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Zachariah',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/AlbertoCococi/128.jpg',
                                'lastName': 'Nolan',
                                'id': 'id_user_266'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_219',
                            'posted': '2017-04-07T22:05:24.407Z',
                            'role': 'con',
                            'text': 'Asperiores neque magnam ut et rerum quia culpa sint.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_684',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Obie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mufaddal_mw/128.jpg',
                                'lastName': 'Gislason',
                                'id': 'id_user_219'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_417',
                            'posted': '2017-04-16T22:58:36.114Z',
                            'role': 'pro',
                            'text': 'Et veritatis vel placeat velit quae non ex occaecati et.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_678',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Keon',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nyancecom/128.jpg',
                                'lastName': 'Jacobson',
                                'id': 'id_user_417'
                            }
                        },
                        'con': {
                            'owner': 'id_user_190',
                            'posted': '2017-04-13T23:48:11.779Z',
                            'role': 'con',
                            'text': 'Aperiam nihil voluptas veniam doloremque in asperiores deleniti.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_660',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Concepcion',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/josemarques/128.jpg',
                                'lastName': 'Roob',
                                'id': 'id_user_190'
                            }
                        }
                    },
                    'id_district_107': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_305',
                            'posted': '2017-04-16T07:45:57.147Z',
                            'role': 'con',
                            'text': 'Fugit rerum necessitatibus voluptatum officia voluptas voluptatibus illo fuga illo.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_659',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alek',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/prheemo/128.jpg',
                                'lastName': 'Muller',
                                'id': 'id_user_305'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_345',
                            'posted': '2017-04-05T23:36:12.992Z',
                            'role': 'pro',
                            'text': 'Laudantium excepturi eos adipisci suscipit dicta dicta.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_665',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Americo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fran_mchamy/128.jpg',
                                'lastName': 'Gleichner',
                                'id': 'id_user_345'
                            }
                        },
                        'con': {
                            'owner': 'id_user_413',
                            'posted': '2017-04-14T04:31:58.331Z',
                            'role': 'con',
                            'text': 'Eos ea officiis magnam ipsa.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_670',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jakob',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iamkeithmason/128.jpg',
                                'lastName': 'Graham',
                                'id': 'id_user_413'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_429',
                            'posted': '2017-04-15T20:29:01.560Z',
                            'role': 'con',
                            'text': 'Iste tempore fugiat omnis optio voluptatem.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_673',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Evangeline',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/larrybolt/128.jpg',
                                'lastName': 'Brown',
                                'id': 'id_user_429'
                            }
                        }
                    },
                    'id_district_110': {
                        'pro': {
                            'owner': 'id_user_166',
                            'posted': '2017-04-10T21:38:55.711Z',
                            'role': 'pro',
                            'text': 'Dolor eveniet asperiores ut vero dolores tempora architecto.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_685',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ubaldo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iamkeithmason/128.jpg',
                                'lastName': 'Cruickshank',
                                'id': 'id_user_166'
                            }
                        },
                        'con': {
                            'owner': 'id_user_330',
                            'posted': '2017-04-04T11:00:26.429Z',
                            'role': 'con',
                            'text': 'Quasi voluptatibus dolorem eius similique.',
                            'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
                            'id': 'id_comment_667',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_110',
                                        'name': 'District 10',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ernest',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nutzumi/128.jpg',
                                'lastName': 'Aufderhar',
                                'id': 'id_user_330'
                            }
                        }
                    }
                }
            }
        },
        'id_item_693': {
            'total': {
                'votes': { 'yes': 40, 'no': 35 },
                'comments': { 'pro': 2, 'con': 0, 'neutral': 1 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 2, 'no': 1 },
                    'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
                },
                'id_district_102': { 'votes': { 'yes': 4, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 3, 'no': 4 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 3, 'no': 6 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 7, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_108': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_110': { 'votes': { 'yes': 4, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_163',
                    'posted': '2017-04-16T11:19:26.977Z',
                    'role': 'pro',
                    'text': 'Quis eum est iure aut saepe.',
                    'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                    'id': 'id_comment_771',
                    'votes': { 'up': 4, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_103',
                                'name': 'District 3',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Lexie',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/okseanjay/128.jpg',
                        'lastName': 'Emmerich',
                        'id': 'id_user_163'
                    }
                },
                'con': null,
                'byDistrict': {
                    'id_district_101': { 'pro': null, 'con': null },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_163',
                            'posted': '2017-04-16T11:19:26.977Z',
                            'role': 'pro',
                            'text': 'Quis eum est iure aut saepe.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_771',
                            'votes': { 'up': 4, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Lexie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/okseanjay/128.jpg',
                                'lastName': 'Emmerich',
                                'id': 'id_user_163'
                            }
                        }, 'con': null
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_459',
                            'posted': '2017-04-17T05:05:37.420Z',
                            'role': 'pro',
                            'text': 'Esse sed repudiandae similique.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_769',
                            'votes': { 'up': 2, 'down': 2 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jordyn',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alessandroribe/128.jpg',
                                'lastName': 'Schultz',
                                'id': 'id_user_459'
                            }
                        }, 'con': null
                    },
                    'id_district_105': { 'pro': null, 'con': null },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': { 'pro': null, 'con': null },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_772': {
            'total': {
                'votes': { 'yes': 24, 'no': 10 },
                'comments': { 'pro': 5, 'con': 6, 'neutral': 8 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 0, 'no': 2 },
                    'comments': { 'pro': 1, 'con': 0, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 5, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
                'id_district_107': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
                'id_district_109': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 3, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_342',
                    'posted': '2017-04-10T20:40:41.954Z',
                    'role': 'pro',
                    'text': 'Vel et unde et.',
                    'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                    'id': 'id_comment_812',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_109',
                                'name': 'District 9',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'George',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iqonicd/128.jpg',
                        'lastName': 'Watsica',
                        'id': 'id_user_342'
                    }
                },
                'con': {
                    'owner': 'id_user_316',
                    'posted': '2017-04-16T17:44:30.358Z',
                    'role': 'con',
                    'text': 'Sed sapiente non quis.',
                    'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                    'id': 'id_comment_807',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_107',
                                'name': 'District 7',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Caesar',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/namankreative/128.jpg',
                        'lastName': 'Hagenes',
                        'id': 'id_user_316'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_410',
                            'posted': '2017-04-04T08:43:05.693Z',
                            'role': 'pro',
                            'text': 'Quo ullam dicta ipsa non ipsa quas hic ut.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_821',
                            'votes': { 'up': 0, 'down': 2 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Waldo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/clubb3rry/128.jpg',
                                'lastName': 'Rice',
                                'id': 'id_user_410'
                            }
                        }, 'con': null
                    },
                    'id_district_102': { 'pro': null, 'con': null },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_457',
                            'posted': '2017-04-14T17:52:17.370Z',
                            'role': 'pro',
                            'text': 'Ad tempore vel iusto.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_817',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Chad',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/_yardenoon/128.jpg',
                                'lastName': 'Schultz',
                                'id': 'id_user_457'
                            }
                        }, 'con': null
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_311',
                            'posted': '2017-04-17T17:34:56.093Z',
                            'role': 'con',
                            'text': 'Asperiores modi velit tempore quia explicabo odio impedit quod.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_814',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Pearl',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/emmeffess/128.jpg',
                                'lastName': 'Klocko',
                                'id': 'id_user_311'
                            }
                        }
                    },
                    'id_district_106': { 'pro': null, 'con': null },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_149',
                            'posted': '2017-04-11T08:39:52.827Z',
                            'role': 'pro',
                            'text': 'Ut veniam unde aspernatur ducimus sint unde saepe facere.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_822',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Keanu',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marshallchen_/128.jpg',
                                'lastName': 'Crona',
                                'id': 'id_user_149'
                            }
                        },
                        'con': {
                            'owner': 'id_user_316',
                            'posted': '2017-04-16T17:44:30.358Z',
                            'role': 'con',
                            'text': 'Sed sapiente non quis.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_807',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Caesar',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/namankreative/128.jpg',
                                'lastName': 'Hagenes',
                                'id': 'id_user_316'
                            }
                        }
                    },
                    'id_district_108': { 'pro': null, 'con': null },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_342',
                            'posted': '2017-04-10T20:40:41.954Z',
                            'role': 'pro',
                            'text': 'Vel et unde et.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_812',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'George',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iqonicd/128.jpg',
                                'lastName': 'Watsica',
                                'id': 'id_user_342'
                            }
                        },
                        'con': {
                            'owner': 'id_user_200',
                            'posted': '2017-04-05T19:12:52.547Z',
                            'role': 'con',
                            'text': 'Placeat at nostrum aut incidunt accusantium.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_813',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Vernie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/happypeter1983/128.jpg',
                                'lastName': 'Harvey',
                                'id': 'id_user_200'
                            }
                        }
                    },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_826': {
            'total': {
                'votes': { 'yes': 36, 'no': 30 },
                'comments': { 'pro': 14, 'con': 5, 'neutral': 7 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 6, 'no': 4 },
                    'comments': { 'pro': 1, 'con': 0, 'neutral': 1 }
                },
                'id_district_102': { 'votes': { 'yes': 1, 'no': 5 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_103': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
                'id_district_104': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
                'id_district_105': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 4, 'no': 4 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
                'id_district_109': { 'votes': { 'yes': 8, 'no': 2 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
                'id_district_110': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_242',
                    'posted': '2017-04-16T06:34:41.728Z',
                    'role': 'pro',
                    'text': 'Doloribus quia eveniet.',
                    'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                    'id': 'id_comment_906',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_107',
                                'name': 'District 7',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Zetta',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jesseddy/128.jpg',
                        'lastName': 'Hartmann',
                        'id': 'id_user_242'
                    }
                },
                'con': {
                    'owner': 'id_user_363',
                    'posted': '2017-04-08T04:06:30.730Z',
                    'role': 'con',
                    'text': 'Nam quaerat aut voluptatem debitis nobis aut.',
                    'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                    'id': 'id_comment_898',
                    'votes': { 'up': 0, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_105',
                                'name': 'District 5',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Burnice',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/her_ruu/128.jpg',
                        'lastName': 'Fritsch',
                        'id': 'id_user_363'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_225',
                            'posted': '2017-04-06T04:22:28.082Z',
                            'role': 'pro',
                            'text': 'Vero est autem occaecati sed quos dolor.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_893',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Deangelo',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/coderdiaz/128.jpg',
                                'lastName': 'Kulas',
                                'id': 'id_user_225'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_374',
                            'posted': '2017-04-11T19:43:14.533Z',
                            'role': 'pro',
                            'text': 'Corrupti et qui libero et dolore explicabo laudantium accusantium necessitatibus.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_907',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Jaycee',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/grrr_nl/128.jpg',
                                'lastName': 'Kuhlman',
                                'id': 'id_user_374'
                            }
                        }, 'con': null
                    },
                    'id_district_103': { 'pro': null, 'con': null },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_399',
                            'posted': '2017-04-16T21:01:14.746Z',
                            'role': 'pro',
                            'text': 'Labore vitae ab.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_902',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Evangeline',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jacobbennett/128.jpg',
                                'lastName': 'Pollich',
                                'id': 'id_user_399'
                            }
                        },
                        'con': {
                            'owner': 'id_user_171',
                            'posted': '2017-04-13T13:49:09.522Z',
                            'role': 'con',
                            'text': 'Aperiam voluptate voluptates autem.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_918',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Iliana',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/terpimost/128.jpg',
                                'lastName': 'Hoeger',
                                'id': 'id_user_171'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': {
                            'owner': 'id_user_187',
                            'posted': '2017-04-07T14:08:15.644Z',
                            'role': 'pro',
                            'text': 'Eum adipisci alias.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_915',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Alex',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ssiskind/128.jpg',
                                'lastName': 'Daugherty',
                                'id': 'id_user_187'
                            }
                        },
                        'con': {
                            'owner': 'id_user_363',
                            'posted': '2017-04-08T04:06:30.730Z',
                            'role': 'con',
                            'text': 'Nam quaerat aut voluptatem debitis nobis aut.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_898',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Burnice',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/her_ruu/128.jpg',
                                'lastName': 'Fritsch',
                                'id': 'id_user_363'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': {
                            'owner': 'id_user_339',
                            'posted': '2017-04-06T20:26:50.335Z',
                            'role': 'pro',
                            'text': 'Reprehenderit unde ea est voluptate nihil est voluptas in.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_914',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Adolphus',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/baluli/128.jpg',
                                'lastName': 'Haley',
                                'id': 'id_user_339'
                            }
                        }, 'con': null
                    },
                    'id_district_107': {
                        'pro': {
                            'owner': 'id_user_242',
                            'posted': '2017-04-16T06:34:41.728Z',
                            'role': 'pro',
                            'text': 'Doloribus quia eveniet.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_906',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Zetta',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jesseddy/128.jpg',
                                'lastName': 'Hartmann',
                                'id': 'id_user_242'
                            }
                        },
                        'con': {
                            'owner': 'id_user_298',
                            'posted': '2017-04-08T16:41:39.683Z',
                            'role': 'con',
                            'text': 'Deleniti sit tempora blanditiis.',
                            'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
                            'id': 'id_comment_905',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_107',
                                        'name': 'District 7',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Aliyah',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arishi_/128.jpg',
                                'lastName': 'Steuber',
                                'id': 'id_user_298'
                            }
                        }
                    },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_487',
                            'posted': '2017-04-04T07:18:41.298Z',
                            'role': 'pro',
                            'text': 'Illo et laudantium saepe.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_901',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Justice',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arindam_/128.jpg',
                                'lastName': 'Bechtelar',
                                'id': 'id_user_487'
                            }
                        },
                        'con': {
                            'owner': 'id_user_508',
                            'posted': '2017-04-04T21:42:46.952Z',
                            'role': 'con',
                            'text': 'Quisquam dignissimos ut iste non voluptatem esse vero aperiam corporis.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_894',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Destin',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nellleo/128.jpg',
                                'lastName': 'Ondricka',
                                'id': 'id_user_508'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_228',
                            'posted': '2017-04-09T02:13:43.837Z',
                            'role': 'pro',
                            'text': 'Cumque aliquid reiciendis inventore omnis amet.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_908',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Ethyl',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rpeezy/128.jpg',
                                'lastName': 'Bogan',
                                'id': 'id_user_228'
                            }
                        }, 'con': null
                    },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        },
        'id_item_919': {
            'total': {
                'votes': { 'yes': 45, 'no': 40 },
                'comments': { 'pro': 10, 'con': 7, 'neutral': 10 }
            },
            'byDistrict': {
                'id_district_101': {
                    'votes': { 'yes': 3, 'no': 3 },
                    'comments': { 'pro': 2, 'con': 0, 'neutral': 2 }
                },
                'id_district_102': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 3 } },
                'id_district_103': { 'votes': { 'yes': 7, 'no': 4 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
                'id_district_104': { 'votes': { 'yes': 1, 'no': 5 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
                'id_district_105': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_106': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
                'id_district_107': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
                'id_district_108': { 'votes': { 'yes': 2, 'no': 6 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 2 } },
                'id_district_109': { 'votes': { 'yes': 9, 'no': 7 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
                'id_district_110': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
            },
            'topComments': {
                'pro': {
                    'owner': 'id_user_196',
                    'posted': '2017-04-14T07:09:00.228Z',
                    'role': 'pro',
                    'text': 'Harum qui voluptatem rerum cupiditate impedit vel repudiandae voluptatem ut.',
                    'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                    'id': 'id_comment_1017',
                    'votes': { 'up': 1, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_102',
                                'name': 'District 2',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Leif',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/aleclarsoniv/128.jpg',
                        'lastName': 'Mertz',
                        'id': 'id_user_196'
                    }
                },
                'con': {
                    'owner': 'id_user_434',
                    'posted': '2017-04-05T01:23:49.248Z',
                    'role': 'con',
                    'text': 'Velit facilis doloremque sit praesentium.',
                    'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                    'id': 'id_comment_1022',
                    'votes': { 'up': 2, 'down': 0 },
                    'author': {
                        'districts': {
                            'id_acc': {
                                'id': 'id_district_106',
                                'name': 'District 6',
                                'owner': 'id_doug'
                            }
                        },
                        'firstName': 'Clinton',
                        'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sta1ex/128.jpg',
                        'lastName': 'Vandervort',
                        'id': 'id_user_434'
                    }
                },
                'byDistrict': {
                    'id_district_101': {
                        'pro': {
                            'owner': 'id_user_401',
                            'posted': '2017-04-08T02:40:10.332Z',
                            'role': 'pro',
                            'text': 'Sunt iure corrupti amet porro nihil est aspernatur.',
                            'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
                            'id': 'id_comment_1014',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_101',
                                        'name': 'District 1',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Otilia',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rweve/128.jpg',
                                'lastName': 'Morar',
                                'id': 'id_user_401'
                            }
                        }, 'con': null
                    },
                    'id_district_102': {
                        'pro': {
                            'owner': 'id_user_196',
                            'posted': '2017-04-14T07:09:00.228Z',
                            'role': 'pro',
                            'text': 'Harum qui voluptatem rerum cupiditate impedit vel repudiandae voluptatem ut.',
                            'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
                            'id': 'id_comment_1017',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_102',
                                        'name': 'District 2',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Leif',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/aleclarsoniv/128.jpg',
                                'lastName': 'Mertz',
                                'id': 'id_user_196'
                            }
                        }, 'con': null
                    },
                    'id_district_103': {
                        'pro': {
                            'owner': 'id_user_303',
                            'posted': '2017-04-14T07:47:22.848Z',
                            'role': 'pro',
                            'text': 'Nesciunt quos et perferendis odio.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1008',
                            'votes': { 'up': 0, 'down': 1 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Kiley',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/toddrew/128.jpg',
                                'lastName': 'Reynolds',
                                'id': 'id_user_303'
                            }
                        },
                        'con': {
                            'owner': 'id_user_370',
                            'posted': '2017-04-06T11:39:19.534Z',
                            'role': 'con',
                            'text': 'Minus qui aut repellendus quis.',
                            'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
                            'id': 'id_comment_1028',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_103',
                                        'name': 'District 3',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Zackery',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinlayfield/128.jpg',
                                'lastName': 'Lowe',
                                'id': 'id_user_370'
                            }
                        }
                    },
                    'id_district_104': {
                        'pro': {
                            'owner': 'id_user_372',
                            'posted': '2017-04-14T02:09:42.303Z',
                            'role': 'pro',
                            'text': 'Et iure eos illum esse consequatur et dolor dolorem molestiae.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1018',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Delilah',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/netonet_il/128.jpg',
                                'lastName': 'Rodriguez',
                                'id': 'id_user_372'
                            }
                        },
                        'con': {
                            'owner': 'id_user_266',
                            'posted': '2017-04-08T16:43:20.218Z',
                            'role': 'con',
                            'text': 'Minima nesciunt sed.',
                            'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
                            'id': 'id_comment_1007',
                            'votes': { 'up': 1, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_104',
                                        'name': 'District 4',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Zachariah',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/AlbertoCococi/128.jpg',
                                'lastName': 'Nolan',
                                'id': 'id_user_266'
                            }
                        }
                    },
                    'id_district_105': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_219',
                            'posted': '2017-04-10T06:46:58.777Z',
                            'role': 'con',
                            'text': 'Praesentium doloribus sit deserunt.',
                            'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
                            'id': 'id_comment_1005',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_105',
                                        'name': 'District 5',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Obie',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mufaddal_mw/128.jpg',
                                'lastName': 'Gislason',
                                'id': 'id_user_219'
                            }
                        }
                    },
                    'id_district_106': {
                        'pro': null,
                        'con': {
                            'owner': 'id_user_434',
                            'posted': '2017-04-05T01:23:49.248Z',
                            'role': 'con',
                            'text': 'Velit facilis doloremque sit praesentium.',
                            'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
                            'id': 'id_comment_1022',
                            'votes': { 'up': 2, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_106',
                                        'name': 'District 6',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Clinton',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sta1ex/128.jpg',
                                'lastName': 'Vandervort',
                                'id': 'id_user_434'
                            }
                        }
                    },
                    'id_district_107': { 'pro': null, 'con': null },
                    'id_district_108': {
                        'pro': {
                            'owner': 'id_user_334',
                            'posted': '2017-04-08T11:14:59.686Z',
                            'role': 'pro',
                            'text': 'Magnam repellat aut tempore eveniet aut et earum modi.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1021',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Stuart',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/themikenagle/128.jpg',
                                'lastName': 'Friesen',
                                'id': 'id_user_334'
                            }
                        },
                        'con': {
                            'owner': 'id_user_378',
                            'posted': '2017-04-09T16:46:37.210Z',
                            'role': 'con',
                            'text': 'Distinctio ut aspernatur incidunt et et provident ea esse.',
                            'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
                            'id': 'id_comment_1023',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_108',
                                        'name': 'District 8',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Laron',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/teddyzetterlund/128.jpg',
                                'lastName': 'Boehm',
                                'id': 'id_user_378'
                            }
                        }
                    },
                    'id_district_109': {
                        'pro': {
                            'owner': 'id_user_283',
                            'posted': '2017-04-09T15:35:33.798Z',
                            'role': 'pro',
                            'text': 'Officia voluptatem eius.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1019',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Nelson',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nvkznemo/128.jpg',
                                'lastName': 'Runte',
                                'id': 'id_user_283'
                            }
                        },
                        'con': {
                            'owner': 'id_user_429',
                            'posted': '2017-04-16T17:14:53.176Z',
                            'role': 'con',
                            'text': 'Sit porro amet aut.',
                            'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
                            'id': 'id_comment_1030',
                            'votes': { 'up': 0, 'down': 0 },
                            'author': {
                                'districts': {
                                    'id_acc': {
                                        'id': 'id_district_109',
                                        'name': 'District 9',
                                        'owner': 'id_doug'
                                    }
                                },
                                'firstName': 'Evangeline',
                                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/larrybolt/128.jpg',
                                'lastName': 'Brown',
                                'id': 'id_user_429'
                            }
                        }
                    },
                    'id_district_110': { 'pro': null, 'con': null }
                }
            }
        }
    }
};
