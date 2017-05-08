import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Meeting, MeetingStats, parseMeeting, PartialMeeting, RawMeeting } from './meeting.model';
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
const REPORT_GENERATOR_URL = 'https://us-central1-civ-cc.cloudfunctions.net/report';

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
    let url = `${REPORT_GENERATOR_URL}?meetingId:${meetingId}`;
    if (!!forDistrict) {
      url += `&forDistrict=${forDistrict}`
    }
    return this.http.get(url)
      .map(response => response.json());
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
  'priors': [ { 'date': '2016-01-27T18:00:00.000Z', 'value': 0 }, {
    'date': '2017-03-08T23:52:51.968Z',
    'value': 0
  }, { 'date': '2017-04-12T07:00:00.000Z', 'value': 0 }, { 'date': '2017-03-22T22:52:51.818Z', 'value': 0 } ],
  'total': {
    'votes': 2614,
    'comments': 1200,
    'participants': 407,
    'byDistrict': {
      'NO_DISTRICT': { 'votes': 2614, 'comments': 97, 'participants': 36 },
      'id_district_101': { 'votes': 256, 'comments': 133, 'participants': 40 },
      'id_district_102': { 'votes': 248, 'comments': 110, 'participants': 35 },
      'id_district_103': { 'votes': 230, 'comments': 95, 'participants': 33 },
      'id_district_104': { 'votes': 232, 'comments': 110, 'participants': 38 },
      'id_district_105': { 'votes': 310, 'comments': 117, 'participants': 43 },
      'id_district_106': { 'votes': 176, 'comments': 103, 'participants': 31 },
      'id_district_107': { 'votes': 171, 'comments': 62, 'participants': 28 },
      'id_district_108': { 'votes': 237, 'comments': 117, 'participants': 40 },
      'id_district_109': { 'votes': 268, 'comments': 114, 'participants': 39 },
      'id_district_110': { 'votes': 289, 'comments': 142, 'participants': 44 }
    }
  },
  'byItem': {
    'id_item_1039': {
      'text': 'Aliquam quia sit placeat ad deserunt. Vero repellat et. Architecto vero nihil. Quo beatae dolores.',
      'itemNumber': 11,
      'total': { 'votes': { 'yes': 42, 'no': 42 }, 'comments': { 'pro': 4, 'con': 5, 'neutral': 6 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 6, 'no': 2 },
          'comments': { 'pro': 0, 'con': 1, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 4, 'no': 5 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 4, 'no': 5 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 6, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 5, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 3, 'no': 7 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 8, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_275',
          'posted': '2017-04-09T23:55:50.183Z',
          'role': 'pro',
          'text': 'Ab temporibus natus ab et iure consequatur earum non ad.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_1136',
          'votes': { 'up': 3, 'down': 1 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Bart',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dc_user/128.jpg',
            'lastName': 'Cartwright',
            'id': 'id_user_275'
          }
        },
        'con': {
          'owner': 'id_user_184',
          'posted': '2017-04-18T15:52:17.721Z',
          'role': 'con',
          'text': 'Debitis quaerat nihil delectus ut.',
          'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
          'id': 'id_comment_1124',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' } },
            'firstName': 'Mertie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/angelcolberg/128.jpg',
            'lastName': 'Mann',
            'id': 'id_user_184'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': null,
            'con': {
              'owner': 'id_user_375',
              'posted': '2017-04-14T20:18:49.204Z',
              'role': 'con',
              'text': 'Pariatur quibusdam maxime a occaecati deserunt.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1129',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Candace',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bighanddesign/128.jpg',
                'lastName': 'Bailey',
                'id': 'id_user_375'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_483',
              'posted': '2017-04-15T15:45:09.375Z',
              'role': 'pro',
              'text': 'Vero voluptatem velit aspernatur nihil sed placeat dolor.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1130',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jacinto',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/levisan/128.jpg',
                'lastName': 'Haley',
                'id': 'id_user_483'
              }
            }, 'con': null
          },
          'id_district_103': {
            'pro': null,
            'con': {
              'owner': 'id_user_395',
              'posted': '2017-04-15T11:06:52.890Z',
              'role': 'con',
              'text': 'Sapiente ea magni.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1128',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Guy',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cadikkara/128.jpg',
                'lastName': 'Hilpert',
                'id': 'id_user_395'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_475',
              'posted': '2017-04-13T22:40:33.020Z',
              'role': 'pro',
              'text': 'Blanditiis placeat quisquam modi iusto et.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1132',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Dana',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tonymillion/128.jpg',
                'lastName': 'Bechtelar',
                'id': 'id_user_475'
              }
            },
            'con': {
              'owner': 'id_user_271',
              'posted': '2017-04-13T22:44:57.349Z',
              'role': 'con',
              'text': 'Quasi totam et et est magni.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1133',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Greg',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fronx/128.jpg',
                'lastName': 'Rath',
                'id': 'id_user_271'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_275',
              'posted': '2017-04-09T23:55:50.183Z',
              'role': 'pro',
              'text': 'Ab temporibus natus ab et iure consequatur earum non ad.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1136',
              'votes': { 'up': 3, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Bart',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dc_user/128.jpg',
                'lastName': 'Cartwright',
                'id': 'id_user_275'
              }
            }, 'con': null
          },
          'id_district_106': { 'pro': null, 'con': null },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': null,
            'con': {
              'owner': 'id_user_184',
              'posted': '2017-04-18T15:52:17.721Z',
              'role': 'con',
              'text': 'Debitis quaerat nihil delectus ut.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1124',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mertie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/angelcolberg/128.jpg',
                'lastName': 'Mann',
                'id': 'id_user_184'
              }
            }
          }
        }
      }
    },
    'id_item_1139': {
      'text': 'Similique est minima non quia rerum ut consequuntur quia temporibus. Enim voluptate omnis rem ea optio asperiores. Beatae dignissimos et assumenda labore voluptas est ut in quod. Tenetur id dolorum beatae molestiae iste voluptas molestias excepturi corporis.',
      'itemNumber': 12,
      'total': { 'votes': { 'yes': 17, 'no': 17 }, 'comments': { 'pro': 9, 'con': 8, 'neutral': 10 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 1, 'no': 4 },
          'comments': { 'pro': 0, 'con': 1, 'neutral': 2 }
        },
        'id_district_102': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 4, 'con': 2, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 2 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_164',
          'posted': '2017-04-11T23:51:58.073Z',
          'role': 'pro',
          'text': 'Sunt aut neque.',
          'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
          'id': 'id_comment_1181',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' } },
            'firstName': 'Tessie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/txcx/128.jpg',
            'lastName': 'Schimmel',
            'id': 'id_user_164'
          }
        },
        'con': {
          'owner': 'id_user_143',
          'posted': '2017-04-09T06:18:25.922Z',
          'role': 'con',
          'text': 'Praesentium distinctio est est ducimus.',
          'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
          'id': 'id_comment_1186',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' } },
            'firstName': 'Gerson',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fabbianz/128.jpg',
            'lastName': 'Metz',
            'id': 'id_user_143'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': null,
            'con': {
              'owner': 'id_user_143',
              'posted': '2017-04-09T06:18:25.922Z',
              'role': 'con',
              'text': 'Praesentium distinctio est est ducimus.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1186',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Gerson',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fabbianz/128.jpg',
                'lastName': 'Metz',
                'id': 'id_user_143'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_164',
              'posted': '2017-04-11T23:51:58.073Z',
              'role': 'pro',
              'text': 'Sunt aut neque.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1181',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Tessie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/txcx/128.jpg',
                'lastName': 'Schimmel',
                'id': 'id_user_164'
              }
            },
            'con': {
              'owner': 'id_user_493',
              'posted': '2017-04-11T08:43:17.892Z',
              'role': 'con',
              'text': 'Neque voluptatem id laudantium alias nihil omnis ratione a.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1182',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Herman',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/al_li/128.jpg',
                'lastName': 'Welch',
                'id': 'id_user_493'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_465',
              'posted': '2017-04-16T09:51:45.469Z',
              'role': 'pro',
              'text': 'Fugit sed rem in velit voluptas.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1173',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Macie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ntfblog/128.jpg',
                'lastName': 'Kreiger',
                'id': 'id_user_465'
              }
            },
            'con': {
              'owner': 'id_user_450',
              'posted': '2017-04-11T21:38:03.205Z',
              'role': 'con',
              'text': 'Molestiae earum soluta incidunt incidunt sunt.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1194',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Candido',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/praveen_vijaya/128.jpg',
                'lastName': 'Tromp',
                'id': 'id_user_450'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_201',
              'posted': '2017-04-14T15:14:21.013Z',
              'role': 'pro',
              'text': 'In et doloremque odio accusamus aspernatur qui est cumque.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1176',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lillie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/plbabin/128.jpg',
                'lastName': 'Swift',
                'id': 'id_user_201'
              }
            },
            'con': {
              'owner': 'id_user_257',
              'posted': '2017-04-10T23:47:40.208Z',
              'role': 'con',
              'text': 'Necessitatibus est maiores ut voluptate consequuntur aspernatur.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1179',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Florian',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lu4sh1i/128.jpg',
                'lastName': 'Nicolas',
                'id': 'id_user_257'
              }
            }
          },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_197',
              'posted': '2017-04-10T21:00:03.095Z',
              'role': 'pro',
              'text': 'Doloremque omnis velit natus fugiat autem eos.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1188',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Gerard',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/praveen_vijaya/128.jpg',
                'lastName': 'Wolff',
                'id': 'id_user_197'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_417',
              'posted': '2017-04-18T21:33:58.633Z',
              'role': 'pro',
              'text': 'Laborum non molestiae aut.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_1174',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Carlotta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/maximsorokin/128.jpg',
                'lastName': 'Boyle',
                'id': 'id_user_417'
              }
            },
            'con': {
              'owner': 'id_user_231',
              'posted': '2017-04-05T12:17:49.351Z',
              'role': 'con',
              'text': 'Sed quia dicta voluptatem.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_1178',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Giovanna',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jay_wilburn/128.jpg',
                'lastName': 'Ondricka',
                'id': 'id_user_231'
              }
            }
          },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_497',
              'posted': '2017-04-10T13:25:53.972Z',
              'role': 'con',
              'text': 'Vero non distinctio voluptatibus quis praesentium inventore qui.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1198',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Johathan',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rickyyean/128.jpg',
                'lastName': 'Strosin',
                'id': 'id_user_497'
              }
            }
          },
          'id_district_110': { 'pro': null, 'con': null }
        }
      }
    },
    'id_item_1200': {
      'text': 'Voluptatum ipsum sed vel qui eaque officiis eius ullam. Ab id ipsam et deserunt consequatur in molestiae quas. Sit commodi possimus ea aut. Eum quod quidem corporis. Consequatur voluptatem mollitia quis recusandae minima rerum quaerat dolores.',
      'itemNumber': 13,
      'total': { 'votes': { 'yes': 6, 'no': 5 }, 'comments': { 'pro': 11, 'con': 12, 'neutral': 11 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 0, 'no': 0 },
          'comments': { 'pro': 0, 'con': 2, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 3 } },
        'id_district_104': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 2 } },
        'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
        'id_district_108': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 3, 'con': 2, 'neutral': 2 } },
        'id_district_109': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 2, 'con': 3, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_433',
          'posted': '2017-04-17T21:44:13.503Z',
          'role': 'pro',
          'text': 'Eos modi debitis dolorem et magni ullam dicta vero voluptatibus.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_1222',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Heloise',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nilshoenson/128.jpg',
            'lastName': 'Blanda',
            'id': 'id_user_433'
          }
        },
        'con': {
          'owner': 'id_user_235',
          'posted': '2017-04-18T14:44:31.694Z',
          'role': 'con',
          'text': 'Culpa labore quos sint id facere repellendus.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_1237',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Janelle',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rez___a/128.jpg',
            'lastName': 'Harber',
            'id': 'id_user_235'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': null,
            'con': {
              'owner': 'id_user_499',
              'posted': '2017-04-18T04:34:49.687Z',
              'role': 'con',
              'text': 'Nesciunt ipsum rerum molestias sit.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1225',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Duane',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vj_demien/128.jpg',
                'lastName': 'Durgan',
                'id': 'id_user_499'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_179',
              'posted': '2017-04-18T20:31:21.667Z',
              'role': 'pro',
              'text': 'Rerum facilis incidunt beatae.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1219',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Delmer',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alexivanichkin/128.jpg',
                'lastName': 'Strosin',
                'id': 'id_user_179'
              }
            }, 'con': null
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_234',
              'posted': '2017-04-06T21:44:47.113Z',
              'role': 'pro',
              'text': 'Recusandae error est cupiditate beatae aut magni.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1213',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kara',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jay_wilburn/128.jpg',
                'lastName': 'Gulgowski',
                'id': 'id_user_234'
              }
            },
            'con': {
              'owner': 'id_user_340',
              'posted': '2017-04-17T22:38:25.648Z',
              'role': 'con',
              'text': 'Nesciunt natus quia aut cumque cupiditate et.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1241',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jayson',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/okseanjay/128.jpg',
                'lastName': 'Roob',
                'id': 'id_user_340'
              }
            }
          },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_355',
              'posted': '2017-04-11T06:27:50.390Z',
              'role': 'con',
              'text': 'Fugiat nulla delectus id sed ut autem molestias rerum totam.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1230',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Modesta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/claudioguglieri/128.jpg',
                'lastName': 'Jakubowski',
                'id': 'id_user_355'
              }
            }
          },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_382',
              'posted': '2017-04-15T21:31:55.340Z',
              'role': 'pro',
              'text': 'Minus minus aliquid debitis dolores maiores.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1234',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Amy',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/loganjlambert/128.jpg',
                'lastName': 'Hudson',
                'id': 'id_user_382'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': null,
            'con': {
              'owner': 'id_user_339',
              'posted': '2017-04-05T15:51:14.044Z',
              'role': 'con',
              'text': 'Ut tempore nam id ipsam.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_1221',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Shyann',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/instalox/128.jpg',
                'lastName': 'Hilpert',
                'id': 'id_user_339'
              }
            }
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_433',
              'posted': '2017-04-17T21:44:13.503Z',
              'role': 'pro',
              'text': 'Eos modi debitis dolorem et magni ullam dicta vero voluptatibus.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_1222',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Heloise',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nilshoenson/128.jpg',
                'lastName': 'Blanda',
                'id': 'id_user_433'
              }
            },
            'con': {
              'owner': 'id_user_120',
              'posted': '2017-04-17T19:44:51.838Z',
              'role': 'con',
              'text': 'A non enim quia illum excepturi rem recusandae est.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_1228',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Donato',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/petrangr/128.jpg',
                'lastName': 'Legros',
                'id': 'id_user_120'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_137',
              'posted': '2017-04-09T03:53:04.348Z',
              'role': 'pro',
              'text': 'Autem dolorem illo.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1214',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kamryn',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/snowwrite/128.jpg',
                'lastName': 'Rau',
                'id': 'id_user_137'
              }
            },
            'con': {
              'owner': 'id_user_445',
              'posted': '2017-04-11T04:43:08.484Z',
              'role': 'con',
              'text': 'Necessitatibus sit qui.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1240',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Charles',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ateneupopular/128.jpg',
                'lastName': 'Torp',
                'id': 'id_user_445'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_205',
              'posted': '2017-04-06T20:42:18.504Z',
              'role': 'pro',
              'text': 'Expedita eius aut repudiandae et id harum aperiam.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1220',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kirsten',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/enricocicconi/128.jpg',
                'lastName': 'Zulauf',
                'id': 'id_user_205'
              }
            },
            'con': {
              'owner': 'id_user_310',
              'posted': '2017-04-08T14:26:27.412Z',
              'role': 'con',
              'text': 'Ea perferendis soluta non ducimus mollitia soluta nihil.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1232',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Carmelo',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/hsinyo23/128.jpg',
                'lastName': 'Kunde',
                'id': 'id_user_310'
              }
            }
          }
        }
      }
    },
    'id_item_1245': {
      'text': 'Porro consequatur iusto aut eum nam. Iste minus voluptatem nulla totam dolores qui culpa similique dolores. Blanditiis ut ipsam aut.',
      'itemNumber': 14,
      'total': { 'votes': { 'yes': 4, 'no': 6 }, 'comments': { 'pro': 8, 'con': 6, 'neutral': 4 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 0, 'no': 0 },
          'comments': { 'pro': 1, 'con': 1, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 4 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_160',
          'posted': '2017-04-10T21:37:50.784Z',
          'role': 'pro',
          'text': 'Pariatur eum iste velit cupiditate neque maxime facere quibusdam sequi.',
          'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
          'id': 'id_comment_1273',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' } },
            'firstName': 'Alexa',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nellleo/128.jpg',
            'lastName': 'Becker',
            'id': 'id_user_160'
          }
        },
        'con': {
          'owner': 'id_user_500',
          'posted': '2017-04-08T05:04:53.443Z',
          'role': 'con',
          'text': 'Hic nisi facere quidem natus.',
          'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
          'id': 'id_comment_1256',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' } },
            'firstName': 'Keven',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/michaelcolenso/128.jpg',
            'lastName': 'Yost',
            'id': 'id_user_500'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_183',
              'posted': '2017-04-08T00:28:17.813Z',
              'role': 'pro',
              'text': 'Nihil mollitia vitae iusto.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1257',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Danielle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sachingawas/128.jpg',
                'lastName': 'Quitzon',
                'id': 'id_user_183'
              }
            },
            'con': {
              'owner': 'id_user_324',
              'posted': '2017-04-17T02:50:40.474Z',
              'role': 'con',
              'text': 'Voluptatem odio rerum excepturi voluptatem explicabo nihil nemo voluptatem.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1262',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Tomasa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/juanmamartinez/128.jpg',
                'lastName': 'Cruickshank',
                'id': 'id_user_324'
              }
            }
          },
          'id_district_102': {
            'pro': null,
            'con': {
              'owner': 'id_user_483',
              'posted': '2017-04-07T01:00:10.466Z',
              'role': 'con',
              'text': 'Occaecati repellendus vel ad sequi reiciendis.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1260',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jacinto',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/levisan/128.jpg',
                'lastName': 'Haley',
                'id': 'id_user_483'
              }
            }
          },
          'id_district_103': {
            'pro': null,
            'con': {
              'owner': 'id_user_500',
              'posted': '2017-04-08T05:04:53.443Z',
              'role': 'con',
              'text': 'Hic nisi facere quidem natus.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1256',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Keven',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/michaelcolenso/128.jpg',
                'lastName': 'Yost',
                'id': 'id_user_500'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_503',
              'posted': '2017-04-16T02:57:13.379Z',
              'role': 'pro',
              'text': 'Animi eius sed porro odit.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1271',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Elna',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/codepoet_ru/128.jpg',
                'lastName': 'Franecki',
                'id': 'id_user_503'
              }
            }, 'con': null
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_159',
              'posted': '2017-04-07T18:04:30.993Z',
              'role': 'pro',
              'text': 'Hic deleniti veniam.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1269',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kasandra',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/danvernon/128.jpg',
                'lastName': 'Hackett',
                'id': 'id_user_159'
              }
            }, 'con': null
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_293',
              'posted': '2017-04-08T01:56:08.892Z',
              'role': 'pro',
              'text': 'Vel eligendi id aut dolorum alias incidunt ex.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1264',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Allene',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/low_res/128.jpg',
                'lastName': 'Walsh',
                'id': 'id_user_293'
              }
            },
            'con': {
              'owner': 'id_user_293',
              'posted': '2017-04-08T04:43:10.099Z',
              'role': 'con',
              'text': 'Doloremque voluptatibus sit cupiditate minima et esse.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1265',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Allene',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/low_res/128.jpg',
                'lastName': 'Walsh',
                'id': 'id_user_293'
              }
            }
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_323',
              'posted': '2017-04-10T20:26:33.214Z',
              'role': 'pro',
              'text': 'Molestias culpa ratione.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_1258',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Timothy',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/picard102/128.jpg',
                'lastName': 'Pouros',
                'id': 'id_user_323'
              }
            }, 'con': null
          },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_160',
              'posted': '2017-04-10T21:37:50.784Z',
              'role': 'pro',
              'text': 'Pariatur eum iste velit cupiditate neque maxime facere quibusdam sequi.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1273',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alexa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nellleo/128.jpg',
                'lastName': 'Becker',
                'id': 'id_user_160'
              }
            },
            'con': {
              'owner': 'id_user_480',
              'posted': '2017-04-18T07:43:57.591Z',
              'role': 'con',
              'text': 'Veritatis inventore adipisci adipisci tempore voluptatum deleniti.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1266',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Antonetta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/themrdave/128.jpg',
                'lastName': 'Dare',
                'id': 'id_user_480'
              }
            }
          }
        }
      }
    },
    'id_item_1274': {
      'text': 'Quia nam et et dolore eum tempore est. Et doloribus fugit. In dolor minima dignissimos voluptas quisquam libero et. Vero modi veniam dolores quaerat totam explicabo temporibus. Aut nemo quae non nobis ut molestias. Rem dolore omnis voluptatem temporibus praesentium sed est omnis.',
      'itemNumber': 15,
      'total': { 'votes': { 'yes': 31, 'no': 36 }, 'comments': { 'pro': 15, 'con': 7, 'neutral': 8 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 1, 'no': 3 },
          'comments': { 'pro': 1, 'con': 1, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 3, 'con': 0, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 6, 'no': 4 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 1, 'no': 6 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 4, 'con': 0, 'neutral': 2 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_430',
          'posted': '2017-04-18T12:14:04.614Z',
          'role': 'pro',
          'text': 'Ut quae occaecati molestiae omnis.',
          'id': 'id_comment_1341',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'firstName': 'Virgie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/irae/128.jpg',
            'lastName': 'Hand',
            'id': 'id_user_430'
          }
        },
        'con': {
          'owner': 'id_user_182',
          'posted': '2017-04-08T10:45:39.052Z',
          'role': 'con',
          'text': 'Corporis sed nihil non.',
          'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
          'id': 'id_comment_1355',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' } },
            'firstName': 'Florencio',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sbtransparent/128.jpg',
            'lastName': 'Marquardt',
            'id': 'id_user_182'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_484',
              'posted': '2017-04-12T03:37:18.639Z',
              'role': 'pro',
              'text': 'Nam incidunt soluta qui et facere autem temporibus.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1357',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Rogers',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/algunsanabria/128.jpg',
                'lastName': 'Christiansen',
                'id': 'id_user_484'
              }
            },
            'con': {
              'owner': 'id_user_182',
              'posted': '2017-04-08T10:45:39.052Z',
              'role': 'con',
              'text': 'Corporis sed nihil non.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1355',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Florencio',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sbtransparent/128.jpg',
                'lastName': 'Marquardt',
                'id': 'id_user_182'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_179',
              'posted': '2017-04-14T01:49:08.761Z',
              'role': 'pro',
              'text': 'A voluptate fugit voluptas excepturi hic voluptatem.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1342',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Delmer',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alexivanichkin/128.jpg',
                'lastName': 'Strosin',
                'id': 'id_user_179'
              }
            }, 'con': null
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_250',
              'posted': '2017-04-07T22:44:16.528Z',
              'role': 'con',
              'text': 'Sit dolorem rerum recusandae dolor autem ullam.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1347',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Curtis',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xtopherpaul/128.jpg',
                'lastName': 'Baumbach',
                'id': 'id_user_250'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_431',
              'posted': '2017-04-16T23:16:51.217Z',
              'role': 'pro',
              'text': 'Sapiente odio consequatur iusto dolores itaque excepturi unde.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1367',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Verlie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dev_essentials/128.jpg',
                'lastName': 'Nolan',
                'id': 'id_user_431'
              }
            },
            'con': {
              'owner': 'id_user_275',
              'posted': '2017-04-18T07:32:40.425Z',
              'role': 'con',
              'text': 'Quod repellat eius tempora.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1362',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Bart',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dc_user/128.jpg',
                'lastName': 'Cartwright',
                'id': 'id_user_275'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_307',
              'posted': '2017-04-08T13:13:40.024Z',
              'role': 'pro',
              'text': 'Consequatur dolorem quibusdam autem fugiat eius impedit sequi.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1349',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Genesis',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/amywebbb/128.jpg',
                'lastName': 'Kiehn',
                'id': 'id_user_307'
              }
            }, 'con': null
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_120',
              'posted': '2017-04-13T00:14:02.293Z',
              'role': 'con',
              'text': 'Amet sunt dolorem molestiae eum autem.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_1359',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Donato',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/petrangr/128.jpg',
                'lastName': 'Legros',
                'id': 'id_user_120'
              }
            }
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_422',
              'posted': '2017-04-14T03:06:03.745Z',
              'role': 'con',
              'text': 'Nemo ut qui reprehenderit in dolore mollitia dolores.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1348',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Darion',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alexandermayes/128.jpg',
                'lastName': 'Anderson',
                'id': 'id_user_422'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_269',
              'posted': '2017-04-10T06:39:50.682Z',
              'role': 'pro',
              'text': 'Unde labore animi magnam molestias soluta libero.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1352',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mathilde',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dgajjar/128.jpg',
                'lastName': 'McKenzie',
                'id': 'id_user_269'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_1370': {
      'text': 'Esse ex consectetur quae ipsa. Saepe delectus fugiat culpa. Tempora et harum distinctio sapiente voluptatem earum natus qui.',
      'itemNumber': 16,
      'total': { 'votes': { 'yes': 23, 'no': 26 }, 'comments': { 'pro': 5, 'con': 4, 'neutral': 9 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 2, 'no': 7 },
          'comments': { 'pro': 1, 'con': 1, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 3 } },
        'id_district_105': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
        'id_district_107': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_194',
          'posted': '2017-04-15T14:57:41.530Z',
          'role': 'pro',
          'text': 'Facilis ut ut corporis sunt dolores nam.',
          'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
          'id': 'id_comment_1434',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' } },
            'firstName': 'Weldon',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/simobenso/128.jpg',
            'lastName': 'Kuvalis',
            'id': 'id_user_194'
          }
        },
        'con': {
          'owner': 'id_user_354',
          'posted': '2017-04-18T02:45:11.445Z',
          'role': 'con',
          'text': 'Quia ut ipsum aliquid sit impedit nesciunt consequatur amet.',
          'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
          'id': 'id_comment_1432',
          'votes': { 'up': 2, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' } },
            'firstName': 'Abigail',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/muringa/128.jpg',
            'lastName': 'Wolff',
            'id': 'id_user_354'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_194',
              'posted': '2017-04-15T14:57:41.530Z',
              'role': 'pro',
              'text': 'Facilis ut ut corporis sunt dolores nam.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1434',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Weldon',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/simobenso/128.jpg',
                'lastName': 'Kuvalis',
                'id': 'id_user_194'
              }
            },
            'con': {
              'owner': 'id_user_362',
              'posted': '2017-04-15T06:09:07.187Z',
              'role': 'con',
              'text': 'Sit rerum magni autem id.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1426',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jody',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joelcipriano/128.jpg',
                'lastName': 'Terry',
                'id': 'id_user_362'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_243',
              'posted': '2017-04-14T12:25:57.112Z',
              'role': 'pro',
              'text': 'Est eum ea nulla laboriosam.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1420',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kristoffer',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/missaaamy/128.jpg',
                'lastName': 'Hirthe',
                'id': 'id_user_243'
              }
            }, 'con': null
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_416',
              'posted': '2017-04-18T21:50:28.411Z',
              'role': 'pro',
              'text': 'Dolore itaque qui porro eius est.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1424',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Elbert',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cicerobr/128.jpg',
                'lastName': 'Dickens',
                'id': 'id_user_416'
              }
            }, 'con': null
          },
          'id_district_104': { 'pro': null, 'con': null },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': { 'pro': null, 'con': null },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_422',
              'posted': '2017-04-15T21:40:31.099Z',
              'role': 'pro',
              'text': 'Delectus quia maxime adipisci dolore quidem eaque maxime explicabo.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1429',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Darion',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alexandermayes/128.jpg',
                'lastName': 'Anderson',
                'id': 'id_user_422'
              }
            },
            'con': {
              'owner': 'id_user_354',
              'posted': '2017-04-18T02:45:11.445Z',
              'role': 'con',
              'text': 'Quia ut ipsum aliquid sit impedit nesciunt consequatur amet.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1432',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Abigail',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/muringa/128.jpg',
                'lastName': 'Wolff',
                'id': 'id_user_354'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_481',
              'posted': '2017-04-05T19:31:59.416Z',
              'role': 'pro',
              'text': 'Alias aliquam consequuntur velit nostrum exercitationem rerum temporibus.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1423',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Peggie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artem_kostenko/128.jpg',
                'lastName': 'Bashirian',
                'id': 'id_user_481'
              }
            },
            'con': {
              'owner': 'id_user_372',
              'posted': '2017-04-11T01:47:02.026Z',
              'role': 'con',
              'text': 'Eos eveniet quis officiis.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1433',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Gaston',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/curiousonaut/128.jpg',
                'lastName': 'Schamberger',
                'id': 'id_user_372'
              }
            }
          }
        }
      }
    },
    'id_item_1438': {
      'text': 'Nihil saepe mollitia eum voluptas quo minima molestiae harum. Quia voluptatibus vero atque iusto nesciunt eligendi eum cupiditate. Totam qui expedita ex adipisci aut explicabo quia. Nostrum dicta deleniti eius aliquid fugit nostrum. Eius necessitatibus aut rem ea. Eveniet ut rerum.',
      'itemNumber': 17,
      'total': { 'votes': { 'yes': 39, 'no': 21 }, 'comments': { 'pro': 16, 'con': 19, 'neutral': 14 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 4, 'no': 1 },
          'comments': { 'pro': 2, 'con': 1, 'neutral': 2 }
        },
        'id_district_102': { 'votes': { 'yes': 6, 'no': 3 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 3 } },
        'id_district_103': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 3, 'con': 2, 'neutral': 1 } },
        'id_district_105': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 5, 'con': 5, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 3 } },
        'id_district_109': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
        'id_district_110': { 'votes': { 'yes': 5, 'no': 5 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_165',
          'posted': '2017-04-18T14:24:31.041Z',
          'role': 'pro',
          'text': 'Cum omnis quo sunt sint ducimus et non at voluptates.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_1522',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Odie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/angelcolberg/128.jpg',
            'lastName': 'Muller',
            'id': 'id_user_165'
          }
        },
        'con': {
          'owner': 'id_user_345',
          'posted': '2017-04-12T13:06:45.817Z',
          'role': 'con',
          'text': 'Illo beatae voluptatem.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_1505',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Adelbert',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gusoto/128.jpg',
            'lastName': 'Jerde',
            'id': 'id_user_345'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_173',
              'posted': '2017-04-17T20:42:19.969Z',
              'role': 'pro',
              'text': 'Eum qui ut.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1508',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mable',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lepinski/128.jpg',
                'lastName': 'Feest',
                'id': 'id_user_173'
              }
            },
            'con': {
              'owner': 'id_user_309',
              'posted': '2017-04-15T14:21:01.530Z',
              'role': 'con',
              'text': 'Odio accusantium qui omnis quidem tempore dolor voluptate nesciunt.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1520',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Payton',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cofla/128.jpg',
                'lastName': 'Willms',
                'id': 'id_user_309'
              }
            }
          },
          'id_district_102': {
            'pro': null,
            'con': {
              'owner': 'id_user_226',
              'posted': '2017-04-17T19:13:53.116Z',
              'role': 'con',
              'text': 'Laborum blanditiis ut tenetur eum dolor.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1543',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Chad',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/okansurreel/128.jpg',
                'lastName': 'Predovic',
                'id': 'id_user_226'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_225',
              'posted': '2017-04-10T07:44:34.784Z',
              'role': 'pro',
              'text': 'Qui ipsam qui est.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1523',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Nakia',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wake_gs/128.jpg',
                'lastName': 'Rippin',
                'id': 'id_user_225'
              }
            },
            'con': {
              'owner': 'id_user_432',
              'posted': '2017-04-09T22:23:59.385Z',
              'role': 'con',
              'text': 'Voluptates amet odit consectetur dignissimos sint amet consequuntur.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1547',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ryann',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/johnsmithagency/128.jpg',
                'lastName': 'Kuhlman',
                'id': 'id_user_432'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_181',
              'posted': '2017-04-09T04:29:58.032Z',
              'role': 'pro',
              'text': 'Quia iusto est eaque dicta magnam debitis error dolore vero.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1503',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Hortense',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/hjartstrorn/128.jpg',
                'lastName': 'Walker',
                'id': 'id_user_181'
              }
            },
            'con': {
              'owner': 'id_user_135',
              'posted': '2017-04-17T12:59:55.407Z',
              'role': 'con',
              'text': 'Temporibus sunt ratione fugiat eos.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1513',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kali',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/digitalmaverick/128.jpg',
                'lastName': 'Bosco',
                'id': 'id_user_135'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_304',
              'posted': '2017-04-05T06:41:03.802Z',
              'role': 'pro',
              'text': 'Nobis molestiae maiores deleniti culpa dolorum.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1516',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Delpha',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cboller1/128.jpg',
                'lastName': 'Kassulke',
                'id': 'id_user_304'
              }
            },
            'con': {
              'owner': 'id_user_145',
              'posted': '2017-04-18T12:25:36.687Z',
              'role': 'con',
              'text': 'Consequatur quo libero distinctio culpa deserunt maxime animi et et.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1506',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kailee',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alevizio/128.jpg',
                'lastName': 'Lang',
                'id': 'id_user_145'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_293',
              'posted': '2017-04-07T21:31:23.530Z',
              'role': 'pro',
              'text': 'Blanditiis minima itaque aliquid dignissimos.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1504',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Allene',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/low_res/128.jpg',
                'lastName': 'Walsh',
                'id': 'id_user_293'
              }
            },
            'con': {
              'owner': 'id_user_471',
              'posted': '2017-04-16T17:02:57.279Z',
              'role': 'con',
              'text': 'Consequuntur in reiciendis vitae quis omnis.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1538',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Sabryna',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gipsy_raf/128.jpg',
                'lastName': 'Howell',
                'id': 'id_user_471'
              }
            }
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_219',
              'posted': '2017-04-17T04:21:44.127Z',
              'role': 'pro',
              'text': 'Facilis fugit eos praesentium sunt nobis doloribus iusto nihil.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_1535',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Katarina',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joeymurdah/128.jpg',
                'lastName': 'Auer',
                'id': 'id_user_219'
              }
            },
            'con': {
              'owner': 'id_user_345',
              'posted': '2017-04-12T13:06:45.817Z',
              'role': 'con',
              'text': 'Illo beatae voluptatem.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_1505',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Adelbert',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gusoto/128.jpg',
                'lastName': 'Jerde',
                'id': 'id_user_345'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_497',
              'posted': '2017-04-14T09:17:18.272Z',
              'role': 'pro',
              'text': 'Enim deserunt et et dolorem minima et maxime.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1540',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Johathan',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rickyyean/128.jpg',
                'lastName': 'Strosin',
                'id': 'id_user_497'
              }
            }, 'con': null
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_439',
              'posted': '2017-04-07T21:44:22.220Z',
              'role': 'pro',
              'text': 'Ullam at vel debitis molestias quod.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1499',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Anahi',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/johncafazza/128.jpg',
                'lastName': 'Zboncak',
                'id': 'id_user_439'
              }
            },
            'con': {
              'owner': 'id_user_205',
              'posted': '2017-04-14T04:34:47.603Z',
              'role': 'con',
              'text': 'Velit quis numquam voluptas aliquam voluptatem possimus non totam.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1519',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kirsten',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/enricocicconi/128.jpg',
                'lastName': 'Zulauf',
                'id': 'id_user_205'
              }
            }
          }
        }
      }
    },
    'id_item_1548': {
      'text': 'Facere corrupti optio dolores delectus eos distinctio molestias. Odit possimus libero voluptas. Esse debitis nobis magnam quas dicta aperiam quia aut. Ipsa animi et quaerat quaerat doloremque quos.',
      'itemNumber': 18,
      'total': { 'votes': { 'yes': 9, 'no': 5 }, 'comments': { 'pro': 7, 'con': 16, 'neutral': 8 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 1, 'no': 0 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 2 } },
        'id_district_104': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 3, 'con': 3, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 2 } },
        'id_district_109': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_475',
          'posted': '2017-04-18T12:22:04.521Z',
          'role': 'pro',
          'text': 'Impedit suscipit modi aperiam aut qui facilis voluptates natus.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_1589',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Dana',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tonymillion/128.jpg',
            'lastName': 'Bechtelar',
            'id': 'id_user_475'
          }
        },
        'con': {
          'owner': 'id_user_293',
          'posted': '2017-04-15T07:09:13.226Z',
          'role': 'con',
          'text': 'Ab esse est fugiat harum et minus omnis qui.',
          'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
          'id': 'id_comment_1585',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' } },
            'firstName': 'Allene',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/low_res/128.jpg',
            'lastName': 'Walsh',
            'id': 'id_user_293'
          }
        },
        'byDistrict': {
          'id_district_101': { 'pro': null, 'con': null },
          'id_district_102': {
            'pro': null,
            'con': {
              'owner': 'id_user_155',
              'posted': '2017-04-17T19:36:48.789Z',
              'role': 'con',
              'text': 'Voluptates a iusto dolorum neque necessitatibus laudantium soluta.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1578',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ila',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rikas/128.jpg',
                'lastName': 'Fadel',
                'id': 'id_user_155'
              }
            }
          },
          'id_district_103': {
            'pro': null,
            'con': {
              'owner': 'id_user_325',
              'posted': '2017-04-18T03:21:13.474Z',
              'role': 'con',
              'text': 'Qui dicta nisi ut ut.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1576',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Zion',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/patrickcoombe/128.jpg',
                'lastName': 'Hoppe',
                'id': 'id_user_325'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_475',
              'posted': '2017-04-18T12:22:04.521Z',
              'role': 'pro',
              'text': 'Impedit suscipit modi aperiam aut qui facilis voluptates natus.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1589',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Dana',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tonymillion/128.jpg',
                'lastName': 'Bechtelar',
                'id': 'id_user_475'
              }
            },
            'con': {
              'owner': 'id_user_475',
              'posted': '2017-04-12T06:11:48.448Z',
              'role': 'con',
              'text': 'Non inventore aut quis rerum voluptatem.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1580',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Dana',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tonymillion/128.jpg',
                'lastName': 'Bechtelar',
                'id': 'id_user_475'
              }
            }
          },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_302',
              'posted': '2017-04-12T05:16:27.991Z',
              'role': 'con',
              'text': 'Ab aperiam neque molestiae distinctio quia itaque adipisci consequatur minima.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1569',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Camylle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/motionthinks/128.jpg',
                'lastName': 'Franecki',
                'id': 'id_user_302'
              }
            }
          },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_293',
              'posted': '2017-04-15T07:09:13.226Z',
              'role': 'con',
              'text': 'Ab esse est fugiat harum et minus omnis qui.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1585',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Allene',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/low_res/128.jpg',
                'lastName': 'Walsh',
                'id': 'id_user_293'
              }
            }
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_426',
              'posted': '2017-04-13T09:44:45.477Z',
              'role': 'pro',
              'text': 'Rerum sapiente voluptas.',
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
                'firstName': 'Yadira',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/danthms/128.jpg',
                'lastName': 'Crona',
                'id': 'id_user_426'
              }
            },
            'con': {
              'owner': 'id_user_343',
              'posted': '2017-04-18T09:09:51.835Z',
              'role': 'con',
              'text': 'Et nihil dolores maxime voluptas qui labore.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_1567',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Tyler',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mhaligowski/128.jpg',
                'lastName': 'Toy',
                'id': 'id_user_343'
              }
            }
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_371',
              'posted': '2017-04-10T18:45:00.068Z',
              'role': 'con',
              'text': 'Ipsa est nesciunt et ducimus.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1584',
              'votes': { 'up': 0, 'down': 2 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ezequiel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ssiskind/128.jpg',
                'lastName': 'Aufderhar',
                'id': 'id_user_371'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_190',
              'posted': '2017-04-18T05:59:05.458Z',
              'role': 'pro',
              'text': 'Laborum iste nihil sequi iusto incidunt qui repellat voluptas tempore.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1579',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Leopold',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/chacky14/128.jpg',
                'lastName': 'McGlynn',
                'id': 'id_user_190'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_1594': {
      'text': 'Voluptatem placeat nihil rem voluptas dolorem velit debitis quam. Laudantium eos totam qui quia. Omnis ut quisquam. Totam numquam veritatis accusantium harum dicta. Quaerat sed ipsum fugit quibusdam at ea ut et. Ea sunt quibusdam ipsam vitae ea molestiae doloremque aperiam debitis.',
      'itemNumber': 19,
      'total': { 'votes': { 'yes': 7, 'no': 7 }, 'comments': { 'pro': 7, 'con': 5, 'neutral': 2 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 0, 'no': 0 },
          'comments': { 'pro': 1, 'con': 3, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 0, 'no': 4 }, 'comments': { 'pro': 3, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_119',
          'posted': '2017-04-14T07:28:07.649Z',
          'role': 'pro',
          'text': 'Totam et assumenda.',
          'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
          'id': 'id_comment_1609',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' } },
            'firstName': 'Angel',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ateneupopular/128.jpg',
            'lastName': 'Gerlach',
            'id': 'id_user_119'
          }
        },
        'con': {
          'owner': 'id_user_163',
          'posted': '2017-04-17T15:11:01.926Z',
          'role': 'con',
          'text': 'Quos aliquam debitis.',
          'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
          'id': 'id_comment_1620',
          'votes': { 'up': 1, 'down': 1 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' } },
            'firstName': 'Justina',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/thibaut_re/128.jpg',
            'lastName': 'O\'Hara',
            'id': 'id_user_163'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_227',
              'posted': '2017-04-14T03:40:33.535Z',
              'role': 'pro',
              'text': 'Assumenda id veritatis praesentium rerum eaque voluptas.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1611',
              'votes': { 'up': 0, 'down': 2 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Aimee',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cdavis565/128.jpg',
                'lastName': 'Hintz',
                'id': 'id_user_227'
              }
            },
            'con': {
              'owner': 'id_user_163',
              'posted': '2017-04-17T15:11:01.926Z',
              'role': 'con',
              'text': 'Quos aliquam debitis.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1620',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Justina',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/thibaut_re/128.jpg',
                'lastName': 'O\'Hara',
                'id': 'id_user_163'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_451',
              'posted': '2017-04-05T00:21:22.366Z',
              'role': 'pro',
              'text': 'Exercitationem sed dolor iusto quidem sit illum harum explicabo iusto.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1622',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Beryl',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/BryanHorsey/128.jpg',
                'lastName': 'Conn',
                'id': 'id_user_451'
              }
            }, 'con': null
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': { 'pro': null, 'con': null },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_145',
              'posted': '2017-04-09T20:53:48.679Z',
              'role': 'con',
              'text': 'Aperiam at quae.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1613',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kailee',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alevizio/128.jpg',
                'lastName': 'Lang',
                'id': 'id_user_145'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_222',
              'posted': '2017-04-09T21:34:19.385Z',
              'role': 'pro',
              'text': 'Velit et tempora doloremque iste itaque sit quod doloribus.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1621',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Letitia',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/stevedesigner/128.jpg',
                'lastName': 'Ebert',
                'id': 'id_user_222'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': null,
            'con': {
              'owner': 'id_user_339',
              'posted': '2017-04-10T17:59:21.536Z',
              'role': 'con',
              'text': 'Aut ea occaecati eos quos et.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_1618',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Shyann',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/instalox/128.jpg',
                'lastName': 'Hilpert',
                'id': 'id_user_339'
              }
            }
          },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_119',
              'posted': '2017-04-14T07:28:07.649Z',
              'role': 'pro',
              'text': 'Totam et assumenda.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1609',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Angel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ateneupopular/128.jpg',
                'lastName': 'Gerlach',
                'id': 'id_user_119'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_1623': {
      'text': 'Voluptatibus ea ex rem enim ad quia culpa. Maxime ut ut et vitae rerum sed sapiente ut. Eaque sequi in velit rerum nesciunt aliquid culpa sint. Dolores qui tempore quibusdam temporibus aut dolores eos incidunt quam. Consequatur sed totam mollitia libero et voluptatem ea.',
      'itemNumber': 20,
      'total': { 'votes': { 'yes': 22, 'no': 16 }, 'comments': { 'pro': 10, 'con': 10, 'neutral': 11 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 0, 'no': 1 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 2 }
        },
        'id_district_102': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 2 } },
        'id_district_103': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 5, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
        'id_district_105': { 'votes': { 'yes': 7, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_108': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 4, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 3 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_313',
          'posted': '2017-04-08T14:48:31.715Z',
          'role': 'pro',
          'text': 'Aut qui alias assumenda neque.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_1670',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Shyanne',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/klimmka/128.jpg',
            'lastName': 'Kohler',
            'id': 'id_user_313'
          }
        },
        'con': {
          'owner': 'id_user_370',
          'posted': '2017-04-13T06:58:27.464Z',
          'role': 'con',
          'text': 'Architecto et corrupti totam non est.',
          'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
          'id': 'id_comment_1669',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' } },
            'firstName': 'Cierra',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buleswapnil/128.jpg',
            'lastName': 'Dickens',
            'id': 'id_user_370'
          }
        },
        'byDistrict': {
          'id_district_101': { 'pro': null, 'con': null },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_180',
              'posted': '2017-04-09T11:39:48.996Z',
              'role': 'pro',
              'text': 'Assumenda deserunt atque perspiciatis debitis dolor quas non optio dolorum.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1677',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Odell',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nessoila/128.jpg',
                'lastName': 'Durgan',
                'id': 'id_user_180'
              }
            },
            'con': {
              'owner': 'id_user_179',
              'posted': '2017-04-17T04:16:21.451Z',
              'role': 'con',
              'text': 'Nobis aut id perspiciatis eum sed dolorum officiis.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1691',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Delmer',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alexivanichkin/128.jpg',
                'lastName': 'Strosin',
                'id': 'id_user_179'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_432',
              'posted': '2017-04-08T18:05:22.759Z',
              'role': 'pro',
              'text': 'Distinctio tempore numquam reprehenderit est.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1666',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ryann',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/johnsmithagency/128.jpg',
                'lastName': 'Kuhlman',
                'id': 'id_user_432'
              }
            },
            'con': {
              'owner': 'id_user_398',
              'posted': '2017-04-15T19:53:50.706Z',
              'role': 'con',
              'text': 'Reiciendis sed inventore voluptatem hic voluptate.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1673',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Margaretta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nomidesigns/128.jpg',
                'lastName': 'Nicolas',
                'id': 'id_user_398'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_355',
              'posted': '2017-04-10T20:32:46.986Z',
              'role': 'pro',
              'text': 'Rerum cupiditate ratione quas aut pariatur impedit.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1679',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Modesta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/claudioguglieri/128.jpg',
                'lastName': 'Jakubowski',
                'id': 'id_user_355'
              }
            },
            'con': {
              'owner': 'id_user_151',
              'posted': '2017-04-05T16:55:16.282Z',
              'role': 'con',
              'text': 'Ad sint qui nostrum itaque pariatur eaque.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1671',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Layne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/doronmalki/128.jpg',
                'lastName': 'Abernathy',
                'id': 'id_user_151'
              }
            }
          },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_393',
              'posted': '2017-04-08T17:53:35.448Z',
              'role': 'pro',
              'text': 'Mollitia beatae dolorum amet sed perspiciatis sint facilis eos officiis.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1692',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josiane',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinclediere/128.jpg',
                'lastName': 'Gleason',
                'id': 'id_user_393'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': null,
            'con': {
              'owner': 'id_user_455',
              'posted': '2017-04-13T20:56:12.356Z',
              'role': 'con',
              'text': 'Sapiente aut perspiciatis temporibus ipsam eaque in.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_1675',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cyrus',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artvavs/128.jpg',
                'lastName': 'Skiles',
                'id': 'id_user_455'
              }
            }
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_313',
              'posted': '2017-04-08T14:48:31.715Z',
              'role': 'pro',
              'text': 'Aut qui alias assumenda neque.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_1670',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Shyanne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/klimmka/128.jpg',
                'lastName': 'Kohler',
                'id': 'id_user_313'
              }
            }, 'con': null
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_370',
              'posted': '2017-04-13T06:58:27.464Z',
              'role': 'con',
              'text': 'Architecto et corrupti totam non est.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1669',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cierra',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buleswapnil/128.jpg',
                'lastName': 'Dickens',
                'id': 'id_user_370'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_184',
              'posted': '2017-04-13T10:06:16.951Z',
              'role': 'pro',
              'text': 'Consectetur est enim et odit ut nam reprehenderit non in.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1683',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mertie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/angelcolberg/128.jpg',
                'lastName': 'Mann',
                'id': 'id_user_184'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_1693': {
      'text': 'Non vel corrupti blanditiis recusandae ducimus necessitatibus occaecati animi est. Velit quam cupiditate provident cumque aut id. Molestiae sit qui beatae.',
      'itemNumber': 21,
      'total': { 'votes': { 'yes': 19, 'no': 20 }, 'comments': { 'pro': 2, 'con': 3, 'neutral': 1 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 3, 'no': 1 },
          'comments': { 'pro': 0, 'con': 1, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 1, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_290',
          'posted': '2017-04-10T20:13:59.075Z',
          'role': 'pro',
          'text': 'Nemo rerum sed quia quod ea et qui.',
          'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
          'id': 'id_comment_1733',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' } },
            'firstName': 'Mellie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wim1k/128.jpg',
            'lastName': 'Kub',
            'id': 'id_user_290'
          }
        },
        'con': {
          'owner': 'id_user_411',
          'posted': '2017-04-14T08:48:04.876Z',
          'role': 'con',
          'text': 'Cum unde deleniti omnis similique ut saepe.',
          'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
          'id': 'id_comment_1734',
          'votes': { 'up': 1, 'down': 1 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' } },
            'firstName': 'Ryann',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/markretzloff/128.jpg',
            'lastName': 'Johnston',
            'id': 'id_user_411'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': null,
            'con': {
              'owner': 'id_user_411',
              'posted': '2017-04-14T08:48:04.876Z',
              'role': 'con',
              'text': 'Cum unde deleniti omnis similique ut saepe.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1734',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ryann',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/markretzloff/128.jpg',
                'lastName': 'Johnston',
                'id': 'id_user_411'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_290',
              'posted': '2017-04-10T20:13:59.075Z',
              'role': 'pro',
              'text': 'Nemo rerum sed quia quod ea et qui.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1733',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mellie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wim1k/128.jpg',
                'lastName': 'Kub',
                'id': 'id_user_290'
              }
            },
            'con': {
              'owner': 'id_user_318',
              'posted': '2017-04-13T02:05:09.738Z',
              'role': 'con',
              'text': 'Et ut eum ut et sint quia.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1736',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Clotilde',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buleswapnil/128.jpg',
                'lastName': 'Kub',
                'id': 'id_user_318'
              }
            }
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': { 'pro': null, 'con': null },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': { 'pro': null, 'con': null },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_402',
              'posted': '2017-04-16T12:55:56.455Z',
              'role': 'pro',
              'text': 'Dolores recusandae asperiores exercitationem non minus laborum nesciunt iusto explicabo.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1738',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Hilario',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/daykiine/128.jpg',
                'lastName': 'Paucek',
                'id': 'id_user_402'
              }
            },
            'con': {
              'owner': 'id_user_489',
              'posted': '2017-04-06T01:17:00.959Z',
              'role': 'con',
              'text': 'Nesciunt vel aut quod magnam quidem quia aut.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1737',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Gerardo',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/danillos/128.jpg',
                'lastName': 'Hamill',
                'id': 'id_user_489'
              }
            }
          }
        }
      }
    },
    'id_item_1739': {
      'text': 'Laboriosam nemo vero soluta. Voluptate adipisci et non porro eaque. Sed omnis tempora. Provident autem deleniti quia voluptas cumque nisi saepe aliquid. Beatae atque perspiciatis eum rerum.',
      'itemNumber': 22,
      'total': { 'votes': { 'yes': 14, 'no': 18 }, 'comments': { 'pro': 17, 'con': 8, 'neutral': 13 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 1, 'no': 3 },
          'comments': { 'pro': 2, 'con': 1, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 2 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
        'id_district_105': { 'votes': { 'yes': 0, 'no': 3 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 5 } },
        'id_district_110': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 4, 'con': 1, 'neutral': 2 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_366',
          'posted': '2017-04-07T13:08:50.188Z',
          'role': 'pro',
          'text': 'Adipisci quam saepe esse.',
          'id': 'id_comment_1775',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'firstName': 'Keshaun',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bungiwan/128.jpg',
            'lastName': 'Pfannerstill',
            'id': 'id_user_366'
          }
        },
        'con': {
          'owner': 'id_user_130',
          'posted': '2017-04-11T23:14:16.787Z',
          'role': 'con',
          'text': 'Eum laudantium deleniti autem rerum voluptate quas odit.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_1778',
          'votes': { 'up': 2, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Kelley',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/Silveredge9/128.jpg',
            'lastName': 'Langworth',
            'id': 'id_user_130'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_198',
              'posted': '2017-04-09T04:03:19.667Z',
              'role': 'pro',
              'text': 'Quam voluptatibus delectus amet consectetur.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1773',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Trey',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cggaurav/128.jpg',
                'lastName': 'Jaskolski',
                'id': 'id_user_198'
              }
            },
            'con': {
              'owner': 'id_user_175',
              'posted': '2017-04-17T02:47:27.051Z',
              'role': 'con',
              'text': 'Aspernatur assumenda asperiores.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1796',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Veda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rahmeen/128.jpg',
                'lastName': 'Treutel',
                'id': 'id_user_175'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_346',
              'posted': '2017-04-16T22:32:03.714Z',
              'role': 'pro',
              'text': 'Qui sint eveniet.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1785',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Royce',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/strikewan/128.jpg',
                'lastName': 'Lang',
                'id': 'id_user_346'
              }
            }, 'con': null
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_333',
              'posted': '2017-04-17T15:57:02.426Z',
              'role': 'pro',
              'text': 'Vero esse quia quia iusto consequuntur nobis.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1792',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Eudora',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kuldarkalvik/128.jpg',
                'lastName': 'Dooley',
                'id': 'id_user_333'
              }
            },
            'con': {
              'owner': 'id_user_232',
              'posted': '2017-04-10T00:52:11.707Z',
              'role': 'con',
              'text': 'Velit animi reiciendis dolor mollitia nam itaque.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1791',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Marilyne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/olaolusoga/128.jpg',
                'lastName': 'Ryan',
                'id': 'id_user_232'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_250',
              'posted': '2017-04-12T13:20:28.198Z',
              'role': 'pro',
              'text': 'Possimus ipsam dolorum amet.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1779',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Curtis',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xtopherpaul/128.jpg',
                'lastName': 'Baumbach',
                'id': 'id_user_250'
              }
            },
            'con': {
              'owner': 'id_user_250',
              'posted': '2017-04-08T11:43:55.707Z',
              'role': 'con',
              'text': 'Sunt distinctio et voluptatem quia aut quia qui laborum.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1776',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Curtis',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xtopherpaul/128.jpg',
                'lastName': 'Baumbach',
                'id': 'id_user_250'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_311',
              'posted': '2017-04-05T16:06:06.240Z',
              'role': 'pro',
              'text': 'Quisquam nulla amet nulla qui omnis et inventore alias.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1797',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Albert',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nerrsoft/128.jpg',
                'lastName': 'Frami',
                'id': 'id_user_311'
              }
            },
            'con': {
              'owner': 'id_user_130',
              'posted': '2017-04-11T23:14:16.787Z',
              'role': 'con',
              'text': 'Eum laudantium deleniti autem rerum voluptate quas odit.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1778',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kelley',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/Silveredge9/128.jpg',
                'lastName': 'Langworth',
                'id': 'id_user_130'
              }
            }
          },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_486',
              'posted': '2017-04-07T21:33:27.058Z',
              'role': 'con',
              'text': 'In esse molestiae recusandae sint suscipit corrupti necessitatibus.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1783',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Darron',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jayphen/128.jpg',
                'lastName': 'Pouros',
                'id': 'id_user_486'
              }
            }
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_218',
              'posted': '2017-04-07T06:43:10.570Z',
              'role': 'pro',
              'text': 'Et ex aperiam sunt sapiente eveniet maiores iure velit non.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1803',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artd_sign/128.jpg',
                'lastName': 'Rippin',
                'id': 'id_user_218'
              }
            }, 'con': null
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_248',
              'posted': '2017-04-16T05:18:03.918Z',
              'role': 'pro',
              'text': 'Iure tenetur ducimus veniam aut facilis amet possimus accusantium.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1777',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Riley',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/derekcramer/128.jpg',
                'lastName': 'Dickinson',
                'id': 'id_user_248'
              }
            },
            'con': {
              'owner': 'id_user_336',
              'posted': '2017-04-09T08:32:34.673Z',
              'role': 'con',
              'text': 'Inventore velit eaque nesciunt perferendis dicta beatae.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1793',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Madelyn',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ankitind/128.jpg',
                'lastName': 'Schuster',
                'id': 'id_user_336'
              }
            }
          }
        }
      }
    },
    'id_item_1810': {
      'text': 'Tempore aliquam quas nam accusamus a. Rerum dolore saepe explicabo accusantium quae. Voluptas rerum omnis.',
      'itemNumber': 23,
      'total': { 'votes': { 'yes': 19, 'no': 14 }, 'comments': { 'pro': 19, 'con': 12, 'neutral': 16 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 4, 'no': 0 },
          'comments': { 'pro': 3, 'con': 2, 'neutral': 2 }
        },
        'id_district_102': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 4, 'con': 2, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
        'id_district_105': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 3 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_108': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 0, 'no': 4 }, 'comments': { 'pro': 4, 'con': 3, 'neutral': 2 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_182',
          'posted': '2017-04-14T19:48:07.669Z',
          'role': 'pro',
          'text': 'Laboriosam eos aut aut totam molestias consequatur pariatur iure saepe.',
          'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
          'id': 'id_comment_1844',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' } },
            'firstName': 'Florencio',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sbtransparent/128.jpg',
            'lastName': 'Marquardt',
            'id': 'id_user_182'
          }
        },
        'con': {
          'owner': 'id_user_316',
          'posted': '2017-04-08T19:32:48.253Z',
          'role': 'con',
          'text': 'Quia suscipit atque.',
          'id': 'id_comment_1884',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'firstName': 'Lexus',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/yayteejay/128.jpg',
            'lastName': 'Feeney',
            'id': 'id_user_316'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_182',
              'posted': '2017-04-14T19:48:07.669Z',
              'role': 'pro',
              'text': 'Laboriosam eos aut aut totam molestias consequatur pariatur iure saepe.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1844',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Florencio',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sbtransparent/128.jpg',
                'lastName': 'Marquardt',
                'id': 'id_user_182'
              }
            },
            'con': {
              'owner': 'id_user_435',
              'posted': '2017-04-08T15:26:13.395Z',
              'role': 'con',
              'text': 'Molestiae natus ut nihil.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1846',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Emmanuel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nelsonjoyce/128.jpg',
                'lastName': 'Purdy',
                'id': 'id_user_435'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_477',
              'posted': '2017-04-05T00:56:42.197Z',
              'role': 'pro',
              'text': 'Perspiciatis beatae velit.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1861',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Helena',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lvovenok/128.jpg',
                'lastName': 'Tromp',
                'id': 'id_user_477'
              }
            },
            'con': {
              'owner': 'id_user_303',
              'posted': '2017-04-15T23:17:26.446Z',
              'role': 'con',
              'text': 'Soluta illum doloribus corporis dolor.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1870',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kraig',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artd_sign/128.jpg',
                'lastName': 'Rutherford',
                'id': 'id_user_303'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_136',
              'posted': '2017-04-14T23:23:22.684Z',
              'role': 'pro',
              'text': 'Nulla laborum et animi quis perferendis dolores delectus.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1885',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Glenda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/abdots/128.jpg',
                'lastName': 'Parisian',
                'id': 'id_user_136'
              }
            },
            'con': {
              'owner': 'id_user_437',
              'posted': '2017-04-12T06:10:16.952Z',
              'role': 'con',
              'text': 'Voluptates est quam cumque.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1843',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Simone',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/safrankov/128.jpg',
                'lastName': 'Hyatt',
                'id': 'id_user_437'
              }
            }
          },
          'id_district_104': { 'pro': null, 'con': null },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_134',
              'posted': '2017-04-09T03:45:39.656Z',
              'role': 'pro',
              'text': 'Sit harum deleniti ut voluptatum cumque et.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1866',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Rigoberto',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iqonicd/128.jpg',
                'lastName': 'Breitenberg',
                'id': 'id_user_134'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_347',
              'posted': '2017-04-15T07:41:27.890Z',
              'role': 'pro',
              'text': 'Voluptatem eius inventore omnis dolorum at.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_1867',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Misty',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/a_brixen/128.jpg',
                'lastName': 'Cremin',
                'id': 'id_user_347'
              }
            }, 'con': null
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_343',
              'posted': '2017-04-06T05:40:31.968Z',
              'role': 'pro',
              'text': 'Ea ea voluptates.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_1864',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Tyler',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mhaligowski/128.jpg',
                'lastName': 'Toy',
                'id': 'id_user_343'
              }
            },
            'con': {
              'owner': 'id_user_467',
              'posted': '2017-04-10T20:37:03.020Z',
              'role': 'con',
              'text': 'Et cum alias dicta quis dicta.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_1858',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Clemens',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/psdesignuk/128.jpg',
                'lastName': 'Schmitt',
                'id': 'id_user_467'
              }
            }
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_371',
              'posted': '2017-04-11T11:05:50.851Z',
              'role': 'con',
              'text': 'Alias molestias qui ut maxime voluptatem repellat culpa voluptatum impedit.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1875',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ezequiel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ssiskind/128.jpg',
                'lastName': 'Aufderhar',
                'id': 'id_user_371'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_361',
              'posted': '2017-04-07T07:30:12.905Z',
              'role': 'pro',
              'text': 'Excepturi et at reprehenderit corporis ab.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1847',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Tommie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artd_sign/128.jpg',
                'lastName': 'Reinger',
                'id': 'id_user_361'
              }
            },
            'con': {
              'owner': 'id_user_241',
              'posted': '2017-04-18T20:41:53.456Z',
              'role': 'con',
              'text': 'Corrupti temporibus iure sunt similique est.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1853',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Sonny',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marrimo/128.jpg',
                'lastName': 'Dickinson',
                'id': 'id_user_241'
              }
            }
          }
        }
      }
    },
    'id_item_1889': {
      'text': 'Numquam voluptas cumque voluptas. Vel qui voluptatibus error voluptatem praesentium est enim quas. Dolor iste praesentium. Minus non et et aliquam iure et rerum quo.',
      'itemNumber': 24,
      'total': { 'votes': { 'yes': 47, 'no': 40 }, 'comments': { 'pro': 19, 'con': 13, 'neutral': 11 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 6, 'no': 2 },
          'comments': { 'pro': 1, 'con': 0, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 4, 'no': 4 }, 'comments': { 'pro': 1, 'con': 3, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 5, 'no': 4 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 3, 'no': 6 }, 'comments': { 'pro': 5, 'con': 3, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 3, 'no': 6 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
        'id_district_108': { 'votes': { 'yes': 4, 'no': 6 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 7, 'no': 4 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 2, 'con': 3, 'neutral': 3 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_262',
          'posted': '2017-04-08T11:19:58.831Z',
          'role': 'pro',
          'text': 'Nam cum ut.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_1983',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Leland',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mwarkentin/128.jpg',
            'lastName': 'McLaughlin',
            'id': 'id_user_262'
          }
        },
        'con': {
          'owner': 'id_user_275',
          'posted': '2017-04-07T00:32:20.899Z',
          'role': 'con',
          'text': 'Numquam dolorum ipsa doloremque eos.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_1994',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Bart',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dc_user/128.jpg',
            'lastName': 'Cartwright',
            'id': 'id_user_275'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_198',
              'posted': '2017-04-10T13:26:39.990Z',
              'role': 'pro',
              'text': 'Nulla nulla vero ex eligendi et.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_1980',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Trey',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cggaurav/128.jpg',
                'lastName': 'Jaskolski',
                'id': 'id_user_198'
              }
            }, 'con': null
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_179',
              'posted': '2017-04-09T05:55:21.321Z',
              'role': 'pro',
              'text': 'Fuga sunt inventore et cum aut omnis mollitia dicta blanditiis.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2014',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Delmer',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alexivanichkin/128.jpg',
                'lastName': 'Strosin',
                'id': 'id_user_179'
              }
            },
            'con': {
              'owner': 'id_user_318',
              'posted': '2017-04-17T03:05:14.383Z',
              'role': 'con',
              'text': 'Quisquam quo voluptas rerum non possimus harum illum vitae.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1986',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Clotilde',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buleswapnil/128.jpg',
                'lastName': 'Kub',
                'id': 'id_user_318'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_344',
              'posted': '2017-04-14T17:14:37.450Z',
              'role': 'pro',
              'text': 'Reprehenderit aut sapiente iure.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1997',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Haley',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iamjdeleon/128.jpg',
                'lastName': 'Romaguera',
                'id': 'id_user_344'
              }
            },
            'con': {
              'owner': 'id_user_136',
              'posted': '2017-04-10T15:59:15.885Z',
              'role': 'con',
              'text': 'Laboriosam optio asperiores blanditiis exercitationem repellendus iusto commodi porro architecto.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1999',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Glenda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/abdots/128.jpg',
                'lastName': 'Parisian',
                'id': 'id_user_136'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_210',
              'posted': '2017-04-06T14:36:03.686Z',
              'role': 'pro',
              'text': 'Culpa iure eum quia nostrum porro.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1985',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lulu',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/_scottburgess/128.jpg',
                'lastName': 'Rohan',
                'id': 'id_user_210'
              }
            }, 'con': null
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_262',
              'posted': '2017-04-08T11:19:58.831Z',
              'role': 'pro',
              'text': 'Nam cum ut.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1983',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Leland',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mwarkentin/128.jpg',
                'lastName': 'McLaughlin',
                'id': 'id_user_262'
              }
            },
            'con': {
              'owner': 'id_user_275',
              'posted': '2017-04-07T00:32:20.899Z',
              'role': 'con',
              'text': 'Numquam dolorum ipsa doloremque eos.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1994',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Bart',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dc_user/128.jpg',
                'lastName': 'Cartwright',
                'id': 'id_user_275'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_125',
              'posted': '2017-04-13T20:28:40.453Z',
              'role': 'pro',
              'text': 'Molestiae officia nam ducimus et eius quia odio rerum ipsum.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2008',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Raul',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/waghner/128.jpg',
                'lastName': 'Heidenreich',
                'id': 'id_user_125'
              }
            },
            'con': {
              'owner': 'id_user_299',
              'posted': '2017-04-05T23:07:38.976Z',
              'role': 'con',
              'text': 'Sed officia quibusdam itaque necessitatibus vel ea quas et.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2016',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Monica',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/BroumiYoussef/128.jpg',
                'lastName': 'Gusikowski',
                'id': 'id_user_299'
              }
            }
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_236',
              'posted': '2017-04-05T05:00:31.568Z',
              'role': 'pro',
              'text': 'Enim quasi impedit consequuntur quibusdam vel voluptas velit laudantium veritatis.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_2019',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Melvin',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/justinrhee/128.jpg',
                'lastName': 'Fay',
                'id': 'id_user_236'
              }
            }, 'con': null
          },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_169',
              'posted': '2017-04-17T04:25:29.302Z',
              'role': 'con',
              'text': 'Incidunt pariatur placeat consequatur repudiandae aut modi molestias minima ullam.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_1978',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Nigel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/michigangraham/128.jpg',
                'lastName': 'Wisoky',
                'id': 'id_user_169'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_206',
              'posted': '2017-04-18T03:23:38.979Z',
              'role': 'pro',
              'text': 'Animi molestiae quia deleniti vel et earum voluptates.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_2001',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jedidiah',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dawidwu/128.jpg',
                'lastName': 'Weimann',
                'id': 'id_user_206'
              }
            }, 'con': null
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_409',
              'posted': '2017-04-06T23:02:50.062Z',
              'role': 'pro',
              'text': 'Pariatur quam molestiae culpa.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1992',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jordon',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/estebanuribe/128.jpg',
                'lastName': 'Herman',
                'id': 'id_user_409'
              }
            },
            'con': {
              'owner': 'id_user_481',
              'posted': '2017-04-13T23:42:55.038Z',
              'role': 'con',
              'text': 'Molestias iste voluptates quia asperiores consequatur et repellat nihil est.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1998',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Peggie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artem_kostenko/128.jpg',
                'lastName': 'Bashirian',
                'id': 'id_user_481'
              }
            }
          }
        }
      }
    },
    'id_item_2020': {
      'text': 'Et et et unde at veritatis eum quaerat. Nisi laudantium sint ab ea. Aut aut sapiente at nulla aut et consequatur. Recusandae pariatur nisi est consequatur nam nulla beatae animi omnis. Earum repudiandae deserunt ipsa.',
      'itemNumber': 25,
      'total': { 'votes': { 'yes': 27, 'no': 15 }, 'comments': { 'pro': 7, 'con': 1, 'neutral': 2 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 2, 'no': 2 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_250',
          'posted': '2017-04-07T10:22:28.119Z',
          'role': 'pro',
          'text': 'Neque quo ut quia animi voluptatem aut corrupti aut dicta.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_2069',
          'votes': { 'up': 2, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Curtis',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xtopherpaul/128.jpg',
            'lastName': 'Baumbach',
            'id': 'id_user_250'
          }
        },
        'con': {
          'owner': 'id_user_498',
          'posted': '2017-04-13T07:24:49.061Z',
          'role': 'con',
          'text': 'Omnis omnis velit cupiditate rerum est architecto eius.',
          'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
          'id': 'id_comment_2065',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' } },
            'firstName': 'Carissa',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/davidmerrique/128.jpg',
            'lastName': 'Effertz',
            'id': 'id_user_498'
          }
        },
        'byDistrict': {
          'id_district_101': { 'pro': null, 'con': null },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_346',
              'posted': '2017-04-17T08:13:14.965Z',
              'role': 'pro',
              'text': 'Quo molestias tenetur deserunt id et.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2067',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Royce',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/strikewan/128.jpg',
                'lastName': 'Lang',
                'id': 'id_user_346'
              }
            }, 'con': null
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_250',
              'posted': '2017-04-07T10:22:28.119Z',
              'role': 'pro',
              'text': 'Neque quo ut quia animi voluptatem aut corrupti aut dicta.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_2069',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Curtis',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xtopherpaul/128.jpg',
                'lastName': 'Baumbach',
                'id': 'id_user_250'
              }
            }, 'con': null
          },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_393',
              'posted': '2017-04-12T11:09:14.229Z',
              'role': 'pro',
              'text': 'Accusantium quis perferendis velit dicta debitis et vero.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2066',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josiane',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinclediere/128.jpg',
                'lastName': 'Gleason',
                'id': 'id_user_393'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_359',
              'posted': '2017-04-13T16:57:42.417Z',
              'role': 'pro',
              'text': 'Qui quia aperiam ut ut aliquid corporis.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_2070',
              'votes': { 'up': 0, 'down': 2 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josiah',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gabrielizalo/128.jpg',
                'lastName': 'Lemke',
                'id': 'id_user_359'
              }
            }, 'con': null
          },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_494',
              'posted': '2017-04-15T20:16:51.280Z',
              'role': 'pro',
              'text': 'Similique placeat ut natus nihil nihil sed.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_2072',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ruby',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/stefanozoffoli/128.jpg',
                'lastName': 'Carroll',
                'id': 'id_user_494'
              }
            },
            'con': {
              'owner': 'id_user_498',
              'posted': '2017-04-13T07:24:49.061Z',
              'role': 'con',
              'text': 'Omnis omnis velit cupiditate rerum est architecto eius.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_2065',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Carissa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/davidmerrique/128.jpg',
                'lastName': 'Effertz',
                'id': 'id_user_498'
              }
            }
          },
          'id_district_110': { 'pro': null, 'con': null }
        }
      }
    },
    'id_item_2073': {
      'text': 'Et et nisi. Eius ut nesciunt incidunt quo doloribus quo. Cum est magni odio ut molestiae iusto beatae aut. Nemo corporis libero sed.',
      'itemNumber': 26,
      'total': { 'votes': { 'yes': 52, 'no': 43 }, 'comments': { 'pro': 10, 'con': 7, 'neutral': 11 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 7, 'no': 7 },
          'comments': { 'pro': 3, 'con': 1, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 6, 'no': 4 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 3 } },
        'id_district_105': { 'votes': { 'yes': 4, 'no': 4 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 2, 'no': 5 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 6, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
        'id_district_108': { 'votes': { 'yes': 4, 'no': 6 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 7, 'no': 4 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 7, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_413',
          'posted': '2017-04-18T00:43:11.162Z',
          'role': 'pro',
          'text': 'Repellendus veniam odit.',
          'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
          'id': 'id_comment_2173',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' } },
            'firstName': 'Lulu',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ssiskind/128.jpg',
            'lastName': 'Abbott',
            'id': 'id_user_413'
          }
        },
        'con': {
          'owner': 'id_user_371',
          'posted': '2017-04-17T01:25:10.173Z',
          'role': 'con',
          'text': 'Cum deserunt rerum autem ea.',
          'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
          'id': 'id_comment_2178',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' } },
            'firstName': 'Ezequiel',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ssiskind/128.jpg',
            'lastName': 'Aufderhar',
            'id': 'id_user_371'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_400',
              'posted': '2017-04-15T18:00:38.737Z',
              'role': 'pro',
              'text': 'Quo molestiae fugit dolorum molestiae error repudiandae ut.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2179',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ethelyn',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gabrielizalo/128.jpg',
                'lastName': 'Kunze',
                'id': 'id_user_400'
              }
            },
            'con': {
              'owner': 'id_user_367',
              'posted': '2017-04-08T07:20:11.141Z',
              'role': 'con',
              'text': 'Omnis est ut ut officia cupiditate voluptatem.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2174',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Edward',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sunshinedgirl/128.jpg',
                'lastName': 'Moen',
                'id': 'id_user_367'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_413',
              'posted': '2017-04-18T00:43:11.162Z',
              'role': 'pro',
              'text': 'Repellendus veniam odit.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2173',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lulu',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ssiskind/128.jpg',
                'lastName': 'Abbott',
                'id': 'id_user_413'
              }
            }, 'con': null
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_287',
              'posted': '2017-04-10T03:46:56.963Z',
              'role': 'pro',
              'text': 'Sed commodi recusandae nostrum est maiores.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_2185',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Francisca',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/chatyrko/128.jpg',
                'lastName': 'Rath',
                'id': 'id_user_287'
              }
            },
            'con': {
              'owner': 'id_user_385',
              'posted': '2017-04-05T10:28:34.757Z',
              'role': 'con',
              'text': 'Atque harum modi sit libero quia enim enim reiciendis.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_2186',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Louisa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tgerken/128.jpg',
                'lastName': 'Goodwin',
                'id': 'id_user_385'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_261',
              'posted': '2017-04-10T20:07:06.253Z',
              'role': 'pro',
              'text': 'Cum laboriosam et labore voluptatum.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2192',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Oma',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/9lessons/128.jpg',
                'lastName': 'Grimes',
                'id': 'id_user_261'
              }
            },
            'con': {
              'owner': 'id_user_464',
              'posted': '2017-04-09T02:42:08.486Z',
              'role': 'con',
              'text': 'Et veniam quia.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2190',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Leif',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/laasli/128.jpg',
                'lastName': 'Kuvalis',
                'id': 'id_user_464'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_379',
              'posted': '2017-04-09T08:41:18.355Z',
              'role': 'pro',
              'text': 'Exercitationem consequuntur ea quia nostrum molestias.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2187',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Timothy',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mattdetails/128.jpg',
                'lastName': 'Mohr',
                'id': 'id_user_379'
              }
            },
            'con': {
              'owner': 'id_user_471',
              'posted': '2017-04-05T03:57:08.373Z',
              'role': 'con',
              'text': 'Delectus corrupti sunt consequatur architecto eius magnam animi reprehenderit.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2176',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Sabryna',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gipsy_raf/128.jpg',
                'lastName': 'Howell',
                'id': 'id_user_471'
              }
            }
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_436',
              'posted': '2017-04-08T10:40:28.597Z',
              'role': 'pro',
              'text': 'Accusamus voluptate saepe incidunt earum.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_2180',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josefina',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/baluli/128.jpg',
                'lastName': 'Kunde',
                'id': 'id_user_436'
              }
            }, 'con': null
          },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_215',
              'posted': '2017-04-17T13:14:38.766Z',
              'role': 'con',
              'text': 'Voluptatum tenetur fugiat saepe.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_2171',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cyrus',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/karalek/128.jpg',
                'lastName': 'Jacobson',
                'id': 'id_user_215'
              }
            }
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_371',
              'posted': '2017-04-17T01:25:10.173Z',
              'role': 'con',
              'text': 'Cum deserunt rerum autem ea.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_2178',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ezequiel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ssiskind/128.jpg',
                'lastName': 'Aufderhar',
                'id': 'id_user_371'
              }
            }
          },
          'id_district_110': { 'pro': null, 'con': null }
        }
      }
    },
    'id_item_2197': {
      'text': 'Nesciunt esse quod aut neque nobis asperiores assumenda. Eum qui optio sit. Soluta eveniet fugiat culpa nesciunt. Praesentium harum non earum eum quis esse natus ea voluptate. A doloremque at. Distinctio ratione rerum est necessitatibus quia vel.',
      'itemNumber': 27,
      'total': { 'votes': { 'yes': 50, 'no': 34 }, 'comments': { 'pro': 2, 'con': 6, 'neutral': 2 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 3, 'no': 7 },
          'comments': { 'pro': 0, 'con': 1, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 8, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 9, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 5, 'no': 4 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 6, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_348',
          'posted': '2017-04-07T23:11:14.924Z',
          'role': 'pro',
          'text': 'Eum quam ut.',
          'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
          'id': 'id_comment_2287',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' } },
            'firstName': 'Fred',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dotgridline/128.jpg',
            'lastName': 'Murazik',
            'id': 'id_user_348'
          }
        },
        'con': {
          'owner': 'id_user_364',
          'posted': '2017-04-14T19:42:02.126Z',
          'role': 'con',
          'text': 'Minus mollitia quo sunt voluptatum voluptas molestias aperiam.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_2284',
          'votes': { 'up': 2, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Santa',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/amandabuzard/128.jpg',
            'lastName': 'Feest',
            'id': 'id_user_364'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': null,
            'con': {
              'owner': 'id_user_428',
              'posted': '2017-04-08T01:09:58.385Z',
              'role': 'con',
              'text': 'Doloribus sit error nulla voluptas.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2289',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josefa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/coreyweb/128.jpg',
                'lastName': 'Herman',
                'id': 'id_user_428'
              }
            }
          },
          'id_district_102': { 'pro': null, 'con': null },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_348',
              'posted': '2017-04-07T23:11:14.924Z',
              'role': 'pro',
              'text': 'Eum quam ut.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_2287',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Fred',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dotgridline/128.jpg',
                'lastName': 'Murazik',
                'id': 'id_user_348'
              }
            },
            'con': {
              'owner': 'id_user_416',
              'posted': '2017-04-16T09:56:40.695Z',
              'role': 'con',
              'text': 'Dolorem excepturi magnam magnam molestias est.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_2291',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Elbert',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cicerobr/128.jpg',
                'lastName': 'Dickens',
                'id': 'id_user_416'
              }
            }
          },
          'id_district_104': { 'pro': null, 'con': null },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_170',
              'posted': '2017-04-17T16:26:05.664Z',
              'role': 'pro',
              'text': 'Et cum nesciunt illo non aliquid modi.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2285',
              'votes': { 'up': 0, 'down': 2 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Adell',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kerihenare/128.jpg',
                'lastName': 'Rau',
                'id': 'id_user_170'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': null,
            'con': {
              'owner': 'id_user_236',
              'posted': '2017-04-11T08:23:57.875Z',
              'role': 'con',
              'text': 'Exercitationem atque ipsam esse aut qui sequi placeat et.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_2282',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Melvin',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/justinrhee/128.jpg',
                'lastName': 'Fay',
                'id': 'id_user_236'
              }
            }
          },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_364',
              'posted': '2017-04-14T19:42:02.126Z',
              'role': 'con',
              'text': 'Minus mollitia quo sunt voluptatum voluptas molestias aperiam.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_2284',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Santa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/amandabuzard/128.jpg',
                'lastName': 'Feest',
                'id': 'id_user_364'
              }
            }
          },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': null,
            'con': {
              'owner': 'id_user_409',
              'posted': '2017-04-08T02:15:39.448Z',
              'role': 'con',
              'text': 'Reprehenderit voluptatum beatae.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2290',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jordon',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/estebanuribe/128.jpg',
                'lastName': 'Herman',
                'id': 'id_user_409'
              }
            }
          }
        }
      }
    },
    'id_item_2292': {
      'text': 'Omnis id veniam quisquam quis veniam. Temporibus inventore est aliquid sed. Nisi aut sint in voluptate aperiam aut. Explicabo incidunt mollitia dolorum.',
      'itemNumber': 28,
      'total': { 'votes': { 'yes': 53, 'no': 47 }, 'comments': { 'pro': 3, 'con': 4, 'neutral': 5 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 7, 'no': 2 },
          'comments': { 'pro': 1, 'con': 2, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 8, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 2, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 3, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 7, 'no': 5 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 5 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 8, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 6, 'no': 5 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
        'id_district_110': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_285',
          'posted': '2017-04-15T16:06:10.947Z',
          'role': 'pro',
          'text': 'Quos ut non illum.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_2403',
          'votes': { 'up': 2, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Carleton',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/Shriiiiimp/128.jpg',
            'lastName': 'White',
            'id': 'id_user_285'
          }
        },
        'con': {
          'owner': 'id_user_314',
          'posted': '2017-04-08T18:32:49.333Z',
          'role': 'con',
          'text': 'Placeat reiciendis eos est aperiam quod reprehenderit minus.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_2395',
          'votes': { 'up': 3, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Lenny',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artem_kostenko/128.jpg',
            'lastName': 'Lowe',
            'id': 'id_user_314'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_198',
              'posted': '2017-04-14T03:52:56.411Z',
              'role': 'pro',
              'text': 'Incidunt eum repellat architecto consectetur velit adipisci iste.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2396',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Trey',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cggaurav/128.jpg',
                'lastName': 'Jaskolski',
                'id': 'id_user_198'
              }
            },
            'con': {
              'owner': 'id_user_183',
              'posted': '2017-04-17T22:04:06.111Z',
              'role': 'con',
              'text': 'Consectetur facilis ut dolorem.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2393',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Danielle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sachingawas/128.jpg',
                'lastName': 'Quitzon',
                'id': 'id_user_183'
              }
            }
          },
          'id_district_102': { 'pro': null, 'con': null },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': { 'pro': null, 'con': null },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_285',
              'posted': '2017-04-15T16:06:10.947Z',
              'role': 'pro',
              'text': 'Quos ut non illum.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2403',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Carleton',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/Shriiiiimp/128.jpg',
                'lastName': 'White',
                'id': 'id_user_285'
              }
            },
            'con': {
              'owner': 'id_user_314',
              'posted': '2017-04-08T18:32:49.333Z',
              'role': 'con',
              'text': 'Placeat reiciendis eos est aperiam quod reprehenderit minus.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2395',
              'votes': { 'up': 3, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lenny',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artem_kostenko/128.jpg',
                'lastName': 'Lowe',
                'id': 'id_user_314'
              }
            }
          },
          'id_district_106': { 'pro': null, 'con': null },
          'id_district_107': {
            'pro': null,
            'con': {
              'owner': 'id_user_288',
              'posted': '2017-04-14T01:54:14.613Z',
              'role': 'con',
              'text': 'At reiciendis similique.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_2401',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Reanna',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/clubb3rry/128.jpg',
                'lastName': 'Streich',
                'id': 'id_user_288'
              }
            }
          },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_350',
              'posted': '2017-04-15T05:27:32.237Z',
              'role': 'pro',
              'text': 'Eum et consequatur inventore libero quasi.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_2398',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mose',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/stefooo/128.jpg',
                'lastName': 'Hauck',
                'id': 'id_user_350'
              }
            }, 'con': null
          },
          'id_district_110': { 'pro': null, 'con': null }
        }
      }
    },
    'id_item_2405': {
      'text': 'Voluptatem nam cum consequuntur error deserunt quos. Illum quia quia consequatur vitae saepe reiciendis sint. Et mollitia voluptas saepe vel consectetur molestias.',
      'itemNumber': 29,
      'total': { 'votes': { 'yes': 29, 'no': 22 }, 'comments': { 'pro': 11, 'con': 10, 'neutral': 6 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 5, 'no': 4 },
          'comments': { 'pro': 0, 'con': 1, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 1, 'con': 6, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_287',
          'posted': '2017-04-07T20:41:31.597Z',
          'role': 'pro',
          'text': 'Ut eligendi dolor est voluptas sit dolorum.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_2478',
          'votes': { 'up': 2, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Francisca',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/chatyrko/128.jpg',
            'lastName': 'Rath',
            'id': 'id_user_287'
          }
        },
        'con': {
          'owner': 'id_user_215',
          'posted': '2017-04-06T21:20:20.903Z',
          'role': 'con',
          'text': 'Magni voluptate sed architecto quas.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_2466',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Cyrus',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/karalek/128.jpg',
            'lastName': 'Jacobson',
            'id': 'id_user_215'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': null,
            'con': {
              'owner': 'id_user_363',
              'posted': '2017-04-12T00:07:02.112Z',
              'role': 'con',
              'text': 'Placeat omnis consequatur sit voluptas ex magni.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2477',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cristian',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ariffsetiawan/128.jpg',
                'lastName': 'Kohler',
                'id': 'id_user_363'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_493',
              'posted': '2017-04-07T18:42:17.502Z',
              'role': 'pro',
              'text': 'Aut est aliquam.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2464',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Herman',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/al_li/128.jpg',
                'lastName': 'Welch',
                'id': 'id_user_493'
              }
            }, 'con': null
          },
          'id_district_103': {
            'pro': null,
            'con': {
              'owner': 'id_user_505',
              'posted': '2017-04-08T20:07:47.704Z',
              'role': 'con',
              'text': 'Itaque maiores quos vero et.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_2469',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Shaniya',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mrebay007/128.jpg',
                'lastName': 'Hansen',
                'id': 'id_user_505'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_287',
              'posted': '2017-04-07T20:41:31.597Z',
              'role': 'pro',
              'text': 'Ut eligendi dolor est voluptas sit dolorum.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_2478',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Francisca',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/chatyrko/128.jpg',
                'lastName': 'Rath',
                'id': 'id_user_287'
              }
            }, 'con': null
          },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_360',
              'posted': '2017-04-09T01:21:31.297Z',
              'role': 'con',
              'text': 'Eum animi maxime ea sit.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2474',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Isaias',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/r_garcia/128.jpg',
                'lastName': 'Hand',
                'id': 'id_user_360'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_188',
              'posted': '2017-04-08T09:57:56.236Z',
              'role': 'pro',
              'text': 'Libero ducimus eum.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2463',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ian',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/eduardostuart/128.jpg',
                'lastName': 'Bergnaum',
                'id': 'id_user_188'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': null,
            'con': {
              'owner': 'id_user_111',
              'posted': '2017-04-05T15:16:32.835Z',
              'role': 'con',
              'text': 'Nihil blanditiis autem quod nobis quos consequatur maiores consequatur soluta.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_2460',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jackson',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/aoimedia/128.jpg',
                'lastName': 'Bernhard',
                'id': 'id_user_111'
              }
            }
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_169',
              'posted': '2017-04-16T04:51:44.003Z',
              'role': 'pro',
              'text': 'Nulla at veritatis neque quae cumque fugiat consequuntur praesentium.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_2476',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Nigel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/michigangraham/128.jpg',
                'lastName': 'Wisoky',
                'id': 'id_user_169'
              }
            },
            'con': {
              'owner': 'id_user_215',
              'posted': '2017-04-06T21:20:20.903Z',
              'role': 'con',
              'text': 'Magni voluptate sed architecto quas.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_2466',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cyrus',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/karalek/128.jpg',
                'lastName': 'Jacobson',
                'id': 'id_user_215'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_177',
              'posted': '2017-04-11T05:08:45.624Z',
              'role': 'pro',
              'text': 'Nihil facere veniam molestiae.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_2461',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lon',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/S0ufi4n3/128.jpg',
                'lastName': 'Lemke',
                'id': 'id_user_177'
              }
            }, 'con': null
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_192',
              'posted': '2017-04-17T15:17:42.302Z',
              'role': 'pro',
              'text': 'Voluptatem doloremque eaque fugiat voluptatem quos eos veniam labore.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2475',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ricky',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/collegeman/128.jpg',
                'lastName': 'Kuhic',
                'id': 'id_user_192'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_2484': {
      'text': 'Officiis animi dignissimos dolor quod ducimus. Omnis asperiores officia rerum. Cumque odio et unde magnam alias. Iure aspernatur natus.',
      'itemNumber': 30,
      'total': { 'votes': { 'yes': 30, 'no': 27 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 0, 'no': 1 },
          'comments': { 'pro': 1, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 5, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 5, 'no': 8 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 3, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_175',
          'posted': '2017-04-12T01:43:05.041Z',
          'role': 'pro',
          'text': 'Ipsum odit voluptas ea et quas laudantium rerum nemo.',
          'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
          'id': 'id_comment_2543',
          'votes': { 'up': 2, 'down': 2 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' } },
            'firstName': 'Veda',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rahmeen/128.jpg',
            'lastName': 'Treutel',
            'id': 'id_user_175'
          }
        },
        'con': {
          'owner': 'id_user_253',
          'posted': '2017-04-13T14:43:19.089Z',
          'role': 'con',
          'text': 'Tenetur ut amet.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_2542',
          'votes': { 'up': 1, 'down': 3 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Rhea',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nicoleglynn/128.jpg',
            'lastName': 'Stark',
            'id': 'id_user_253'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_175',
              'posted': '2017-04-12T01:43:05.041Z',
              'role': 'pro',
              'text': 'Ipsum odit voluptas ea et quas laudantium rerum nemo.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2543',
              'votes': { 'up': 2, 'down': 2 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Veda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rahmeen/128.jpg',
                'lastName': 'Treutel',
                'id': 'id_user_175'
              }
            }, 'con': null
          },
          'id_district_102': { 'pro': null, 'con': null },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': { 'pro': null, 'con': null },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_253',
              'posted': '2017-04-13T14:43:19.089Z',
              'role': 'con',
              'text': 'Tenetur ut amet.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2542',
              'votes': { 'up': 1, 'down': 3 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Rhea',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nicoleglynn/128.jpg',
                'lastName': 'Stark',
                'id': 'id_user_253'
              }
            }
          },
          'id_district_106': { 'pro': null, 'con': null },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': { 'pro': null, 'con': null }
        }
      }
    },
    'id_item_2544': {
      'text': 'Voluptas nihil sint debitis aut quasi qui odio. Ducimus sed dolores et molestiae. Porro qui suscipit nemo ab qui facilis ea quia. Ut tempore non perspiciatis molestiae nobis. Nobis nulla sapiente cumque hic assumenda numquam non voluptatem.',
      'itemNumber': 31,
      'total': { 'votes': { 'yes': 48, 'no': 34 }, 'comments': { 'pro': 10, 'con': 4, 'neutral': 6 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 5, 'no': 4 },
          'comments': { 'pro': 1, 'con': 0, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 6, 'no': 4 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 6, 'no': 4 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_105': { 'votes': { 'yes': 2, 'no': 5 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 3, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 3, 'no': 6 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
        'id_district_109': { 'votes': { 'yes': 8, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 5, 'no': 4 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_212',
          'posted': '2017-04-18T18:25:15.198Z',
          'role': 'pro',
          'text': 'Deleniti qui consequatur explicabo porro assumenda quo ea assumenda porro.',
          'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
          'id': 'id_comment_2630',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' } },
            'firstName': 'Sterling',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/imomenui/128.jpg',
            'lastName': 'Koepp',
            'id': 'id_user_212'
          }
        },
        'con': {
          'owner': 'id_user_426',
          'posted': '2017-04-04T23:31:45.051Z',
          'role': 'con',
          'text': 'Debitis esse vitae rem aliquid eligendi vitae sed enim.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_2638',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Yadira',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/danthms/128.jpg',
            'lastName': 'Crona',
            'id': 'id_user_426'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_194',
              'posted': '2017-04-15T18:13:59.580Z',
              'role': 'pro',
              'text': 'Est eos aspernatur qui qui ea.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2642',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Weldon',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/simobenso/128.jpg',
                'lastName': 'Kuvalis',
                'id': 'id_user_194'
              }
            }, 'con': null
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_212',
              'posted': '2017-04-18T18:25:15.198Z',
              'role': 'pro',
              'text': 'Deleniti qui consequatur explicabo porro assumenda quo ea assumenda porro.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2630',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Sterling',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/imomenui/128.jpg',
                'lastName': 'Koepp',
                'id': 'id_user_212'
              }
            },
            'con': {
              'owner': 'id_user_468',
              'posted': '2017-04-14T00:13:10.081Z',
              'role': 'con',
              'text': 'Possimus sit et et earum et.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2644',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Keely',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mr_shiznit/128.jpg',
                'lastName': 'Gerlach',
                'id': 'id_user_468'
              }
            }
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_444',
              'posted': '2017-04-15T10:12:32.717Z',
              'role': 'con',
              'text': 'Nemo qui blanditiis enim ut.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_2641',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kole',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jghyllebert/128.jpg',
                'lastName': 'McCullough',
                'id': 'id_user_444'
              }
            }
          },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_130',
              'posted': '2017-04-08T23:55:17.474Z',
              'role': 'con',
              'text': 'Debitis expedita ipsa voluptas amet nulla sequi.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2635',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kelley',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/Silveredge9/128.jpg',
                'lastName': 'Langworth',
                'id': 'id_user_130'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_378',
              'posted': '2017-04-12T17:21:27.880Z',
              'role': 'pro',
              'text': 'Eum enim similique et dignissimos.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2629',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Reynold',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bublienko/128.jpg',
                'lastName': 'Heaney',
                'id': 'id_user_378'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_455',
              'posted': '2017-04-08T01:41:33.765Z',
              'role': 'pro',
              'text': 'Temporibus enim ea sed provident vel.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_2645',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cyrus',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artvavs/128.jpg',
                'lastName': 'Skiles',
                'id': 'id_user_455'
              }
            }, 'con': null
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_447',
              'posted': '2017-04-12T20:23:28.396Z',
              'role': 'pro',
              'text': 'Recusandae molestiae omnis aut et doloremque.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_2631',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Andreane',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/aluisio_azevedo/128.jpg',
                'lastName': 'Denesik',
                'id': 'id_user_447'
              }
            },
            'con': {
              'owner': 'id_user_426',
              'posted': '2017-04-04T23:31:45.051Z',
              'role': 'con',
              'text': 'Debitis esse vitae rem aliquid eligendi vitae sed enim.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_2638',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Yadira',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/danthms/128.jpg',
                'lastName': 'Crona',
                'id': 'id_user_426'
              }
            }
          },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_439',
              'posted': '2017-04-12T19:16:13.491Z',
              'role': 'pro',
              'text': 'Atque repudiandae et sit quisquam.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2632',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Anahi',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/johncafazza/128.jpg',
                'lastName': 'Zboncak',
                'id': 'id_user_439'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_2647': {
      'text': 'Ipsa omnis voluptatum libero voluptas voluptatem. In est nesciunt nesciunt sequi eligendi doloremque in laborum qui. Dolorem saepe est harum ut.',
      'itemNumber': 32,
      'total': { 'votes': { 'yes': 14, 'no': 12 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 1, 'no': 1 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_409',
          'posted': '2017-04-13T19:35:58.789Z',
          'role': 'pro',
          'text': 'Ea excepturi dignissimos facere sit quod aut modi hic nihil.',
          'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
          'id': 'id_comment_2674',
          'votes': { 'up': 1, 'down': 1 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' } },
            'firstName': 'Jordon',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/estebanuribe/128.jpg',
            'lastName': 'Herman',
            'id': 'id_user_409'
          }
        },
        'con': {
          'owner': 'id_user_457',
          'posted': '2017-04-17T12:22:31.934Z',
          'role': 'con',
          'text': 'Blanditiis et accusantium repellendus reprehenderit est deleniti quas.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_2675',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Alessandro',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/caspergrl/128.jpg',
            'lastName': 'Zboncak',
            'id': 'id_user_457'
          }
        },
        'byDistrict': {
          'id_district_101': { 'pro': null, 'con': null },
          'id_district_102': { 'pro': null, 'con': null },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': { 'pro': null, 'con': null },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_508',
              'posted': '2017-04-13T07:11:02.999Z',
              'role': 'con',
              'text': 'Sint omnis eligendi at non.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2677',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Isabelle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/krystalfister/128.jpg',
                'lastName': 'McClure',
                'id': 'id_user_508'
              }
            }
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_457',
              'posted': '2017-04-17T12:22:31.934Z',
              'role': 'con',
              'text': 'Blanditiis et accusantium repellendus reprehenderit est deleniti quas.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_2675',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alessandro',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/caspergrl/128.jpg',
                'lastName': 'Zboncak',
                'id': 'id_user_457'
              }
            }
          },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_409',
              'posted': '2017-04-13T19:35:58.789Z',
              'role': 'pro',
              'text': 'Ea excepturi dignissimos facere sit quod aut modi hic nihil.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2674',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jordon',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/estebanuribe/128.jpg',
                'lastName': 'Herman',
                'id': 'id_user_409'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_2678': {
      'text': 'Dolorem magni iste. Laboriosam ea iure explicabo debitis quae vel modi. Aliquid voluptatum delectus. Amet ipsum est. Repudiandae ducimus quae dignissimos.',
      'itemNumber': 33,
      'total': { 'votes': { 'yes': 7, 'no': 7 }, 'comments': { 'pro': 11, 'con': 7, 'neutral': 1 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 0, 'no': 0 },
          'comments': { 'pro': 0, 'con': 2, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 3, 'con': 0, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_311',
          'posted': '2017-04-07T18:01:32.274Z',
          'role': 'pro',
          'text': 'Minus voluptates tempora molestiae neque ipsum maxime.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_2709',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Albert',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nerrsoft/128.jpg',
            'lastName': 'Frami',
            'id': 'id_user_311'
          }
        },
        'con': {
          'owner': 'id_user_395',
          'posted': '2017-04-05T20:38:35.838Z',
          'role': 'con',
          'text': 'Sed est dolorem.',
          'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
          'id': 'id_comment_2701',
          'votes': { 'up': 2, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' } },
            'firstName': 'Guy',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cadikkara/128.jpg',
            'lastName': 'Hilpert',
            'id': 'id_user_395'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': null,
            'con': {
              'owner': 'id_user_502',
              'posted': '2017-04-08T18:14:39.272Z',
              'role': 'con',
              'text': 'Modi et accusantium corporis sed id.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2693',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mya',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ecommerceil/128.jpg',
                'lastName': 'Stanton',
                'id': 'id_user_502'
              }
            }
          },
          'id_district_102': {
            'pro': null,
            'con': {
              'owner': 'id_user_413',
              'posted': '2017-04-09T17:08:39.290Z',
              'role': 'con',
              'text': 'Dolorem consectetur eaque voluptatum sit inventore vel dolores sed est.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2707',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lulu',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ssiskind/128.jpg',
                'lastName': 'Abbott',
                'id': 'id_user_413'
              }
            }
          },
          'id_district_103': {
            'pro': null,
            'con': {
              'owner': 'id_user_395',
              'posted': '2017-04-05T20:38:35.838Z',
              'role': 'con',
              'text': 'Sed est dolorem.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_2701',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Guy',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cadikkara/128.jpg',
                'lastName': 'Hilpert',
                'id': 'id_user_395'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_181',
              'posted': '2017-04-07T22:53:58.599Z',
              'role': 'pro',
              'text': 'Et non dolore rem ut velit dolor.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_2706',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Hortense',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/hjartstrorn/128.jpg',
                'lastName': 'Walker',
                'id': 'id_user_181'
              }
            }, 'con': null
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_311',
              'posted': '2017-04-07T18:01:32.274Z',
              'role': 'pro',
              'text': 'Minus voluptates tempora molestiae neque ipsum maxime.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2709',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Albert',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nerrsoft/128.jpg',
                'lastName': 'Frami',
                'id': 'id_user_311'
              }
            }, 'con': null
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_211',
              'posted': '2017-04-16T10:36:01.788Z',
              'role': 'pro',
              'text': 'Repellat minima consectetur provident.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2699',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Nelson',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/justinrhee/128.jpg',
                'lastName': 'Wolf',
                'id': 'id_user_211'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_239',
              'posted': '2017-04-18T11:01:34.709Z',
              'role': 'pro',
              'text': 'Nisi minus assumenda illum perferendis.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_2694',
              'votes': { 'up': 0, 'down': 2 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Pablo',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ajaxy_ru/128.jpg',
                'lastName': 'Hodkiewicz',
                'id': 'id_user_239'
              }
            }, 'con': null
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_223',
              'posted': '2017-04-12T11:42:13.230Z',
              'role': 'pro',
              'text': 'Nihil doloribus voluptatem nostrum eveniet quia vero in.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_2702',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Olaf',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/shalt0ni/128.jpg',
                'lastName': 'Feil',
                'id': 'id_user_223'
              }
            }, 'con': null
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_230',
              'posted': '2017-04-16T11:36:04.738Z',
              'role': 'con',
              'text': 'Temporibus possimus earum quas.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_2711',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Tara',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/panchajanyag/128.jpg',
                'lastName': 'Rosenbaum',
                'id': 'id_user_230'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_412',
              'posted': '2017-04-07T21:59:06.299Z',
              'role': 'pro',
              'text': 'Et id autem molestiae quas sed architecto et.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2697',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Dante',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/scottiedude/128.jpg',
                'lastName': 'O\'Connell',
                'id': 'id_user_412'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_2712': {
      'text': 'Nesciunt suscipit eum animi est laudantium praesentium commodi culpa. Alias quia et. Eos dolores similique consectetur doloribus dolores voluptas autem nulla. Delectus vitae ipsam eos ut at nemo vel qui.',
      'itemNumber': 34,
      'total': { 'votes': { 'yes': 25, 'no': 24 }, 'comments': { 'pro': 15, 'con': 5, 'neutral': 9 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 1, 'no': 3 },
          'comments': { 'pro': 1, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 4 } },
        'id_district_107': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 6, 'no': 5 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_510',
          'posted': '2017-04-12T16:22:20.226Z',
          'role': 'pro',
          'text': 'Voluptas et recusandae quia qui sit est.',
          'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
          'id': 'id_comment_2790',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' } },
            'firstName': 'Miles',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kurafire/128.jpg',
            'lastName': 'Zemlak',
            'id': 'id_user_510'
          }
        },
        'con': {
          'owner': 'id_user_360',
          'posted': '2017-04-13T01:49:38.918Z',
          'role': 'con',
          'text': 'Minus est eius ut modi qui praesentium omnis.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_2788',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Isaias',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/r_garcia/128.jpg',
            'lastName': 'Hand',
            'id': 'id_user_360'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_255',
              'posted': '2017-04-05T10:04:42.194Z',
              'role': 'pro',
              'text': 'Veritatis voluptatem qui odio dolor ullam odio.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2763',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Twila',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/angelcolberg/128.jpg',
                'lastName': 'Kassulke',
                'id': 'id_user_255'
              }
            }, 'con': null
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_510',
              'posted': '2017-04-12T16:22:20.226Z',
              'role': 'pro',
              'text': 'Voluptas et recusandae quia qui sit est.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2790',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Miles',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kurafire/128.jpg',
                'lastName': 'Zemlak',
                'id': 'id_user_510'
              }
            }, 'con': null
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_432',
              'posted': '2017-04-07T09:19:13.936Z',
              'role': 'pro',
              'text': 'Non voluptatem ut quo voluptas.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_2767',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ryann',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/johnsmithagency/128.jpg',
                'lastName': 'Kuhlman',
                'id': 'id_user_432'
              }
            },
            'con': {
              'owner': 'id_user_398',
              'posted': '2017-04-17T13:44:59.158Z',
              'role': 'con',
              'text': 'Ea porro et rem et.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_2774',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Margaretta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nomidesigns/128.jpg',
                'lastName': 'Nicolas',
                'id': 'id_user_398'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_390',
              'posted': '2017-04-08T16:02:11.765Z',
              'role': 'pro',
              'text': 'Placeat adipisci sunt alias et recusandae earum id adipisci.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_2770',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alejandrin',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sachingawas/128.jpg',
                'lastName': 'Quigley',
                'id': 'id_user_390'
              }
            }, 'con': null
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_259',
              'posted': '2017-04-14T08:21:25.819Z',
              'role': 'pro',
              'text': 'Dolorum nam voluptatem numquam eligendi.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2789',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Andres',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/colgruv/128.jpg',
                'lastName': 'Goyette',
                'id': 'id_user_259'
              }
            },
            'con': {
              'owner': 'id_user_360',
              'posted': '2017-04-13T01:49:38.918Z',
              'role': 'con',
              'text': 'Minus est eius ut modi qui praesentium omnis.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2788',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Isaias',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/r_garcia/128.jpg',
                'lastName': 'Hand',
                'id': 'id_user_360'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_122',
              'posted': '2017-04-10T13:35:28.375Z',
              'role': 'pro',
              'text': 'Dolorem error in quod voluptatem.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2781',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Aniyah',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andresdjasso/128.jpg',
                'lastName': 'Dickinson',
                'id': 'id_user_122'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_455',
              'posted': '2017-04-15T23:17:10.311Z',
              'role': 'pro',
              'text': 'Et ut fugit nisi.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_2787',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cyrus',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artvavs/128.jpg',
                'lastName': 'Skiles',
                'id': 'id_user_455'
              }
            },
            'con': {
              'owner': 'id_user_139',
              'posted': '2017-04-09T12:58:44.791Z',
              'role': 'con',
              'text': 'Cumque quod voluptas velit consequatur inventore doloremque incidunt.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_2783',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Raegan',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/karalek/128.jpg',
                'lastName': 'Kub',
                'id': 'id_user_139'
              }
            }
          },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_438',
              'posted': '2017-04-18T01:33:21.761Z',
              'role': 'pro',
              'text': 'Sit delectus veritatis sequi dolores et dolorem non soluta.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2777',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Louie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/emmeffess/128.jpg',
                'lastName': 'Sawayn',
                'id': 'id_user_438'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_2791': {
      'text': 'Et minus perferendis quia unde culpa. Magni hic omnis necessitatibus id beatae occaecati accusantium. Non enim animi quae qui qui dolorum. A labore qui dolorum. Reprehenderit aut est veniam minima voluptatem molestias nostrum inventore. Repellat sint earum rerum.',
      'itemNumber': 35,
      'total': { 'votes': { 'yes': 25, 'no': 36 }, 'comments': { 'pro': 12, 'con': 8, 'neutral': 8 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 3, 'no': 4 },
          'comments': { 'pro': 1, 'con': 3, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
        'id_district_105': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 4 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 6 }, 'comments': { 'pro': 3, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 0, 'no': 4 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_460',
          'posted': '2017-04-08T20:19:15.606Z',
          'role': 'pro',
          'text': 'Voluptate cum consequatur id rerum sit.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_2862',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Robbie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/scrapdnb/128.jpg',
            'lastName': 'Fritsch',
            'id': 'id_user_460'
          }
        },
        'con': {
          'owner': 'id_user_148',
          'posted': '2017-04-17T07:01:25.338Z',
          'role': 'con',
          'text': 'Ut possimus commodi cumque quaerat.',
          'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
          'id': 'id_comment_2878',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' } },
            'firstName': 'Chase',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jayrobinson/128.jpg',
            'lastName': 'Jerde',
            'id': 'id_user_148'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_484',
              'posted': '2017-04-09T14:53:25.895Z',
              'role': 'pro',
              'text': 'Facilis in esse blanditiis omnis consequuntur dolorem deleniti necessitatibus sint.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2871',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Rogers',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/algunsanabria/128.jpg',
                'lastName': 'Christiansen',
                'id': 'id_user_484'
              }
            },
            'con': {
              'owner': 'id_user_237',
              'posted': '2017-04-06T09:46:19.297Z',
              'role': 'con',
              'text': 'Repellendus omnis iusto.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2858',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Stanley',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/newbrushes/128.jpg',
                'lastName': 'Rohan',
                'id': 'id_user_237'
              }
            }
          },
          'id_district_102': {
            'pro': null,
            'con': {
              'owner': 'id_user_303',
              'posted': '2017-04-14T16:47:13.989Z',
              'role': 'con',
              'text': 'Ut voluptatem asperiores labore aut.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2868',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kraig',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artd_sign/128.jpg',
                'lastName': 'Rutherford',
                'id': 'id_user_303'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_384',
              'posted': '2017-04-08T08:42:49.114Z',
              'role': 'pro',
              'text': 'Ex quisquam et voluptatem accusantium enim voluptatem.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_2865',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lucious',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/opnsrce/128.jpg',
                'lastName': 'Murray',
                'id': 'id_user_384'
              }
            },
            'con': {
              'owner': 'id_user_505',
              'posted': '2017-04-06T02:47:27.459Z',
              'role': 'con',
              'text': 'Vel molestias vero vel enim accusantium aperiam aut similique.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_2860',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Shaniya',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mrebay007/128.jpg',
                'lastName': 'Hansen',
                'id': 'id_user_505'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_240',
              'posted': '2017-04-11T14:45:45.381Z',
              'role': 'pro',
              'text': 'Ut dolores et consectetur dolorum quis eveniet.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_2867',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Aidan',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/madshensel/128.jpg',
                'lastName': 'Carroll',
                'id': 'id_user_240'
              }
            }, 'con': null
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_460',
              'posted': '2017-04-08T20:19:15.606Z',
              'role': 'pro',
              'text': 'Voluptate cum consequatur id rerum sit.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2862',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Robbie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/scrapdnb/128.jpg',
                'lastName': 'Fritsch',
                'id': 'id_user_460'
              }
            }, 'con': null
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_152',
              'posted': '2017-04-08T19:48:40.169Z',
              'role': 'pro',
              'text': 'Autem mollitia maxime sit recusandae velit quia aut officiis.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2876',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ignacio',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/AM_Kn2/128.jpg',
                'lastName': 'Feest',
                'id': 'id_user_152'
              }
            },
            'con': {
              'owner': 'id_user_393',
              'posted': '2017-04-10T12:48:53.459Z',
              'role': 'con',
              'text': 'Sit minus est ea voluptate sit alias.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2856',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josiane',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinclediere/128.jpg',
                'lastName': 'Gleason',
                'id': 'id_user_393'
              }
            }
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_343',
              'posted': '2017-04-17T04:37:05.418Z',
              'role': 'pro',
              'text': 'Consequuntur deleniti molestiae autem omnis quia.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_2877',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Tyler',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mhaligowski/128.jpg',
                'lastName': 'Toy',
                'id': 'id_user_343'
              }
            }, 'con': null
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_238',
              'posted': '2017-04-17T09:44:11.394Z',
              'role': 'pro',
              'text': 'Distinctio est quo.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_2863',
              'votes': { 'up': 0, 'down': 2 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Russel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mauriolg/128.jpg',
                'lastName': 'Koch',
                'id': 'id_user_238'
              }
            }, 'con': null
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_372',
              'posted': '2017-04-06T22:20:25.144Z',
              'role': 'pro',
              'text': 'Nostrum error adipisci dolorem beatae unde quo qui voluptate harum.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2870',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Gaston',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/curiousonaut/128.jpg',
                'lastName': 'Schamberger',
                'id': 'id_user_372'
              }
            },
            'con': {
              'owner': 'id_user_148',
              'posted': '2017-04-17T07:01:25.338Z',
              'role': 'con',
              'text': 'Ut possimus commodi cumque quaerat.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2878',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Chase',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jayrobinson/128.jpg',
                'lastName': 'Jerde',
                'id': 'id_user_148'
              }
            }
          }
        }
      }
    },
    'id_item_2881': {
      'text': 'Rerum fugit dolor soluta culpa commodi ut corporis quia. Consequuntur omnis culpa quia animi. Quis praesentium quis dolor velit laborum. Neque et doloribus non ut quod.',
      'itemNumber': 36,
      'total': { 'votes': { 'yes': 8, 'no': 9 }, 'comments': { 'pro': 7, 'con': 12, 'neutral': 5 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 0, 'no': 2 },
          'comments': { 'pro': 1, 'con': 2, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_476',
          'posted': '2017-04-13T11:20:08.228Z',
          'role': 'pro',
          'text': 'Fugit et ad similique velit possimus error placeat asperiores.',
          'id': 'id_comment_2915',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'firstName': 'Kayden',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/emmandenn/128.jpg',
            'lastName': 'Cremin',
            'id': 'id_user_476'
          }
        },
        'con': {
          'owner': 'id_user_207',
          'posted': '2017-04-18T01:01:58.463Z',
          'role': 'con',
          'text': 'Ut reiciendis sequi nemo est quisquam earum.',
          'id': 'id_comment_2902',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'firstName': 'Jayden',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/herbigt/128.jpg',
            'lastName': 'Torphy',
            'id': 'id_user_207'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_479',
              'posted': '2017-04-06T21:19:36.139Z',
              'role': 'pro',
              'text': 'Quae laboriosam eos ex quidem tempora iusto sunt recusandae et.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2899',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Anissa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/darylws/128.jpg',
                'lastName': 'Nitzsche',
                'id': 'id_user_479'
              }
            },
            'con': {
              'owner': 'id_user_356',
              'posted': '2017-04-08T04:10:49.761Z',
              'role': 'con',
              'text': 'Doloremque consequatur iste sunt consectetur ratione.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2912',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Vernie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/timothycd/128.jpg',
                'lastName': 'Robel',
                'id': 'id_user_356'
              }
            }
          },
          'id_district_102': {
            'pro': null,
            'con': {
              'owner': 'id_user_315',
              'posted': '2017-04-16T21:23:00.591Z',
              'role': 'con',
              'text': 'Vel voluptas provident pariatur nihil tenetur odio soluta.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2908',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kiara',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinlayfield/128.jpg',
                'lastName': 'Kuhic',
                'id': 'id_user_315'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_276',
              'posted': '2017-04-14T16:55:57.997Z',
              'role': 'pro',
              'text': 'Sapiente aliquid tempora eos placeat quae ab ipsum.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_2909',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Orval',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nitinhayaran/128.jpg',
                'lastName': 'Ledner',
                'id': 'id_user_276'
              }
            }, 'con': null
          },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_287',
              'posted': '2017-04-11T19:48:23.665Z',
              'role': 'con',
              'text': 'Adipisci neque consequuntur voluptates modi accusantium in dicta ipsum.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_2920',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Francisca',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/chatyrko/128.jpg',
                'lastName': 'Rath',
                'id': 'id_user_287'
              }
            }
          },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_259',
              'posted': '2017-04-12T10:29:13.552Z',
              'role': 'con',
              'text': 'Expedita ipsam odit.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2914',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Andres',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/colgruv/128.jpg',
                'lastName': 'Goyette',
                'id': 'id_user_259'
              }
            }
          },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_393',
              'posted': '2017-04-06T07:25:02.093Z',
              'role': 'con',
              'text': 'Quasi totam beatae fuga enim voluptatem quia esse corrupti ratione.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2911',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josiane',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinclediere/128.jpg',
                'lastName': 'Gleason',
                'id': 'id_user_393'
              }
            }
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_322',
              'posted': '2017-04-17T16:23:21.795Z',
              'role': 'con',
              'text': 'Doloribus sunt facere neque id explicabo iusto facere ea sunt.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_2907',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Dejon',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joelcipriano/128.jpg',
                'lastName': 'Gottlieb',
                'id': 'id_user_322'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_371',
              'posted': '2017-04-14T21:08:54.075Z',
              'role': 'pro',
              'text': 'Dicta molestiae deserunt ullam commodi tempore sunt modi sed.',
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
                'firstName': 'Ezequiel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ssiskind/128.jpg',
                'lastName': 'Aufderhar',
                'id': 'id_user_371'
              }
            }, 'con': null
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_443',
              'posted': '2017-04-11T11:41:18.458Z',
              'role': 'pro',
              'text': 'Ut in maxime aliquid et illo.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2900',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jerry',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/estebanuribe/128.jpg',
                'lastName': 'Feeney',
                'id': 'id_user_443'
              }
            },
            'con': {
              'owner': 'id_user_423',
              'posted': '2017-04-06T18:52:20.031Z',
              'role': 'con',
              'text': 'Laborum adipisci eum aut.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2904',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Claude',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kurtinc/128.jpg',
                'lastName': 'Kerluke',
                'id': 'id_user_423'
              }
            }
          }
        }
      }
    },
    'id_item_2923': {
      'text': 'Qui veniam mollitia deserunt. Nostrum quisquam doloribus ut fugit omnis. Voluptate quia consequuntur pariatur. Et dolorum numquam culpa reiciendis ex recusandae accusamus. Animi magnam eius repellendus consectetur expedita. Fugit sint repellendus consequatur debitis rerum repellendus.',
      'itemNumber': 37,
      'total': { 'votes': { 'yes': 24, 'no': 13 }, 'comments': { 'pro': 15, 'con': 15, 'neutral': 8 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 2, 'no': 2 },
          'comments': { 'pro': 5, 'con': 2, 'neutral': 2 }
        },
        'id_district_102': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 0, 'con': 5, 'neutral': 2 } },
        'id_district_109': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_244',
          'posted': '2017-04-11T00:10:11.440Z',
          'role': 'pro',
          'text': 'Veritatis modi vel et pariatur.',
          'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
          'id': 'id_comment_2994',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' } },
            'firstName': 'Maureen',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gofrasdesign/128.jpg',
            'lastName': 'Abernathy',
            'id': 'id_user_244'
          }
        },
        'con': {
          'owner': 'id_user_381',
          'posted': '2017-04-18T01:54:38.521Z',
          'role': 'con',
          'text': 'Rem possimus itaque et quia id.',
          'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
          'id': 'id_comment_2998',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' } },
            'firstName': 'Adriel',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/richardgarretts/128.jpg',
            'lastName': 'Cremin',
            'id': 'id_user_381'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_244',
              'posted': '2017-04-11T00:10:11.440Z',
              'role': 'pro',
              'text': 'Veritatis modi vel et pariatur.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2994',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Maureen',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gofrasdesign/128.jpg',
                'lastName': 'Abernathy',
                'id': 'id_user_244'
              }
            },
            'con': {
              'owner': 'id_user_163',
              'posted': '2017-04-18T03:57:04.554Z',
              'role': 'con',
              'text': 'Odio sit ullam praesentium itaque nesciunt dolores est et.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_2996',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Justina',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/thibaut_re/128.jpg',
                'lastName': 'O\'Hara',
                'id': 'id_user_163'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_386',
              'posted': '2017-04-10T11:18:03.256Z',
              'role': 'pro',
              'text': 'Aut culpa voluptate quia amet maxime rerum ut minus.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2967',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Sheila',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arthurholcombe1/128.jpg',
                'lastName': 'Mitchell',
                'id': 'id_user_386'
              }
            },
            'con': {
              'owner': 'id_user_381',
              'posted': '2017-04-18T01:54:38.521Z',
              'role': 'con',
              'text': 'Rem possimus itaque et quia id.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_2998',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Adriel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/richardgarretts/128.jpg',
                'lastName': 'Cremin',
                'id': 'id_user_381'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_389',
              'posted': '2017-04-07T11:22:39.359Z',
              'role': 'pro',
              'text': 'Facere eos doloribus est illo vero at tempora corporis voluptatibus.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_2975',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Hulda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/grahamkennery/128.jpg',
                'lastName': 'Beatty',
                'id': 'id_user_389'
              }
            }, 'con': null
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_444',
              'posted': '2017-04-12T10:16:23.234Z',
              'role': 'pro',
              'text': 'Quis aspernatur minima sunt repellat sed qui vero.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_2972',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kole',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jghyllebert/128.jpg',
                'lastName': 'McCullough',
                'id': 'id_user_444'
              }
            },
            'con': {
              'owner': 'id_user_388',
              'posted': '2017-04-09T03:18:16.839Z',
              'role': 'con',
              'text': 'Numquam quae sunt dolorem voluptatem aliquid aut voluptates minus aspernatur.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_2989',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cory',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tomas_janousek/128.jpg',
                'lastName': 'Mueller',
                'id': 'id_user_388'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_147',
              'posted': '2017-04-14T01:52:26.593Z',
              'role': 'pro',
              'text': 'Est saepe incidunt ullam quia reiciendis.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2969',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kale',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/theonlyzeke/128.jpg',
                'lastName': 'Moore',
                'id': 'id_user_147'
              }
            },
            'con': {
              'owner': 'id_user_330',
              'posted': '2017-04-14T10:00:28.887Z',
              'role': 'con',
              'text': 'Harum officiis consectetur dolor.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_2986',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Antwon',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/trueblood_33/128.jpg',
                'lastName': 'McDermott',
                'id': 'id_user_330'
              }
            }
          },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_189',
              'posted': '2017-04-18T17:03:08.515Z',
              'role': 'con',
              'text': 'Est animi ut at nulla est dolor dolorum.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_2983',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kelley',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arishi_/128.jpg',
                'lastName': 'Skiles',
                'id': 'id_user_189'
              }
            }
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_401',
              'posted': '2017-04-08T09:34:58.260Z',
              'role': 'pro',
              'text': 'Dolor quia fuga ut laborum quae et explicabo iste molestias.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_2997',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Gaetano',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/thierrymeier_/128.jpg',
                'lastName': 'Carroll',
                'id': 'id_user_401'
              }
            }, 'con': null
          },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_254',
              'posted': '2017-04-15T08:46:27.342Z',
              'role': 'con',
              'text': 'Et facilis unde ut omnis dolorem quia sit nisi est.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_2964',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Shyanne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kurtinc/128.jpg',
                'lastName': 'Robel',
                'id': 'id_user_254'
              }
            }
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_501',
              'posted': '2017-04-07T14:40:01.570Z',
              'role': 'con',
              'text': 'Sed voluptate cumque rem nisi alias consequuntur aut repudiandae quia.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_2992',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Shayna',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jonkspr/128.jpg',
                'lastName': 'Walter',
                'id': 'id_user_501'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_321',
              'posted': '2017-04-08T20:25:29.721Z',
              'role': 'pro',
              'text': 'Quia vero earum iusto.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2993',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Christian',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/coreyhaggard/128.jpg',
                'lastName': 'Brekke',
                'id': 'id_user_321'
              }
            },
            'con': {
              'owner': 'id_user_412',
              'posted': '2017-04-06T00:05:49.880Z',
              'role': 'con',
              'text': 'Consequatur suscipit officiis dolores.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_2962',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Dante',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/scottiedude/128.jpg',
                'lastName': 'O\'Connell',
                'id': 'id_user_412'
              }
            }
          }
        }
      }
    },
    'id_item_2999': {
      'text': 'Et beatae itaque est molestias dolor. Nam omnis ab. Ullam animi unde consequatur aliquam soluta assumenda itaque quibusdam. Voluptatum quis repellendus exercitationem quos.',
      'itemNumber': 38,
      'total': { 'votes': { 'yes': 29, 'no': 31 }, 'comments': { 'pro': 6, 'con': 2, 'neutral': 8 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 1, 'no': 1 },
          'comments': { 'pro': 1, 'con': 0, 'neutral': 3 }
        },
        'id_district_102': { 'votes': { 'yes': 6, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 6, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 3, 'no': 4 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 1, 'no': 6 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_307',
          'posted': '2017-04-17T08:26:10.380Z',
          'role': 'pro',
          'text': 'Odio voluptas minus.',
          'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
          'id': 'id_comment_3068',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' } },
            'firstName': 'Genesis',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/amywebbb/128.jpg',
            'lastName': 'Kiehn',
            'id': 'id_user_307'
          }
        },
        'con': {
          'owner': 'id_user_342',
          'posted': '2017-04-07T19:45:02.909Z',
          'role': 'con',
          'text': 'Necessitatibus repellendus distinctio omnis autem quam mollitia nesciunt.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_3066',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Mabel',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/martip07/128.jpg',
            'lastName': 'Hayes',
            'id': 'id_user_342'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_425',
              'posted': '2017-04-14T12:19:54.665Z',
              'role': 'pro',
              'text': 'Commodi rerum nostrum rerum quod molestiae assumenda et.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3061',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ova',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rdbannon/128.jpg',
                'lastName': 'Waelchi',
                'id': 'id_user_425'
              }
            }, 'con': null
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_386',
              'posted': '2017-04-17T13:46:33.450Z',
              'role': 'pro',
              'text': 'Ex doloremque consequatur mollitia asperiores nihil impedit cupiditate.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_3060',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Sheila',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arthurholcombe1/128.jpg',
                'lastName': 'Mitchell',
                'id': 'id_user_386'
              }
            }, 'con': null
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_342',
              'posted': '2017-04-07T19:45:02.909Z',
              'role': 'con',
              'text': 'Necessitatibus repellendus distinctio omnis autem quam mollitia nesciunt.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3066',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mabel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/martip07/128.jpg',
                'lastName': 'Hayes',
                'id': 'id_user_342'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_353',
              'posted': '2017-04-15T09:50:08.992Z',
              'role': 'pro',
              'text': 'Enim similique saepe in cum est et quo et amet.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_3070',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Eda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/pechkinator/128.jpg',
                'lastName': 'Kertzmann',
                'id': 'id_user_353'
              }
            }, 'con': null
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_307',
              'posted': '2017-04-17T08:26:10.380Z',
              'role': 'pro',
              'text': 'Odio voluptas minus.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_3068',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Genesis',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/amywebbb/128.jpg',
                'lastName': 'Kiehn',
                'id': 'id_user_307'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_146',
              'posted': '2017-04-15T04:08:25.481Z',
              'role': 'pro',
              'text': 'Et animi rerum eaque.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_3067',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Katheryn',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tur8le/128.jpg',
                'lastName': 'Hammes',
                'id': 'id_user_146'
              }
            }, 'con': null
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_473',
              'posted': '2017-04-15T00:54:49.731Z',
              'role': 'pro',
              'text': 'Ut aut ut architecto.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_3064',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Zander',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sandywoodruff/128.jpg',
                'lastName': 'Carroll',
                'id': 'id_user_473'
              }
            }, 'con': null
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_264',
              'posted': '2017-04-07T07:02:58.471Z',
              'role': 'con',
              'text': 'Quam dolor natus qui.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_3069',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mya',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wintopia/128.jpg',
                'lastName': 'Nikolaus',
                'id': 'id_user_264'
              }
            }
          },
          'id_district_110': { 'pro': null, 'con': null }
        }
      }
    },
    'id_item_3076': {
      'text': 'Unde nihil voluptate in repudiandae magnam. Eveniet quia consequatur accusamus eaque. Deserunt nam corporis vitae expedita rem delectus natus numquam nam.',
      'itemNumber': 39,
      'total': { 'votes': { 'yes': 41, 'no': 31 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 5, 'no': 1 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 3, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 7, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 3, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_122',
          'posted': '2017-04-12T05:53:31.603Z',
          'role': 'pro',
          'text': 'In illo dolor.',
          'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
          'id': 'id_comment_3151',
          'votes': { 'up': 1, 'down': 4 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' } },
            'firstName': 'Aniyah',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andresdjasso/128.jpg',
            'lastName': 'Dickinson',
            'id': 'id_user_122'
          }
        },
        'con': {
          'owner': 'id_user_392',
          'posted': '2017-04-18T02:43:34.144Z',
          'role': 'con',
          'text': 'Quaerat veniam deleniti voluptatum aliquid.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_3149',
          'votes': { 'up': 2, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Wiley',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jeremymouton/128.jpg',
            'lastName': 'Reichert',
            'id': 'id_user_392'
          }
        },
        'byDistrict': {
          'id_district_101': { 'pro': null, 'con': null },
          'id_district_102': { 'pro': null, 'con': null },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_392',
              'posted': '2017-04-18T02:43:34.144Z',
              'role': 'con',
              'text': 'Quaerat veniam deleniti voluptatum aliquid.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3149',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Wiley',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jeremymouton/128.jpg',
                'lastName': 'Reichert',
                'id': 'id_user_392'
              }
            }
          },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_122',
              'posted': '2017-04-12T05:53:31.603Z',
              'role': 'pro',
              'text': 'In illo dolor.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_3151',
              'votes': { 'up': 1, 'down': 4 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Aniyah',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andresdjasso/128.jpg',
                'lastName': 'Dickinson',
                'id': 'id_user_122'
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
    'id_item_3152': {
      'text': 'Ipsum occaecati labore consequatur vel maiores et quas. Et quo et. Iusto ratione molestias quia exercitationem sapiente.',
      'itemNumber': 40,
      'total': { 'votes': { 'yes': 32, 'no': 21 }, 'comments': { 'pro': 7, 'con': 5, 'neutral': 3 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 2, 'no': 2 },
          'comments': { 'pro': 2, 'con': 2, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 4, 'no': 5 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_257',
          'posted': '2017-04-07T14:06:20.320Z',
          'role': 'pro',
          'text': 'Est reiciendis rem.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_3220',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Florian',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lu4sh1i/128.jpg',
            'lastName': 'Nicolas',
            'id': 'id_user_257'
          }
        },
        'con': {
          'owner': 'id_user_295',
          'posted': '2017-04-18T18:40:32.831Z',
          'role': 'con',
          'text': 'At repellendus ex voluptatum rerum ea aut sint.',
          'id': 'id_comment_3218',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'firstName': 'Jennie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kirangopal/128.jpg',
            'lastName': 'Beer',
            'id': 'id_user_295'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_263',
              'posted': '2017-04-15T20:53:29.218Z',
              'role': 'pro',
              'text': 'Facere et quam suscipit minus.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3217',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Micheal',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/loganjlambert/128.jpg',
                'lastName': 'Barrows',
                'id': 'id_user_263'
              }
            },
            'con': {
              'owner': 'id_user_435',
              'posted': '2017-04-05T12:23:45.384Z',
              'role': 'con',
              'text': 'Omnis ullam modi.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3212',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Emmanuel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nelsonjoyce/128.jpg',
                'lastName': 'Purdy',
                'id': 'id_user_435'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_493',
              'posted': '2017-04-17T11:18:32.892Z',
              'role': 'pro',
              'text': 'Qui est distinctio sit consequatur eius.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_3211',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Herman',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/al_li/128.jpg',
                'lastName': 'Welch',
                'id': 'id_user_493'
              }
            },
            'con': {
              'owner': 'id_user_306',
              'posted': '2017-04-10T02:08:12.081Z',
              'role': 'con',
              'text': 'Ut quam quo fugit aliquid.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_3209',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Nolan',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jmfsocial/128.jpg',
                'lastName': 'Renner',
                'id': 'id_user_306'
              }
            }
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_257',
              'posted': '2017-04-07T14:06:20.320Z',
              'role': 'pro',
              'text': 'Est reiciendis rem.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3220',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Florian',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lu4sh1i/128.jpg',
                'lastName': 'Nicolas',
                'id': 'id_user_257'
              }
            }, 'con': null
          },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_170',
              'posted': '2017-04-08T04:41:03.752Z',
              'role': 'pro',
              'text': 'Quisquam animi facilis consequatur vero.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_3215',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Adell',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kerihenare/128.jpg',
                'lastName': 'Rau',
                'id': 'id_user_170'
              }
            }, 'con': null
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_138',
              'posted': '2017-04-09T23:09:19.393Z',
              'role': 'con',
              'text': 'Molestiae minima iure repudiandae harum exercitationem dolor ut odio.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_3213',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Aylin',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joe_black/128.jpg',
                'lastName': 'Zieme',
                'id': 'id_user_138'
              }
            }
          },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_241',
              'posted': '2017-04-08T20:59:38.500Z',
              'role': 'pro',
              'text': 'Doloribus officiis placeat culpa ut fuga totam et.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_3216',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Sonny',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/marrimo/128.jpg',
                'lastName': 'Dickinson',
                'id': 'id_user_241'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_3221': {
      'text': 'Et dolores quia ducimus necessitatibus enim. Tempora debitis dolor. Qui velit nobis rerum cum ut et ut. Veniam aut vitae voluptatum eos et porro qui rerum.',
      'itemNumber': 41,
      'total': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 4, 'con': 7, 'neutral': 7 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 0, 'no': 0 },
          'comments': { 'pro': 1, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
        'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_200',
          'posted': '2017-04-10T16:44:11.337Z',
          'role': 'pro',
          'text': 'Nesciunt hic in non dignissimos ut ullam.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_3230',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Dianna',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kumarrajan12123/128.jpg',
            'lastName': 'Bernhard',
            'id': 'id_user_200'
          }
        },
        'con': {
          'owner': 'id_user_174',
          'posted': '2017-04-18T22:07:05.555Z',
          'role': 'con',
          'text': 'Impedit itaque voluptates.',
          'id': 'id_comment_3228',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'firstName': 'Jaren',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/leonfedotov/128.jpg',
            'lastName': 'Considine',
            'id': 'id_user_174'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_502',
              'posted': '2017-04-10T08:18:18.776Z',
              'role': 'pro',
              'text': 'Praesentium rerum rem velit ipsum qui tempore atque et.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3224',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mya',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ecommerceil/128.jpg',
                'lastName': 'Stanton',
                'id': 'id_user_502'
              }
            }, 'con': null
          },
          'id_district_102': { 'pro': null, 'con': null },
          'id_district_103': {
            'pro': null,
            'con': {
              'owner': 'id_user_340',
              'posted': '2017-04-18T01:26:03.779Z',
              'role': 'con',
              'text': 'Aperiam qui et et excepturi non voluptatem.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_3238',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jayson',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/okseanjay/128.jpg',
                'lastName': 'Roob',
                'id': 'id_user_340'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_200',
              'posted': '2017-04-10T16:44:11.337Z',
              'role': 'pro',
              'text': 'Nesciunt hic in non dignissimos ut ullam.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3230',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Dianna',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kumarrajan12123/128.jpg',
                'lastName': 'Bernhard',
                'id': 'id_user_200'
              }
            }, 'con': null
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_353',
              'posted': '2017-04-07T03:13:22.597Z',
              'role': 'pro',
              'text': 'Eaque praesentium quos fugit at perferendis assumenda accusamus debitis.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_3236',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Eda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/pechkinator/128.jpg',
                'lastName': 'Kertzmann',
                'id': 'id_user_353'
              }
            }, 'con': null
          },
          'id_district_106': { 'pro': null, 'con': null },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_235',
              'posted': '2017-04-07T21:05:28.944Z',
              'role': 'con',
              'text': 'Molestiae a sunt ut ut corporis vel et aperiam sunt.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_3227',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Janelle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rez___a/128.jpg',
                'lastName': 'Harber',
                'id': 'id_user_235'
              }
            }
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_273',
              'posted': '2017-04-15T03:53:13.311Z',
              'role': 'con',
              'text': 'Aut quae quo quis delectus.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_3225',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Daphne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/stevedesigner/128.jpg',
                'lastName': 'McClure',
                'id': 'id_user_273'
              }
            }
          },
          'id_district_110': {
            'pro': null,
            'con': {
              'owner': 'id_user_160',
              'posted': '2017-04-09T14:28:33.485Z',
              'role': 'con',
              'text': 'Sit inventore consequuntur aliquam est officiis.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_3239',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alexa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nellleo/128.jpg',
                'lastName': 'Becker',
                'id': 'id_user_160'
              }
            }
          }
        }
      }
    },
    'id_item_3241': {
      'text': 'Sed iusto quidem voluptas nihil quod et nisi recusandae. Atque ex quidem. Aut eos beatae quae fugiat. Distinctio voluptatem quo et distinctio itaque architecto. Nihil tempora corporis. Eveniet animi similique pariatur est sunt expedita.',
      'itemNumber': 42,
      'total': { 'votes': { 'yes': 52, 'no': 40 }, 'comments': { 'pro': 14, 'con': 9, 'neutral': 4 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 4, 'no': 5 },
          'comments': { 'pro': 3, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 2, 'no': 5 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 5, 'no': 3 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
        'id_district_105': { 'votes': { 'yes': 6, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 3, 'no': 5 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 5, 'no': 5 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 8, 'no': 5 }, 'comments': { 'pro': 2, 'con': 3, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 5, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_508',
          'posted': '2017-04-07T23:02:06.172Z',
          'role': 'pro',
          'text': 'Sit labore molestias.',
          'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
          'id': 'id_comment_3356',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' } },
            'firstName': 'Isabelle',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/krystalfister/128.jpg',
            'lastName': 'McClure',
            'id': 'id_user_508'
          }
        },
        'con': {
          'owner': 'id_user_249',
          'posted': '2017-04-18T21:52:09.469Z',
          'role': 'con',
          'text': 'Nihil est quaerat.',
          'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
          'id': 'id_comment_3334',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' } },
            'firstName': 'Lacey',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arishi_/128.jpg',
            'lastName': 'Moen',
            'id': 'id_user_249'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_175',
              'posted': '2017-04-07T16:06:00.596Z',
              'role': 'pro',
              'text': 'At atque placeat qui sit maiores vel libero earum.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3360',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Veda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rahmeen/128.jpg',
                'lastName': 'Treutel',
                'id': 'id_user_175'
              }
            }, 'con': null
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_306',
              'posted': '2017-04-17T10:54:26.119Z',
              'role': 'pro',
              'text': 'Harum molestias molestiae mollitia nemo nulla.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_3335',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Nolan',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jmfsocial/128.jpg',
                'lastName': 'Renner',
                'id': 'id_user_306'
              }
            }, 'con': null
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_432',
              'posted': '2017-04-15T23:51:04.876Z',
              'role': 'pro',
              'text': 'Molestiae ea voluptates vel ipsum culpa sed totam commodi.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_3349',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ryann',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/johnsmithagency/128.jpg',
                'lastName': 'Kuhlman',
                'id': 'id_user_432'
              }
            }, 'con': null
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_210',
              'posted': '2017-04-14T20:59:20.876Z',
              'role': 'pro',
              'text': 'Dolor itaque sit doloremque.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3338',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lulu',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/_scottburgess/128.jpg',
                'lastName': 'Rohan',
                'id': 'id_user_210'
              }
            },
            'con': {
              'owner': 'id_user_385',
              'posted': '2017-04-07T13:04:51.778Z',
              'role': 'con',
              'text': 'Qui nam et et doloremque quibusdam consequuntur.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3345',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Louisa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tgerken/128.jpg',
                'lastName': 'Goodwin',
                'id': 'id_user_385'
              }
            }
          },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_508',
              'posted': '2017-04-07T23:02:06.172Z',
              'role': 'pro',
              'text': 'Sit labore molestias.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_3356',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Isabelle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/krystalfister/128.jpg',
                'lastName': 'McClure',
                'id': 'id_user_508'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_111',
              'posted': '2017-04-13T10:24:22.169Z',
              'role': 'pro',
              'text': 'Ab quam quia et repudiandae voluptatem ratione amet qui et.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_3358',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jackson',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/aoimedia/128.jpg',
                'lastName': 'Bernhard',
                'id': 'id_user_111'
              }
            },
            'con': {
              'owner': 'id_user_249',
              'posted': '2017-04-18T21:52:09.469Z',
              'role': 'con',
              'text': 'Nihil est quaerat.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_3334',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lacey',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arishi_/128.jpg',
                'lastName': 'Moen',
                'id': 'id_user_249'
              }
            }
          },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_223',
              'posted': '2017-04-08T17:47:44.078Z',
              'role': 'con',
              'text': 'Tenetur debitis voluptatem illo velit quae animi minima.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_3339',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Olaf',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/shalt0ni/128.jpg',
                'lastName': 'Feil',
                'id': 'id_user_223'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_218',
              'posted': '2017-04-05T00:14:15.180Z',
              'role': 'pro',
              'text': 'Veniam quia delectus.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_3350',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artd_sign/128.jpg',
                'lastName': 'Rippin',
                'id': 'id_user_218'
              }
            },
            'con': {
              'owner': 'id_user_354',
              'posted': '2017-04-15T16:45:05.472Z',
              'role': 'con',
              'text': 'Est at esse quibusdam veritatis qui.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_3337',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Abigail',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/muringa/128.jpg',
                'lastName': 'Wolff',
                'id': 'id_user_354'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_441',
              'posted': '2017-04-13T20:28:56.450Z',
              'role': 'pro',
              'text': 'Similique omnis nihil.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_3341',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Damion',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/chrisslowik/128.jpg',
                'lastName': 'McGlynn',
                'id': 'id_user_441'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_3361': {
      'text': 'In labore cumque voluptas quia. Optio illo qui nam esse et deleniti tempore. Explicabo impedit eos non hic consequatur architecto ut quia. Aut ut esse exercitationem nisi alias quas numquam.',
      'itemNumber': 43,
      'total': { 'votes': { 'yes': 33, 'no': 31 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 2 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 2, 'no': 4 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 7, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_113',
          'posted': '2017-04-08T09:23:38.845Z',
          'role': 'pro',
          'text': 'Dolores recusandae atque ut.',
          'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
          'id': 'id_comment_3426',
          'votes': { 'up': 3, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' } },
            'firstName': 'Emanuel',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fran_mchamy/128.jpg',
            'lastName': 'Jenkins',
            'id': 'id_user_113'
          }
        },
        'con': {
          'owner': 'id_user_133',
          'posted': '2017-04-11T02:26:55.580Z',
          'role': 'con',
          'text': 'Soluta vitae beatae qui ipsum atque.',
          'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
          'id': 'id_comment_3428',
          'votes': { 'up': 1, 'down': 1 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' } },
            'firstName': 'Easton',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/depaulawagner/128.jpg',
            'lastName': 'Walter',
            'id': 'id_user_133'
          }
        },
        'byDistrict': {
          'id_district_101': { 'pro': null, 'con': null },
          'id_district_102': { 'pro': null, 'con': null },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_475',
              'posted': '2017-04-06T21:19:54.615Z',
              'role': 'con',
              'text': 'Natus magni officiis officiis amet modi aut neque error.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3430',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Dana',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tonymillion/128.jpg',
                'lastName': 'Bechtelar',
                'id': 'id_user_475'
              }
            }
          },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_133',
              'posted': '2017-04-11T02:26:55.580Z',
              'role': 'con',
              'text': 'Soluta vitae beatae qui ipsum atque.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_3428',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Easton',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/depaulawagner/128.jpg',
                'lastName': 'Walter',
                'id': 'id_user_133'
              }
            }
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_113',
              'posted': '2017-04-08T09:23:38.845Z',
              'role': 'pro',
              'text': 'Dolores recusandae atque ut.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_3426',
              'votes': { 'up': 3, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Emanuel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fran_mchamy/128.jpg',
                'lastName': 'Jenkins',
                'id': 'id_user_113'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_3432': {
      'text': 'Quia qui harum. Iusto totam molestiae sunt repellat sed fugit iure rerum sit. Voluptates et cupiditate. Et sapiente minima commodi. Cum itaque in excepturi aut inventore sunt minima adipisci rerum.',
      'itemNumber': 44,
      'total': { 'votes': { 'yes': 53, 'no': 32 }, 'comments': { 'pro': 15, 'con': 16, 'neutral': 9 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 3, 'no': 6 },
          'comments': { 'pro': 2, 'con': 2, 'neutral': 2 }
        },
        'id_district_102': { 'votes': { 'yes': 6, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 3 } },
        'id_district_104': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 8, 'no': 4 }, 'comments': { 'pro': 1, 'con': 3, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 8, 'no': 2 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 7, 'no': 3 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 2 } },
        'id_district_109': { 'votes': { 'yes': 8, 'no': 3 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 6, 'no': 5 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_402',
          'posted': '2017-04-11T10:08:48.916Z',
          'role': 'pro',
          'text': 'Dolores ducimus hic recusandae qui id deleniti quis.',
          'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
          'id': 'id_comment_3541',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' } },
            'firstName': 'Hilario',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/daykiine/128.jpg',
            'lastName': 'Paucek',
            'id': 'id_user_402'
          }
        },
        'con': {
          'owner': 'id_user_444',
          'posted': '2017-04-06T08:18:30.603Z',
          'role': 'con',
          'text': 'Maxime repellendus eveniet.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_3539',
          'votes': { 'up': 2, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Kole',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jghyllebert/128.jpg',
            'lastName': 'McCullough',
            'id': 'id_user_444'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_244',
              'posted': '2017-04-12T04:16:12.549Z',
              'role': 'pro',
              'text': 'Minus nemo qui omnis reprehenderit exercitationem qui laudantium voluptatum.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3535',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Maureen',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gofrasdesign/128.jpg',
                'lastName': 'Abernathy',
                'id': 'id_user_244'
              }
            },
            'con': {
              'owner': 'id_user_341',
              'posted': '2017-04-06T06:34:36.316Z',
              'role': 'con',
              'text': 'Quia sed qui.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3519',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jonathan',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/artd_sign/128.jpg',
                'lastName': 'Lehner',
                'id': 'id_user_341'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_283',
              'posted': '2017-04-14T03:50:43.441Z',
              'role': 'pro',
              'text': 'Architecto deleniti excepturi.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_3547',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Carrie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rangafangs/128.jpg',
                'lastName': 'Kautzer',
                'id': 'id_user_283'
              }
            }, 'con': null
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_450',
              'posted': '2017-04-11T00:55:24.775Z',
              'role': 'pro',
              'text': 'In repellendus quos et laboriosam est perspiciatis iure quidem perspiciatis.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_3548',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Candido',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/praveen_vijaya/128.jpg',
                'lastName': 'Tromp',
                'id': 'id_user_450'
              }
            },
            'con': {
              'owner': 'id_user_434',
              'posted': '2017-04-11T09:53:06.487Z',
              'role': 'con',
              'text': 'Amet earum sit aut laboriosam provident necessitatibus.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_3542',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Zachery',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alevizio/128.jpg',
                'lastName': 'Raynor',
                'id': 'id_user_434'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_472',
              'posted': '2017-04-14T08:23:21.889Z',
              'role': 'pro',
              'text': 'Distinctio dolorem placeat accusantium consequuntur molestiae.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3524',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ignacio',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/okandungel/128.jpg',
                'lastName': 'Torp',
                'id': 'id_user_472'
              }
            },
            'con': {
              'owner': 'id_user_444',
              'posted': '2017-04-06T08:18:30.603Z',
              'role': 'con',
              'text': 'Maxime repellendus eveniet.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3539',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kole',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jghyllebert/128.jpg',
                'lastName': 'McCullough',
                'id': 'id_user_444'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_353',
              'posted': '2017-04-06T03:11:19.440Z',
              'role': 'pro',
              'text': 'Nihil ipsa aut aut iusto veritatis aut ducimus dolor perferendis.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_3551',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Eda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/pechkinator/128.jpg',
                'lastName': 'Kertzmann',
                'id': 'id_user_353'
              }
            },
            'con': {
              'owner': 'id_user_187',
              'posted': '2017-04-17T02:26:19.244Z',
              'role': 'con',
              'text': 'Corporis optio debitis a ipsum excepturi rerum atque facere.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_3552',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Karlie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/funwatercat/128.jpg',
                'lastName': 'Feest',
                'id': 'id_user_187'
              }
            }
          },
          'id_district_106': { 'pro': null, 'con': null },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_347',
              'posted': '2017-04-10T10:23:37.847Z',
              'role': 'pro',
              'text': 'Optio et in rerum.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_3537',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Misty',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/a_brixen/128.jpg',
                'lastName': 'Cremin',
                'id': 'id_user_347'
              }
            },
            'con': {
              'owner': 'id_user_369',
              'posted': '2017-04-13T06:08:10.890Z',
              'role': 'con',
              'text': 'Consequatur aspernatur hic exercitationem aspernatur enim enim et totam.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_3528',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jace',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/finchjke/128.jpg',
                'lastName': 'Schroeder',
                'id': 'id_user_369'
              }
            }
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_219',
              'posted': '2017-04-13T11:15:58.242Z',
              'role': 'pro',
              'text': 'Quos cum eligendi magnam.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_3553',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Katarina',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/joeymurdah/128.jpg',
                'lastName': 'Auer',
                'id': 'id_user_219'
              }
            },
            'con': {
              'owner': 'id_user_141',
              'posted': '2017-04-16T17:36:21.520Z',
              'role': 'con',
              'text': 'Ea a est ipsa debitis non.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_3531',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Maybelle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kalmerrautam/128.jpg',
                'lastName': 'Crist',
                'id': 'id_user_141'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_454',
              'posted': '2017-04-09T04:29:10.398Z',
              'role': 'pro',
              'text': 'Ullam molestiae repellendus.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_3536',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Hunter',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/eitarafa/128.jpg',
                'lastName': 'Wolf',
                'id': 'id_user_454'
              }
            },
            'con': {
              'owner': 'id_user_370',
              'posted': '2017-04-08T18:59:19.256Z',
              'role': 'con',
              'text': 'In voluptatum illum quam.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_3545',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cierra',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buleswapnil/128.jpg',
                'lastName': 'Dickens',
                'id': 'id_user_370'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_402',
              'posted': '2017-04-11T10:08:48.916Z',
              'role': 'pro',
              'text': 'Dolores ducimus hic recusandae qui id deleniti quis.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_3541',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Hilario',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/daykiine/128.jpg',
                'lastName': 'Paucek',
                'id': 'id_user_402'
              }
            },
            'con': {
              'owner': 'id_user_190',
              'posted': '2017-04-16T21:36:30.822Z',
              'role': 'con',
              'text': 'Eveniet perferendis qui est repellendus perferendis neque sit accusantium iure.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_3556',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Leopold',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/chacky14/128.jpg',
                'lastName': 'McGlynn',
                'id': 'id_user_190'
              }
            }
          }
        }
      }
    },
    'id_item_3558': {
      'text': 'Quibusdam ducimus aut et quis dolorem aut similique. Sequi ut nihil ullam quae voluptatem necessitatibus sint quasi voluptatibus. Recusandae adipisci dolorem libero vel fuga blanditiis omnis excepturi sit. Dolorem delectus magnam. Modi excepturi cum facilis.',
      'itemNumber': 45,
      'total': { 'votes': { 'yes': 53, 'no': 46 }, 'comments': { 'pro': 19, 'con': 9, 'neutral': 14 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 6, 'no': 6 },
          'comments': { 'pro': 1, 'con': 1, 'neutral': 3 }
        },
        'id_district_102': { 'votes': { 'yes': 3, 'no': 6 }, 'comments': { 'pro': 4, 'con': 0, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 5, 'no': 6 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 2 } },
        'id_district_105': { 'votes': { 'yes': 7, 'no': 5 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 7, 'no': 7 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 2 } },
        'id_district_107': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 2 } },
        'id_district_108': { 'votes': { 'yes': 5, 'no': 0 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 7, 'no': 5 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_118',
          'posted': '2017-04-11T07:11:18.008Z',
          'role': 'pro',
          'text': 'Dolorem aliquid voluptatem mollitia officiis sed sunt eveniet.',
          'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
          'id': 'id_comment_3661',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' } },
            'firstName': 'Andreanne',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dhrubo/128.jpg',
            'lastName': 'Larson',
            'id': 'id_user_118'
          }
        },
        'con': {
          'owner': 'id_user_214',
          'posted': '2017-04-18T10:02:40.823Z',
          'role': 'con',
          'text': 'Vel corrupti cum quia ea qui vel omnis.',
          'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
          'id': 'id_comment_3695',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' } },
            'firstName': 'Boris',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jeremiespoken/128.jpg',
            'lastName': 'Mraz',
            'id': 'id_user_214'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_499',
              'posted': '2017-04-09T13:50:45.591Z',
              'role': 'pro',
              'text': 'Iste doloremque nisi recusandae officia.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3692',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Duane',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vj_demien/128.jpg',
                'lastName': 'Durgan',
                'id': 'id_user_499'
              }
            },
            'con': {
              'owner': 'id_user_363',
              'posted': '2017-04-17T03:36:26.426Z',
              'role': 'con',
              'text': 'Corporis sint earum suscipit est perferendis hic cumque.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3664',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cristian',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ariffsetiawan/128.jpg',
                'lastName': 'Kohler',
                'id': 'id_user_363'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_118',
              'posted': '2017-04-11T07:11:18.008Z',
              'role': 'pro',
              'text': 'Dolorem aliquid voluptatem mollitia officiis sed sunt eveniet.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_3661',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Andreanne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dhrubo/128.jpg',
                'lastName': 'Larson',
                'id': 'id_user_118'
              }
            }, 'con': null
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_195',
              'posted': '2017-04-08T02:39:30.465Z',
              'role': 'pro',
              'text': 'Dolores dignissimos quasi.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_3686',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lexus',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jjshaw14/128.jpg',
                'lastName': 'McLaughlin',
                'id': 'id_user_195'
              }
            }, 'con': null
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_506',
              'posted': '2017-04-10T03:44:24.206Z',
              'role': 'pro',
              'text': 'Ea perferendis velit quia suscipit earum aut.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3677',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Horacio',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vigobronx/128.jpg',
                'lastName': 'Ebert',
                'id': 'id_user_506'
              }
            },
            'con': {
              'owner': 'id_user_186',
              'posted': '2017-04-11T17:17:21.847Z',
              'role': 'con',
              'text': 'Voluptatem minima porro.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3681',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Roberta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/leehambley/128.jpg',
                'lastName': 'Pouros',
                'id': 'id_user_186'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_328',
              'posted': '2017-04-06T01:28:36.246Z',
              'role': 'pro',
              'text': 'Animi omnis tempora et maiores repellendus dignissimos necessitatibus tempora ex.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_3672',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Felipa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/envex/128.jpg',
                'lastName': 'Daniel',
                'id': 'id_user_328'
              }
            },
            'con': {
              'owner': 'id_user_311',
              'posted': '2017-04-13T03:49:58.852Z',
              'role': 'con',
              'text': 'Dolorum voluptatem magni.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_3668',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Albert',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nerrsoft/128.jpg',
                'lastName': 'Frami',
                'id': 'id_user_311'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_222',
              'posted': '2017-04-11T19:58:25.981Z',
              'role': 'pro',
              'text': 'Ipsam voluptatem modi harum atque eligendi architecto corrupti quod quia.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_3669',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Letitia',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/stevedesigner/128.jpg',
                'lastName': 'Ebert',
                'id': 'id_user_222'
              }
            },
            'con': {
              'owner': 'id_user_214',
              'posted': '2017-04-18T10:02:40.823Z',
              'role': 'con',
              'text': 'Vel corrupti cum quia ea qui vel omnis.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_3695',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Boris',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jeremiespoken/128.jpg',
                'lastName': 'Mraz',
                'id': 'id_user_214'
              }
            }
          },
          'id_district_107': {
            'pro': null,
            'con': {
              'owner': 'id_user_146',
              'posted': '2017-04-09T16:25:55.673Z',
              'role': 'con',
              'text': 'Et iusto ipsam porro quia velit sapiente ex minima.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_3683',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Katheryn',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tur8le/128.jpg',
                'lastName': 'Hammes',
                'id': 'id_user_146'
              }
            }
          },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_473',
              'posted': '2017-04-12T07:51:27.883Z',
              'role': 'con',
              'text': 'Eum et qui.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_3698',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Zander',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sandywoodruff/128.jpg',
                'lastName': 'Carroll',
                'id': 'id_user_473'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_238',
              'posted': '2017-04-13T15:57:44.350Z',
              'role': 'pro',
              'text': 'Minus voluptas a laboriosam laudantium maiores nisi velit.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_3690',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Russel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mauriolg/128.jpg',
                'lastName': 'Koch',
                'id': 'id_user_238'
              }
            },
            'con': {
              'owner': 'id_user_491',
              'posted': '2017-04-17T16:04:52.370Z',
              'role': 'con',
              'text': 'Ipsum nulla ut possimus dolores eveniet sit.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_3687',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Fredrick',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dcalonaci/128.jpg',
                'lastName': 'Johns',
                'id': 'id_user_491'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_474',
              'posted': '2017-04-12T04:24:33.213Z',
              'role': 'pro',
              'text': 'Et fugit ipsa neque nisi perferendis expedita excepturi.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_3676',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lucious',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/johnsmithagency/128.jpg',
                'lastName': 'Treutel',
                'id': 'id_user_474'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_3700': {
      'text': 'Dolore et eveniet quod consectetur est explicabo. Et totam soluta perferendis debitis esse sit qui. Modi fugiat qui voluptate porro eum asperiores. Placeat laborum et quam sequi excepturi sit maiores inventore.',
      'itemNumber': 46,
      'total': { 'votes': { 'yes': 25, 'no': 22 }, 'comments': { 'pro': 5, 'con': 3, 'neutral': 3 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 3, 'no': 0 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 0, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 4, 'no': 5 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_395',
          'posted': '2017-04-07T03:37:40.915Z',
          'role': 'pro',
          'text': 'Natus molestiae nisi.',
          'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
          'id': 'id_comment_3753',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' } },
            'firstName': 'Guy',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cadikkara/128.jpg',
            'lastName': 'Hilpert',
            'id': 'id_user_395'
          }
        },
        'con': {
          'owner': 'id_user_158',
          'posted': '2017-04-14T17:32:20.024Z',
          'role': 'con',
          'text': 'Facere voluptatem rerum ratione qui voluptatem.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_3755',
          'votes': { 'up': 3, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Evie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/to_soham/128.jpg',
            'lastName': 'Wintheiser',
            'id': 'id_user_158'
          }
        },
        'byDistrict': {
          'id_district_101': { 'pro': null, 'con': null },
          'id_district_102': { 'pro': null, 'con': null },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_395',
              'posted': '2017-04-07T03:37:40.915Z',
              'role': 'pro',
              'text': 'Natus molestiae nisi.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_3753',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Guy',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cadikkara/128.jpg',
                'lastName': 'Hilpert',
                'id': 'id_user_395'
              }
            }, 'con': null
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_181',
              'posted': '2017-04-12T02:22:26.871Z',
              'role': 'pro',
              'text': 'Veniam saepe facere ex qui earum sit distinctio facilis architecto.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3748',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Hortense',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/hjartstrorn/128.jpg',
                'lastName': 'Walker',
                'id': 'id_user_181'
              }
            }, 'con': null
          },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_158',
              'posted': '2017-04-14T17:32:20.024Z',
              'role': 'con',
              'text': 'Facere voluptatem rerum ratione qui voluptatem.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_3755',
              'votes': { 'up': 3, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Evie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/to_soham/128.jpg',
                'lastName': 'Wintheiser',
                'id': 'id_user_158'
              }
            }
          },
          'id_district_106': { 'pro': null, 'con': null },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_373',
              'posted': '2017-04-06T21:06:38.523Z',
              'role': 'pro',
              'text': 'Maiores dolorem ea voluptatem officiis eaque.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_3758',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Isabelle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/BillSKenney/128.jpg',
                'lastName': 'Klocko',
                'id': 'id_user_373'
              }
            }, 'con': null
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_365',
              'posted': '2017-04-16T00:59:59.451Z',
              'role': 'pro',
              'text': 'Aut libero voluptas quaerat quod omnis consectetur.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_3756',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Waino',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/antonyzotov/128.jpg',
                'lastName': 'Bailey',
                'id': 'id_user_365'
              }
            },
            'con': {
              'owner': 'id_user_495',
              'posted': '2017-04-05T11:34:00.102Z',
              'role': 'con',
              'text': 'Omnis et aut rerum est autem dolorem vel ut.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_3751',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Nathanael',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sharvin/128.jpg',
                'lastName': 'Morissette',
                'id': 'id_user_495'
              }
            }
          },
          'id_district_110': {
            'pro': null,
            'con': {
              'owner': 'id_user_480',
              'posted': '2017-04-05T06:31:39.139Z',
              'role': 'con',
              'text': 'Aut omnis accusamus est aliquam iste.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_3752',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Antonetta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/themrdave/128.jpg',
                'lastName': 'Dare',
                'id': 'id_user_480'
              }
            }
          }
        }
      }
    },
    'id_item_3759': {
      'text': 'Sunt autem reprehenderit dicta nam aspernatur quo. Ducimus laboriosam cupiditate velit doloribus sint sit quis ipsa. Sint fugit velit ipsam molestiae ab voluptatum voluptas est. Non similique non et quidem nam nulla inventore id officia.',
      'itemNumber': 47,
      'total': { 'votes': { 'yes': 62, 'no': 33 }, 'comments': { 'pro': 5, 'con': 12, 'neutral': 10 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 5, 'no': 5 },
          'comments': { 'pro': 0, 'con': 1, 'neutral': 3 }
        },
        'id_district_102': { 'votes': { 'yes': 7, 'no': 3 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 7, 'no': 5 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 2 } },
        'id_district_104': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 9, 'no': 7 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 6, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 10, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
        'id_district_110': { 'votes': { 'yes': 5, 'no': 4 }, 'comments': { 'pro': 0, 'con': 4, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_351',
          'posted': '2017-04-15T16:56:03.659Z',
          'role': 'pro',
          'text': 'Ea tempore voluptatem natus.',
          'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
          'id': 'id_comment_3857',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' } },
            'firstName': 'Ruthie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/divya/128.jpg',
            'lastName': 'Lehner',
            'id': 'id_user_351'
          }
        },
        'con': {
          'owner': 'id_user_397',
          'posted': '2017-04-10T12:01:30.079Z',
          'role': 'con',
          'text': 'Quo voluptatibus et fugit.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_3861',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Verdie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ruzinav/128.jpg',
            'lastName': 'Gusikowski',
            'id': 'id_user_397'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': null,
            'con': {
              'owner': 'id_user_324',
              'posted': '2017-04-12T16:15:22.785Z',
              'role': 'con',
              'text': 'Ex qui deserunt.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3868',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Tomasa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/juanmamartinez/128.jpg',
                'lastName': 'Cruickshank',
                'id': 'id_user_324'
              }
            }
          },
          'id_district_102': {
            'pro': null,
            'con': {
              'owner': 'id_user_477',
              'posted': '2017-04-12T12:35:34.155Z',
              'role': 'con',
              'text': 'Iure cupiditate quos est temporibus ipsam rem unde nostrum.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_3865',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Helena',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lvovenok/128.jpg',
                'lastName': 'Tromp',
                'id': 'id_user_477'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_276',
              'posted': '2017-04-06T16:44:18.954Z',
              'role': 'pro',
              'text': 'Qui et quas mollitia rerum et.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_3869',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Orval',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nitinhayaran/128.jpg',
                'lastName': 'Ledner',
                'id': 'id_user_276'
              }
            },
            'con': {
              'owner': 'id_user_398',
              'posted': '2017-04-07T04:50:16.445Z',
              'role': 'con',
              'text': 'Qui aut suscipit possimus ab occaecati ea.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_3867',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Margaretta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nomidesigns/128.jpg',
                'lastName': 'Nicolas',
                'id': 'id_user_398'
              }
            }
          },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_397',
              'posted': '2017-04-10T12:01:30.079Z',
              'role': 'con',
              'text': 'Quo voluptatibus et fugit.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_3861',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Verdie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ruzinav/128.jpg',
                'lastName': 'Gusikowski',
                'id': 'id_user_397'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_351',
              'posted': '2017-04-15T16:56:03.659Z',
              'role': 'pro',
              'text': 'Ea tempore voluptatem natus.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_3857',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ruthie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/divya/128.jpg',
                'lastName': 'Lehner',
                'id': 'id_user_351'
              }
            },
            'con': {
              'owner': 'id_user_351',
              'posted': '2017-04-17T01:00:34.723Z',
              'role': 'con',
              'text': 'Minus non commodi exercitationem.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_3880',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ruthie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/divya/128.jpg',
                'lastName': 'Lehner',
                'id': 'id_user_351'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_188',
              'posted': '2017-04-10T05:05:48.312Z',
              'role': 'pro',
              'text': 'Ipsa voluptatem dolore et incidunt iure corporis ratione.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_3860',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ian',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/eduardostuart/128.jpg',
                'lastName': 'Bergnaum',
                'id': 'id_user_188'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_139',
              'posted': '2017-04-16T07:26:51.047Z',
              'role': 'pro',
              'text': 'Et et cupiditate.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_3872',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Raegan',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/karalek/128.jpg',
                'lastName': 'Kub',
                'id': 'id_user_139'
              }
            }, 'con': null
          },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': null,
            'con': {
              'owner': 'id_user_423',
              'posted': '2017-04-18T14:48:07.205Z',
              'role': 'con',
              'text': 'Totam voluptatum animi.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_3870',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Claude',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kurtinc/128.jpg',
                'lastName': 'Kerluke',
                'id': 'id_user_423'
              }
            }
          }
        }
      }
    },
    'id_item_3882': {
      'text': 'Dolore consequatur dolorem consectetur voluptas sint non consequatur. Sint ut sed hic. Quisquam praesentium et qui aliquid quia hic.',
      'itemNumber': 48,
      'total': { 'votes': { 'yes': 46, 'no': 37 }, 'comments': { 'pro': 15, 'con': 16, 'neutral': 13 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 5, 'no': 2 },
          'comments': { 'pro': 4, 'con': 2, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 5, 'no': 8 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 2 } },
        'id_district_103': { 'votes': { 'yes': 5, 'no': 4 }, 'comments': { 'pro': 3, 'con': 0, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 7, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 7, 'no': 5 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 2, 'con': 4, 'neutral': 3 } },
        'id_district_109': { 'votes': { 'yes': 3, 'no': 4 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 3 } },
        'id_district_110': { 'votes': { 'yes': 4, 'no': 5 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_488',
          'posted': '2017-04-06T19:30:05.523Z',
          'role': 'pro',
          'text': 'Consequatur et sed nam.',
          'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
          'id': 'id_comment_3969',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' } },
            'firstName': 'Mckenzie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/stefanozoffoli/128.jpg',
            'lastName': 'Feest',
            'id': 'id_user_488'
          }
        },
        'con': {
          'owner': 'id_user_473',
          'posted': '2017-04-15T19:36:49.350Z',
          'role': 'con',
          'text': 'Adipisci mollitia dolor sed commodi ex qui qui possimus.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_3989',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Zander',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sandywoodruff/128.jpg',
            'lastName': 'Carroll',
            'id': 'id_user_473'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_411',
              'posted': '2017-04-18T01:18:22.450Z',
              'role': 'pro',
              'text': 'Necessitatibus unde ut quia similique voluptates.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3965',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ryann',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/markretzloff/128.jpg',
                'lastName': 'Johnston',
                'id': 'id_user_411'
              }
            },
            'con': {
              'owner': 'id_user_404',
              'posted': '2017-04-13T06:22:02.033Z',
              'role': 'con',
              'text': 'Architecto et accusamus culpa quasi.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_3984',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Angel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ninjad3m0/128.jpg',
                'lastName': 'Kulas',
                'id': 'id_user_404'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_243',
              'posted': '2017-04-14T17:37:46.908Z',
              'role': 'pro',
              'text': 'Quibusdam rerum qui eum.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_3979',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kristoffer',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/missaaamy/128.jpg',
                'lastName': 'Hirthe',
                'id': 'id_user_243'
              }
            },
            'con': {
              'owner': 'id_user_510',
              'posted': '2017-04-05T14:43:09.507Z',
              'role': 'con',
              'text': 'Nesciunt eos nisi id.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_3972',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Miles',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kurafire/128.jpg',
                'lastName': 'Zemlak',
                'id': 'id_user_510'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_488',
              'posted': '2017-04-06T19:30:05.523Z',
              'role': 'pro',
              'text': 'Consequatur et sed nam.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_3969',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mckenzie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/stefanozoffoli/128.jpg',
                'lastName': 'Feest',
                'id': 'id_user_488'
              }
            }, 'con': null
          },
          'id_district_104': { 'pro': null, 'con': null },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_327',
              'posted': '2017-04-06T07:46:35.147Z',
              'role': 'pro',
              'text': 'Iure totam qui qui.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_3976',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Rebekah',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tomas_janousek/128.jpg',
                'lastName': 'Blanda',
                'id': 'id_user_327'
              }
            },
            'con': {
              'owner': 'id_user_399',
              'posted': '2017-04-06T16:29:57.481Z',
              'role': 'con',
              'text': 'Nihil porro et eveniet officiis deleniti recusandae earum laudantium.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_4007',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alexa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bartoszdawydzik/128.jpg',
                'lastName': 'Flatley',
                'id': 'id_user_399'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_170',
              'posted': '2017-04-13T02:49:49.144Z',
              'role': 'pro',
              'text': 'Non laboriosam corporis voluptatum et dolor doloremque aut distinctio ut.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_3967',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Adell',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kerihenare/128.jpg',
                'lastName': 'Rau',
                'id': 'id_user_170'
              }
            },
            'con': {
              'owner': 'id_user_377',
              'posted': '2017-04-08T14:21:43.152Z',
              'role': 'con',
              'text': 'Voluptas blanditiis repellat quia a voluptatibus.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_3998',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Betty',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ahmetsulek/128.jpg',
                'lastName': 'Deckow',
                'id': 'id_user_377'
              }
            }
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_146',
              'posted': '2017-04-05T15:55:03.887Z',
              'role': 'pro',
              'text': 'Dolores quasi aliquid facere cum saepe a voluptas quae et.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_3975',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Katheryn',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tur8le/128.jpg',
                'lastName': 'Hammes',
                'id': 'id_user_146'
              }
            }, 'con': null
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_345',
              'posted': '2017-04-12T03:37:50.349Z',
              'role': 'pro',
              'text': 'Et quasi est alias consequatur ad ullam aut voluptas est.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_3981',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Adelbert',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gusoto/128.jpg',
                'lastName': 'Jerde',
                'id': 'id_user_345'
              }
            },
            'con': {
              'owner': 'id_user_254',
              'posted': '2017-04-10T04:41:37.104Z',
              'role': 'con',
              'text': 'Illo quos ut sequi nostrum sequi consectetur.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_3974',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Shyanne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kurtinc/128.jpg',
                'lastName': 'Robel',
                'id': 'id_user_254'
              }
            }
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_332',
              'posted': '2017-04-15T02:13:34.434Z',
              'role': 'con',
              'text': 'Est et ipsam.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_3970',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lacey',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rangafangs/128.jpg',
                'lastName': 'Hills',
                'id': 'id_user_332'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_441',
              'posted': '2017-04-07T14:03:05.411Z',
              'role': 'pro',
              'text': 'Minima ab dolorum libero tempore omnis.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_4004',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Damion',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/chrisslowik/128.jpg',
                'lastName': 'McGlynn',
                'id': 'id_user_441'
              }
            },
            'con': {
              'owner': 'id_user_281',
              'posted': '2017-04-17T01:58:48.478Z',
              'role': 'con',
              'text': 'Eaque quasi qui tempora voluptate corporis aut aspernatur ut est.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_3986',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ethel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andrewabogado/128.jpg',
                'lastName': 'Witting',
                'id': 'id_user_281'
              }
            }
          }
        }
      }
    },
    'id_item_4009': {
      'text': 'Voluptas quasi repudiandae fugiat. Saepe asperiores qui temporibus error consequatur. Rerum fugiat aperiam. Cupiditate a accusamus qui iste consequatur.',
      'itemNumber': 49,
      'total': { 'votes': { 'yes': 38, 'no': 36 }, 'comments': { 'pro': 19, 'con': 13, 'neutral': 10 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 7, 'no': 3 },
          'comments': { 'pro': 3, 'con': 1, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 3 } },
        'id_district_103': { 'votes': { 'yes': 3, 'no': 0 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 1, 'no': 5 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 2 } },
        'id_district_105': { 'votes': { 'yes': 3, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 2, 'no': 6 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 5, 'no': 5 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 4, 'con': 5, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 4, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_170',
          'posted': '2017-04-05T22:29:58.684Z',
          'role': 'pro',
          'text': 'Laboriosam architecto expedita.',
          'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
          'id': 'id_comment_4110',
          'votes': { 'up': 2, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' } },
            'firstName': 'Adell',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kerihenare/128.jpg',
            'lastName': 'Rau',
            'id': 'id_user_170'
          }
        },
        'con': {
          'owner': 'id_user_153',
          'posted': '2017-04-09T00:08:26.419Z',
          'role': 'con',
          'text': 'Quaerat quas necessitatibus.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_4108',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Theodora',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buddhasource/128.jpg',
            'lastName': 'Harvey',
            'id': 'id_user_153'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_309',
              'posted': '2017-04-17T20:10:51.262Z',
              'role': 'pro',
              'text': 'Non qui est eum consequatur consequatur.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_4090',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Payton',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cofla/128.jpg',
                'lastName': 'Willms',
                'id': 'id_user_309'
              }
            },
            'con': {
              'owner': 'id_user_305',
              'posted': '2017-04-12T12:41:21.797Z',
              'role': 'con',
              'text': 'Et hic doloribus cumque.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_4099',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Miracle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/a_harris88/128.jpg',
                'lastName': 'Stamm',
                'id': 'id_user_305'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_289',
              'posted': '2017-04-12T05:03:54.935Z',
              'role': 'pro',
              'text': 'Molestiae perspiciatis ad vero explicabo dolor.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_4087',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Stevie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/elbuscainfo/128.jpg',
                'lastName': 'Kovacek',
                'id': 'id_user_289'
              }
            },
            'con': {
              'owner': 'id_user_212',
              'posted': '2017-04-05T07:20:21.283Z',
              'role': 'con',
              'text': 'Harum unde placeat sapiente deserunt aut dolores non inventore.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_4104',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Sterling',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/imomenui/128.jpg',
                'lastName': 'Koepp',
                'id': 'id_user_212'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_344',
              'posted': '2017-04-05T13:44:05.070Z',
              'role': 'pro',
              'text': 'Dolor eos magnam quisquam quidem nobis.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_4105',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Haley',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/iamjdeleon/128.jpg',
                'lastName': 'Romaguera',
                'id': 'id_user_344'
              }
            }, 'con': null
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_390',
              'posted': '2017-04-08T20:19:00.913Z',
              'role': 'pro',
              'text': 'Distinctio a omnis et rem velit deleniti laudantium quod.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_4086',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alejandrin',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sachingawas/128.jpg',
                'lastName': 'Quigley',
                'id': 'id_user_390'
              }
            },
            'con': {
              'owner': 'id_user_153',
              'posted': '2017-04-10T05:13:27.444Z',
              'role': 'con',
              'text': 'Odit omnis corrupti fugiat quis aut cum perferendis magni et.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_4120',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Theodora',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buddhasource/128.jpg',
                'lastName': 'Harvey',
                'id': 'id_user_153'
              }
            }
          },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_170',
              'posted': '2017-04-05T22:29:58.684Z',
              'role': 'pro',
              'text': 'Laboriosam architecto expedita.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_4110',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Adell',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kerihenare/128.jpg',
                'lastName': 'Rau',
                'id': 'id_user_170'
              }
            },
            'con': {
              'owner': 'id_user_122',
              'posted': '2017-04-15T09:52:29.151Z',
              'role': 'con',
              'text': 'Eaque distinctio hic reiciendis.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_4091',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Aniyah',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andresdjasso/128.jpg',
                'lastName': 'Dickinson',
                'id': 'id_user_122'
              }
            }
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_415',
              'posted': '2017-04-13T01:53:14.211Z',
              'role': 'pro',
              'text': 'Et saepe est quasi hic nostrum id esse.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_4114',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Bethany',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gonzalorobaina/128.jpg',
                'lastName': 'Watsica',
                'id': 'id_user_415'
              }
            }, 'con': null
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_235',
              'posted': '2017-04-10T22:48:07.188Z',
              'role': 'pro',
              'text': 'Quis similique non nemo accusantium nisi corporis eum.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_4118',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Janelle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rez___a/128.jpg',
                'lastName': 'Harber',
                'id': 'id_user_235'
              }
            },
            'con': {
              'owner': 'id_user_254',
              'posted': '2017-04-06T09:57:40.551Z',
              'role': 'con',
              'text': 'Delectus at autem amet nemo et.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_4097',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Shyanne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kurtinc/128.jpg',
                'lastName': 'Robel',
                'id': 'id_user_254'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_458',
              'posted': '2017-04-15T18:11:06.677Z',
              'role': 'pro',
              'text': 'Sunt architecto voluptates saepe magnam.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_4094',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Humberto',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/helderleal/128.jpg',
                'lastName': 'Fay',
                'id': 'id_user_458'
              }
            },
            'con': {
              'owner': 'id_user_357',
              'posted': '2017-04-11T21:28:48.389Z',
              'role': 'con',
              'text': 'Qui suscipit quo non non aut enim et.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_4101',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Clemmie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/exentrich/128.jpg',
                'lastName': 'Prosacco',
                'id': 'id_user_357'
              }
            }
          },
          'id_district_110': { 'pro': null, 'con': null }
        }
      }
    },
    'id_item_4126': {
      'text': 'Animi rerum occaecati quasi eos. Ex sed esse ea qui repudiandae expedita. Vel minima nemo reiciendis mollitia et.',
      'itemNumber': 50,
      'total': { 'votes': { 'yes': 32, 'no': 26 }, 'comments': { 'pro': 13, 'con': 14, 'neutral': 10 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 3, 'no': 1 },
          'comments': { 'pro': 0, 'con': 3, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 1, 'con': 3, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 4, 'no': 0 }, 'comments': { 'pro': 4, 'con': 1, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 3, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
        'id_district_105': { 'votes': { 'yes': 6, 'no': 4 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
        'id_district_107': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 1 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 2, 'no': 5 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 2 } },
        'id_district_110': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_485',
          'posted': '2017-04-15T18:44:00.567Z',
          'role': 'pro',
          'text': 'Quod veritatis incidunt rerum.',
          'id': 'id_comment_4207',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'firstName': 'Pietro',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alxleroydeval/128.jpg',
            'lastName': 'Parker',
            'id': 'id_user_485'
          }
        },
        'con': {
          'owner': 'id_user_457',
          'posted': '2017-04-12T10:48:14.208Z',
          'role': 'con',
          'text': 'Velit quos repellat eos est eos unde.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_4210',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Alessandro',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/caspergrl/128.jpg',
            'lastName': 'Zboncak',
            'id': 'id_user_457'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': null,
            'con': {
              'owner': 'id_user_428',
              'posted': '2017-04-16T01:22:58.040Z',
              'role': 'con',
              'text': 'Molestiae harum maiores dignissimos et rem.',
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
                'firstName': 'Josefa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/coreyweb/128.jpg',
                'lastName': 'Herman',
                'id': 'id_user_428'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_129',
              'posted': '2017-04-13T09:44:11.720Z',
              'role': 'pro',
              'text': 'Labore vero molestiae voluptatum similique soluta eius.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_4190',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Newton',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/andresdjasso/128.jpg',
                'lastName': 'Jacobs',
                'id': 'id_user_129'
              }
            },
            'con': {
              'owner': 'id_user_306',
              'posted': '2017-04-14T10:10:11.810Z',
              'role': 'con',
              'text': 'Quaerat dolorem incidunt recusandae.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_4186',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Nolan',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jmfsocial/128.jpg',
                'lastName': 'Renner',
                'id': 'id_user_306'
              }
            }
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_308',
              'posted': '2017-04-16T06:40:05.129Z',
              'role': 'pro',
              'text': 'Sequi in omnis at et quis.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_4220',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mafalda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sgaurav_baghel/128.jpg',
                'lastName': 'Beatty',
                'id': 'id_user_308'
              }
            },
            'con': {
              'owner': 'id_user_389',
              'posted': '2017-04-10T20:48:17.151Z',
              'role': 'con',
              'text': 'Qui ipsa voluptate et ea enim qui doloribus corrupti.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_4219',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Hulda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/grahamkennery/128.jpg',
                'lastName': 'Beatty',
                'id': 'id_user_389'
              }
            }
          },
          'id_district_104': { 'pro': null, 'con': null },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_509',
              'posted': '2017-04-17T21:45:21.460Z',
              'role': 'pro',
              'text': 'Rerum et aut aspernatur omnis consequuntur totam ut.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_4203',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Hayley',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/constantx/128.jpg',
                'lastName': 'Ondricka',
                'id': 'id_user_509'
              }
            },
            'con': {
              'owner': 'id_user_504',
              'posted': '2017-04-09T21:45:14.638Z',
              'role': 'con',
              'text': 'Illo libero dolore omnis sint vero.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_4216',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alford',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinclediere/128.jpg',
                'lastName': 'Hackett',
                'id': 'id_user_504'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_228',
              'posted': '2017-04-11T21:14:18.033Z',
              'role': 'pro',
              'text': 'Porro cumque aspernatur et officia id nihil.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_4188',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Bridgette',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/8d3k/128.jpg',
                'lastName': 'Gleichner',
                'id': 'id_user_228'
              }
            },
            'con': {
              'owner': 'id_user_393',
              'posted': '2017-04-15T05:22:17.856Z',
              'role': 'con',
              'text': 'Deleniti quis id excepturi eum a nulla ipsum consequatur est.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_4187',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josiane',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinclediere/128.jpg',
                'lastName': 'Gleason',
                'id': 'id_user_393'
              }
            }
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_347',
              'posted': '2017-04-18T17:13:07.206Z',
              'role': 'pro',
              'text': 'Porro dolores ut vel non.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_4192',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Misty',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/a_brixen/128.jpg',
                'lastName': 'Cremin',
                'id': 'id_user_347'
              }
            },
            'con': {
              'owner': 'id_user_249',
              'posted': '2017-04-16T23:01:26.524Z',
              'role': 'con',
              'text': 'Unde necessitatibus omnis officia numquam ab cum quia voluptatum in.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_4201',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lacey',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arishi_/128.jpg',
                'lastName': 'Moen',
                'id': 'id_user_249'
              }
            }
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_374',
              'posted': '2017-04-12T22:44:31.702Z',
              'role': 'pro',
              'text': 'Non quae corporis voluptas adipisci.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_4191',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Demetrius',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kennyadr/128.jpg',
                'lastName': 'Lindgren',
                'id': 'id_user_374'
              }
            },
            'con': {
              'owner': 'id_user_457',
              'posted': '2017-04-12T10:48:14.208Z',
              'role': 'con',
              'text': 'Velit quos repellat eos est eos unde.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_4210',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alessandro',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/caspergrl/128.jpg',
                'lastName': 'Zboncak',
                'id': 'id_user_457'
              }
            }
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_238',
              'posted': '2017-04-16T06:15:34.011Z',
              'role': 'con',
              'text': 'Aut ex non possimus quia eligendi.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_4208',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Russel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/mauriolg/128.jpg',
                'lastName': 'Koch',
                'id': 'id_user_238'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_282',
              'posted': '2017-04-10T17:19:00.240Z',
              'role': 'pro',
              'text': 'Occaecati non nihil animi architecto.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_4204',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Marilie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jedbridges/128.jpg',
                'lastName': 'Wisoky',
                'id': 'id_user_282'
              }
            },
            'con': {
              'owner': 'id_user_171',
              'posted': '2017-04-06T06:03:03.759Z',
              'role': 'con',
              'text': 'Maiores enim necessitatibus quia tempore quia adipisci delectus veritatis.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_4214',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Casey',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/carlosgavina/128.jpg',
                'lastName': 'Greenfelder',
                'id': 'id_user_171'
              }
            }
          }
        }
      }
    },
    'id_item_4222': {
      'text': 'Molestiae recusandae optio harum consequatur. Suscipit odit omnis dolore consequatur. Voluptas et voluptatem neque possimus ut deleniti. Optio quos ullam sapiente non id enim corporis impedit soluta. Et iure ducimus.',
      'itemNumber': 51,
      'total': { 'votes': { 'yes': 30, 'no': 33 }, 'comments': { 'pro': 4, 'con': 2, 'neutral': 0 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 7, 'no': 2 },
          'comments': { 'pro': 1, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 1, 'no': 7 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 1, 'no': 6 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 2, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 4, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_377',
          'posted': '2017-04-10T20:12:03.036Z',
          'role': 'pro',
          'text': 'Doloremque voluptas voluptas iure facere accusantium ut qui dolor.',
          'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
          'id': 'id_comment_4287',
          'votes': { 'up': 2, 'down': 2 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' } },
            'firstName': 'Betty',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ahmetsulek/128.jpg',
            'lastName': 'Deckow',
            'id': 'id_user_377'
          }
        },
        'con': {
          'owner': 'id_user_151',
          'posted': '2017-04-10T07:06:00.851Z',
          'role': 'con',
          'text': 'Voluptas vel quia labore nisi et fugiat.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_4291',
          'votes': { 'up': 1, 'down': 1 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Layne',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/doronmalki/128.jpg',
            'lastName': 'Abernathy',
            'id': 'id_user_151'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_305',
              'posted': '2017-04-16T10:35:19.004Z',
              'role': 'pro',
              'text': 'Voluptates illo necessitatibus sit ea.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_4288',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Miracle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/a_harris88/128.jpg',
                'lastName': 'Stamm',
                'id': 'id_user_305'
              }
            }, 'con': null
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_315',
              'posted': '2017-04-16T09:07:45.697Z',
              'role': 'pro',
              'text': 'Enim quos commodi unde voluptas beatae ut placeat aut laudantium.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_4289',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kiara',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinlayfield/128.jpg',
                'lastName': 'Kuhic',
                'id': 'id_user_315'
              }
            }, 'con': null
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_185',
              'posted': '2017-04-08T15:31:52.876Z',
              'role': 'pro',
              'text': 'Praesentium molestias ipsa.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_4286',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Reid',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/abelcabans/128.jpg',
                'lastName': 'Trantow',
                'id': 'id_user_185'
              }
            }, 'con': null
          },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_151',
              'posted': '2017-04-10T07:06:00.851Z',
              'role': 'con',
              'text': 'Voluptas vel quia labore nisi et fugiat.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_4291',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Layne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/doronmalki/128.jpg',
                'lastName': 'Abernathy',
                'id': 'id_user_151'
              }
            }
          },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_351',
              'posted': '2017-04-18T08:28:49.522Z',
              'role': 'con',
              'text': 'Facilis accusamus hic ut a ipsam qui quia quod.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_4290',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ruthie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/divya/128.jpg',
                'lastName': 'Lehner',
                'id': 'id_user_351'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_377',
              'posted': '2017-04-10T20:12:03.036Z',
              'role': 'pro',
              'text': 'Doloremque voluptas voluptas iure facere accusantium ut qui dolor.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_4287',
              'votes': { 'up': 2, 'down': 2 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Betty',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ahmetsulek/128.jpg',
                'lastName': 'Deckow',
                'id': 'id_user_377'
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
    'id_item_4292': {
      'text': 'Quia animi odio esse delectus. Neque velit beatae aut est nam corporis perspiciatis. Recusandae pariatur dolorem at dignissimos quasi dolore. Blanditiis dolor ut.',
      'itemNumber': 52,
      'total': { 'votes': { 'yes': 33, 'no': 28 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 5, 'no': 4 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 4, 'no': 7 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 1, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 5, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
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
    'id_item_512': {
      'text': 'Eos sed sit velit doloribus consequatur. Dolores ea sunt delectus architecto qui. Dicta aut aliquam dolor et nihil expedita enim. Quo ut ullam qui laboriosam voluptas velit nemo.',
      'itemNumber': 1,
      'total': { 'votes': { 'yes': 39, 'no': 24 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 3 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 1, 'no': 0 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 8, 'no': 3 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 5, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 9, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': null,
        'con': {
          'owner': 'id_user_125',
          'posted': '2017-04-10T03:53:30.380Z',
          'role': 'con',
          'text': 'Incidunt consequatur soluta expedita.',
          'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
          'id': 'id_comment_573',
          'votes': { 'up': 2, 'down': 1 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' } },
            'firstName': 'Raul',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/waghner/128.jpg',
            'lastName': 'Heidenreich',
            'id': 'id_user_125'
          }
        },
        'byDistrict': {
          'id_district_101': { 'pro': null, 'con': null },
          'id_district_102': { 'pro': null, 'con': null },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': { 'pro': null, 'con': null },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_125',
              'posted': '2017-04-10T03:53:30.380Z',
              'role': 'con',
              'text': 'Incidunt consequatur soluta expedita.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_573',
              'votes': { 'up': 2, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Raul',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/waghner/128.jpg',
                'lastName': 'Heidenreich',
                'id': 'id_user_125'
              }
            }
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': { 'pro': null, 'con': null },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': { 'pro': null, 'con': null }
        }
      }
    },
    'id_item_576': {
      'text': 'Ad praesentium veniam esse amet. Delectus voluptatum veniam laborum. Ut ut dolores et repudiandae laborum. Sed vel dolores ut quia explicabo. Quaerat sunt qui est qui corporis quidem. Voluptates facere rerum et provident.',
      'itemNumber': 2,
      'total': { 'votes': { 'yes': 6, 'no': 5 }, 'comments': { 'pro': 9, 'con': 13, 'neutral': 11 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 1, 'no': 0 },
          'comments': { 'pro': 1, 'con': 1, 'neutral': 2 }
        },
        'id_district_102': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 2 } },
        'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 2 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 1, 'no': 2 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 2, 'con': 4, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_126',
          'posted': '2017-04-16T23:28:23.618Z',
          'role': 'pro',
          'text': 'Reprehenderit aliquid et esse libero exercitationem aut tempore.',
          'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
          'id': 'id_comment_608',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' } },
            'firstName': 'Anastacio',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ZacharyZorbas/128.jpg',
            'lastName': 'Deckow',
            'id': 'id_user_126'
          }
        },
        'con': {
          'owner': 'id_user_236',
          'posted': '2017-04-17T00:54:36.751Z',
          'role': 'con',
          'text': 'Ad voluptates est quia velit fugit odio.',
          'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
          'id': 'id_comment_592',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' } },
            'firstName': 'Melvin',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/justinrhee/128.jpg',
            'lastName': 'Fay',
            'id': 'id_user_236'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_182',
              'posted': '2017-04-10T20:51:53.331Z',
              'role': 'pro',
              'text': 'Repellat eligendi eligendi harum itaque.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_601',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Florencio',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sbtransparent/128.jpg',
                'lastName': 'Marquardt',
                'id': 'id_user_182'
              }
            },
            'con': {
              'owner': 'id_user_237',
              'posted': '2017-04-14T08:16:58.854Z',
              'role': 'con',
              'text': 'Vel vero voluptatum reprehenderit dolorem qui et et magni asperiores.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_617',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Stanley',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/newbrushes/128.jpg',
                'lastName': 'Rohan',
                'id': 'id_user_237'
              }
            }
          },
          'id_district_102': {
            'pro': null,
            'con': {
              'owner': 'id_user_164',
              'posted': '2017-04-11T21:12:38.825Z',
              'role': 'con',
              'text': 'Ad at voluptatem non veritatis quo hic iste.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_605',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Tessie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/txcx/128.jpg',
                'lastName': 'Schimmel',
                'id': 'id_user_164'
              }
            }
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_240',
              'posted': '2017-04-13T23:03:58.176Z',
              'role': 'pro',
              'text': 'Eaque inventore corrupti est et aut et est aperiam sed.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_613',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Aidan',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/madshensel/128.jpg',
                'lastName': 'Carroll',
                'id': 'id_user_240'
              }
            },
            'con': {
              'owner': 'id_user_444',
              'posted': '2017-04-17T19:54:17.050Z',
              'role': 'con',
              'text': 'Rem minus debitis repudiandae autem in saepe tenetur.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_607',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kole',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jghyllebert/128.jpg',
                'lastName': 'McCullough',
                'id': 'id_user_444'
              }
            }
          },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_165',
              'posted': '2017-04-15T06:55:21.545Z',
              'role': 'con',
              'text': 'Laborum modi eius.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_604',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Odie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/angelcolberg/128.jpg',
                'lastName': 'Muller',
                'id': 'id_user_165'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_126',
              'posted': '2017-04-16T23:28:23.618Z',
              'role': 'pro',
              'text': 'Reprehenderit aliquid et esse libero exercitationem aut tempore.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_608',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Anastacio',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ZacharyZorbas/128.jpg',
                'lastName': 'Deckow',
                'id': 'id_user_126'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': null,
            'con': {
              'owner': 'id_user_236',
              'posted': '2017-04-17T00:54:36.751Z',
              'role': 'con',
              'text': 'Ad voluptates est quia velit fugit odio.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_592',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Melvin',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/justinrhee/128.jpg',
                'lastName': 'Fay',
                'id': 'id_user_236'
              }
            }
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_313',
              'posted': '2017-04-06T00:54:17.206Z',
              'role': 'pro',
              'text': 'Praesentium et vel animi dicta est error facere.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_591',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Shyanne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/klimmka/128.jpg',
                'lastName': 'Kohler',
                'id': 'id_user_313'
              }
            },
            'con': {
              'owner': 'id_user_215',
              'posted': '2017-04-17T07:59:11.634Z',
              'role': 'con',
              'text': 'Est libero veritatis vitae aperiam qui quisquam quo nihil.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_610',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cyrus',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/karalek/128.jpg',
                'lastName': 'Jacobson',
                'id': 'id_user_215'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_176',
              'posted': '2017-04-16T13:54:54.891Z',
              'role': 'pro',
              'text': 'Dignissimos omnis dolorem qui in consequatur occaecati in.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_600',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Keven',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/malykhinv/128.jpg',
                'lastName': 'Bradtke',
                'id': 'id_user_176'
              }
            },
            'con': {
              'owner': 'id_user_442',
              'posted': '2017-04-11T18:02:39.532Z',
              'role': 'con',
              'text': 'Sint sed architecto quia dolorem inventore quo.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_618',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Johanna',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/yalozhkin/128.jpg',
                'lastName': 'Jenkins',
                'id': 'id_user_442'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_321',
              'posted': '2017-04-17T06:29:48.691Z',
              'role': 'pro',
              'text': 'Quibusdam vitae excepturi facere eligendi repellat.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_616',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Christian',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/coreyhaggard/128.jpg',
                'lastName': 'Brekke',
                'id': 'id_user_321'
              }
            },
            'con': {
              'owner': 'id_user_474',
              'posted': '2017-04-12T21:34:17.500Z',
              'role': 'con',
              'text': 'Rerum illo reiciendis assumenda.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_593',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lucious',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/johnsmithagency/128.jpg',
                'lastName': 'Treutel',
                'id': 'id_user_474'
              }
            }
          }
        }
      }
    },
    'id_item_619': {
      'text': 'Corporis dolor quidem voluptate ea aliquid. Voluptatem eos ea qui consectetur. Voluptatum incidunt veniam. Et eveniet commodi maxime incidunt fugit minima. Sint qui impedit ab repellat magnam cupiditate assumenda possimus distinctio.',
      'itemNumber': 3,
      'total': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 8, 'con': 8, 'neutral': 10 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 0, 'no': 0 },
          'comments': { 'pro': 0, 'con': 1, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 2 } },
        'id_district_108': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 2 } },
        'id_district_109': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 3, 'con': 2, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 2 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_297',
          'posted': '2017-04-05T00:00:56.496Z',
          'role': 'pro',
          'text': 'Sed laboriosam sit facilis dignissimos odit.',
          'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
          'id': 'id_comment_630',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' } },
            'firstName': 'Adella',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/themikenagle/128.jpg',
            'lastName': 'Klein',
            'id': 'id_user_297'
          }
        },
        'con': {
          'owner': 'id_user_216',
          'posted': '2017-04-16T00:18:03.033Z',
          'role': 'con',
          'text': 'Labore tenetur dolore libero ea aspernatur quaerat blanditiis quae.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_623',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Joanne',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jagan123/128.jpg',
            'lastName': 'Balistreri',
            'id': 'id_user_216'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': null,
            'con': {
              'owner': 'id_user_143',
              'posted': '2017-04-10T03:10:41.261Z',
              'role': 'con',
              'text': 'Officia et sequi expedita minus id voluptatem sit.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_636',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Gerson',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fabbianz/128.jpg',
                'lastName': 'Metz',
                'id': 'id_user_143'
              }
            }
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_164',
              'posted': '2017-04-08T08:55:46.735Z',
              'role': 'pro',
              'text': 'Optio omnis sit expedita quasi et.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_635',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Tessie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/txcx/128.jpg',
                'lastName': 'Schimmel',
                'id': 'id_user_164'
              }
            }, 'con': null
          },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_297',
              'posted': '2017-04-05T00:00:56.496Z',
              'role': 'pro',
              'text': 'Sed laboriosam sit facilis dignissimos odit.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_630',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Adella',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/themikenagle/128.jpg',
                'lastName': 'Klein',
                'id': 'id_user_297'
              }
            }, 'con': null
          },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_216',
              'posted': '2017-04-16T00:18:03.033Z',
              'role': 'con',
              'text': 'Labore tenetur dolore libero ea aspernatur quaerat blanditiis quae.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_623',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Joanne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jagan123/128.jpg',
                'lastName': 'Balistreri',
                'id': 'id_user_216'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_242',
              'posted': '2017-04-10T12:46:42.457Z',
              'role': 'pro',
              'text': 'Qui animi nesciunt quas suscipit quaerat quia ut.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_638',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Nels',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/_yardenoon/128.jpg',
                'lastName': 'Jacobson',
                'id': 'id_user_242'
              }
            },
            'con': {
              'owner': 'id_user_448',
              'posted': '2017-04-09T18:31:54.254Z',
              'role': 'con',
              'text': 'Repellat maxime ullam nam nihil quo.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_640',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Arvilla',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gkaam/128.jpg',
                'lastName': 'Hand',
                'id': 'id_user_448'
              }
            }
          },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_115',
              'posted': '2017-04-14T20:58:40.934Z',
              'role': 'con',
              'text': 'Molestiae dolor illo molestiae.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_628',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Rae',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/okandungel/128.jpg',
                'lastName': 'Ziemann',
                'id': 'id_user_115'
              }
            }
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_209',
              'posted': '2017-04-12T07:11:18.990Z',
              'role': 'pro',
              'text': 'Voluptatem soluta atque libero corrupti quod sint.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_622',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alessandro',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/aluisio_azevedo/128.jpg',
                'lastName': 'Schoen',
                'id': 'id_user_209'
              }
            }, 'con': null
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_230',
              'posted': '2017-04-08T19:24:08.538Z',
              'role': 'pro',
              'text': 'Voluptatum doloremque unde.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_631',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Tara',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/panchajanyag/128.jpg',
                'lastName': 'Rosenbaum',
                'id': 'id_user_230'
              }
            },
            'con': {
              'owner': 'id_user_206',
              'posted': '2017-04-16T08:28:13.262Z',
              'role': 'con',
              'text': 'Eos temporibus maxime sed aperiam.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_627',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jedidiah',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/dawidwu/128.jpg',
                'lastName': 'Weimann',
                'id': 'id_user_206'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_441',
              'posted': '2017-04-17T17:41:19.469Z',
              'role': 'pro',
              'text': 'Harum nihil similique facilis.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_633',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Damion',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/chrisslowik/128.jpg',
                'lastName': 'McGlynn',
                'id': 'id_user_441'
              }
            },
            'con': {
              'owner': 'id_user_142',
              'posted': '2017-04-11T15:59:10.873Z',
              'role': 'con',
              'text': 'Voluptatem id dolore sed rerum quas quidem dolor.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_646',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Vladimir',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/okseanjay/128.jpg',
                'lastName': 'Wuckert',
                'id': 'id_user_142'
              }
            }
          }
        }
      }
    },
    'id_item_647': {
      'text': 'Quae ipsam suscipit ad voluptates quia nemo. Eos consectetur aut alias aut qui quo. Consectetur voluptates voluptatem.',
      'itemNumber': 4,
      'total': { 'votes': { 'yes': 56, 'no': 44 }, 'comments': { 'pro': 12, 'con': 5, 'neutral': 6 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 5, 'no': 3 },
          'comments': { 'pro': 1, 'con': 0, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 12, 'no': 5 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
        'id_district_105': { 'votes': { 'yes': 6, 'no': 8 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 2, 'no': 2 }, 'comments': { 'pro': 0, 'con': 3, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 2, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 3, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 7, 'no': 6 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 8, 'no': 3 }, 'comments': { 'pro': 3, 'con': 0, 'neutral': 2 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_160',
          'posted': '2017-04-13T12:45:23.867Z',
          'role': 'pro',
          'text': 'Quam aut omnis distinctio est ducimus fugit nostrum error et.',
          'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
          'id': 'id_comment_762',
          'votes': { 'up': 2, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' } },
            'firstName': 'Alexa',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nellleo/128.jpg',
            'lastName': 'Becker',
            'id': 'id_user_160'
          }
        },
        'con': {
          'owner': 'id_user_222',
          'posted': '2017-04-13T09:26:50.771Z',
          'role': 'con',
          'text': 'Quae dignissimos eos reprehenderit doloribus nihil labore consequatur reiciendis.',
          'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
          'id': 'id_comment_752',
          'votes': { 'up': 1, 'down': 1 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' } },
            'firstName': 'Letitia',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/stevedesigner/128.jpg',
            'lastName': 'Ebert',
            'id': 'id_user_222'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_172',
              'posted': '2017-04-09T23:08:41.911Z',
              'role': 'pro',
              'text': 'Ex exercitationem assumenda dolorem alias consequuntur aut eum doloribus.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_755',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Clara',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/low_res/128.jpg',
                'lastName': 'Tillman',
                'id': 'id_user_172'
              }
            }, 'con': null
          },
          'id_district_102': { 'pro': null, 'con': null },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_308',
              'posted': '2017-04-13T08:14:15.257Z',
              'role': 'pro',
              'text': 'Quisquam ut molestias repudiandae quibusdam quod et hic minus.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_753',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mafalda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sgaurav_baghel/128.jpg',
                'lastName': 'Beatty',
                'id': 'id_user_308'
              }
            },
            'con': {
              'owner': 'id_user_434',
              'posted': '2017-04-11T07:11:00.116Z',
              'role': 'con',
              'text': 'Et placeat consectetur accusamus doloremque ut.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_759',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Zachery',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alevizio/128.jpg',
                'lastName': 'Raynor',
                'id': 'id_user_434'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_250',
              'posted': '2017-04-11T04:55:16.866Z',
              'role': 'pro',
              'text': 'Fuga sit dolores aliquam rerum.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_765',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Curtis',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/xtopherpaul/128.jpg',
                'lastName': 'Baumbach',
                'id': 'id_user_250'
              }
            },
            'con': {
              'owner': 'id_user_506',
              'posted': '2017-04-16T19:51:07.424Z',
              'role': 'con',
              'text': 'Incidunt et sequi quia amet in.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_748',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Horacio',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/vigobronx/128.jpg',
                'lastName': 'Ebert',
                'id': 'id_user_506'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_167',
              'posted': '2017-04-11T02:20:48.282Z',
              'role': 'pro',
              'text': 'Reprehenderit dolorem quidem molestias occaecati et molestias quia.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_767',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Noemi',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/canapud/128.jpg',
                'lastName': 'Ruecker',
                'id': 'id_user_167'
              }
            }, 'con': null
          },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_222',
              'posted': '2017-04-13T09:26:50.771Z',
              'role': 'con',
              'text': 'Quae dignissimos eos reprehenderit doloribus nihil labore consequatur reiciendis.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_752',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Letitia',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/stevedesigner/128.jpg',
                'lastName': 'Ebert',
                'id': 'id_user_222'
              }
            }
          },
          'id_district_107': { 'pro': null, 'con': null },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_140',
              'posted': '2017-04-13T06:04:49.906Z',
              'role': 'pro',
              'text': 'Eveniet ut ut voluptatem consequatur animi qui aliquid placeat.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_750',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Logan',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/romanbulah/128.jpg',
                'lastName': 'Emard',
                'id': 'id_user_140'
              }
            }, 'con': null
          },
          'id_district_109': { 'pro': null, 'con': null },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_160',
              'posted': '2017-04-13T12:45:23.867Z',
              'role': 'pro',
              'text': 'Quam aut omnis distinctio est ducimus fugit nostrum error et.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_762',
              'votes': { 'up': 2, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alexa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nellleo/128.jpg',
                'lastName': 'Becker',
                'id': 'id_user_160'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_769': {
      'text': 'Omnis ea ad quos voluptatibus magnam eligendi. Officiis distinctio temporibus officia. Id quisquam voluptatem tempora reiciendis natus. Unde ut optio mollitia sint laudantium impedit perspiciatis et. Recusandae aperiam vitae ratione architecto placeat. Impedit sit voluptatem eveniet incidunt.',
      'itemNumber': 5,
      'total': { 'votes': { 'yes': 8, 'no': 11 }, 'comments': { 'pro': 8, 'con': 7, 'neutral': 3 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 0, 'no': 3 },
          'comments': { 'pro': 1, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_104': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 2, 'con': 0, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 3, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_282',
          'posted': '2017-04-17T01:31:15.435Z',
          'role': 'pro',
          'text': 'Tempore qui laudantium autem tenetur inventore minima velit harum nesciunt.',
          'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
          'id': 'id_comment_795',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' } },
            'firstName': 'Marilie',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jedbridges/128.jpg',
            'lastName': 'Wisoky',
            'id': 'id_user_282'
          }
        },
        'con': {
          'owner': 'id_user_342',
          'posted': '2017-04-13T13:30:49.051Z',
          'role': 'con',
          'text': 'Et et dolor necessitatibus dolorem non dignissimos quos iure consequatur.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_791',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Mabel',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/martip07/128.jpg',
            'lastName': 'Hayes',
            'id': 'id_user_342'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_244',
              'posted': '2017-04-07T11:59:49.993Z',
              'role': 'pro',
              'text': 'In architecto necessitatibus facilis.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_800',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Maureen',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gofrasdesign/128.jpg',
                'lastName': 'Abernathy',
                'id': 'id_user_244'
              }
            }, 'con': null
          },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_410',
              'posted': '2017-04-17T05:00:22.684Z',
              'role': 'pro',
              'text': 'Voluptatem deleniti hic.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_801',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lilla',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/horaciobella/128.jpg',
                'lastName': 'Stracke',
                'id': 'id_user_410'
              }
            }, 'con': null
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_342',
              'posted': '2017-04-13T13:30:49.051Z',
              'role': 'con',
              'text': 'Et et dolor necessitatibus dolorem non dignissimos quos iure consequatur.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_791',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Mabel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/martip07/128.jpg',
                'lastName': 'Hayes',
                'id': 'id_user_342'
              }
            }
          },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_504',
              'posted': '2017-04-16T14:21:51.706Z',
              'role': 'con',
              'text': 'Rem maiores ea laboriosam perspiciatis.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_794',
              'votes': { 'up': 0, 'down': 2 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alford',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinclediere/128.jpg',
                'lastName': 'Hackett',
                'id': 'id_user_504'
              }
            }
          },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_293',
              'posted': '2017-04-17T06:50:47.810Z',
              'role': 'con',
              'text': 'Voluptates eos sed sunt distinctio nemo.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_797',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Allene',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/low_res/128.jpg',
                'lastName': 'Walsh',
                'id': 'id_user_293'
              }
            }
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_401',
              'posted': '2017-04-08T06:51:34.007Z',
              'role': 'pro',
              'text': 'Amet fuga libero.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_796',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Gaetano',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/thierrymeier_/128.jpg',
                'lastName': 'Carroll',
                'id': 'id_user_401'
              }
            }, 'con': null
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_406',
              'posted': '2017-04-05T22:52:56.754Z',
              'role': 'pro',
              'text': 'Rerum consequatur fugiat expedita quisquam quaerat.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_792',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Meta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kevka/128.jpg',
                'lastName': 'Klein',
                'id': 'id_user_406'
              }
            }, 'con': null
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_458',
              'posted': '2017-04-18T02:42:19.636Z',
              'role': 'con',
              'text': 'Voluptatem aut ullam et.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_788',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Humberto',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/helderleal/128.jpg',
                'lastName': 'Fay',
                'id': 'id_user_458'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_282',
              'posted': '2017-04-17T01:31:15.435Z',
              'role': 'pro',
              'text': 'Tempore qui laudantium autem tenetur inventore minima velit harum nesciunt.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_795',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Marilie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jedbridges/128.jpg',
                'lastName': 'Wisoky',
                'id': 'id_user_282'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_804': {
      'text': 'Omnis eligendi suscipit odit. Quo dolores rerum ut non. Laborum est nemo ab. Et beatae laborum distinctio rerum. Quaerat placeat qui quaerat inventore. Ratione voluptatem nihil repellendus et consectetur.',
      'itemNumber': 6,
      'total': { 'votes': { 'yes': 22, 'no': 15 }, 'comments': { 'pro': 11, 'con': 13, 'neutral': 5 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 2, 'no': 0 },
          'comments': { 'pro': 1, 'con': 1, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 4, 'no': 2 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 0, 'no': 3 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 3, 'con': 4, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_153',
          'posted': '2017-04-14T23:05:07.044Z',
          'role': 'pro',
          'text': 'Similique provident hic quibusdam.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_844',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Theodora',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buddhasource/128.jpg',
            'lastName': 'Harvey',
            'id': 'id_user_153'
          }
        },
        'con': {
          'owner': 'id_user_132',
          'posted': '2017-04-09T05:55:50.085Z',
          'role': 'con',
          'text': 'Natus magnam reiciendis odit explicabo reiciendis a enim.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_845',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Danial',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/maz/128.jpg',
            'lastName': 'Gutkowski',
            'id': 'id_user_132'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_414',
              'posted': '2017-04-11T11:37:31.416Z',
              'role': 'pro',
              'text': 'Rerum dolorem dolore voluptatem et quia.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_854',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Fredrick',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/diesellaws/128.jpg',
                'lastName': 'Cormier',
                'id': 'id_user_414'
              }
            },
            'con': {
              'owner': 'id_user_425',
              'posted': '2017-04-16T02:15:32.609Z',
              'role': 'con',
              'text': 'Aliquam atque in nulla vel earum nemo harum omnis.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_864',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ova',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rdbannon/128.jpg',
                'lastName': 'Waelchi',
                'id': 'id_user_425'
              }
            }
          },
          'id_district_102': {
            'pro': null,
            'con': {
              'owner': 'id_user_155',
              'posted': '2017-04-14T08:08:57.639Z',
              'role': 'con',
              'text': 'Provident excepturi officiis ut sed perspiciatis facere harum.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_856',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Ila',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/rikas/128.jpg',
                'lastName': 'Fadel',
                'id': 'id_user_155'
              }
            }
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_153',
              'posted': '2017-04-14T23:05:07.044Z',
              'role': 'pro',
              'text': 'Similique provident hic quibusdam.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_844',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Theodora',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buddhasource/128.jpg',
                'lastName': 'Harvey',
                'id': 'id_user_153'
              }
            },
            'con': {
              'owner': 'id_user_153',
              'posted': '2017-04-08T16:51:34.297Z',
              'role': 'con',
              'text': 'Et cumque odio magni velit fuga id similique voluptas ut.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_843',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Theodora',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buddhasource/128.jpg',
                'lastName': 'Harvey',
                'id': 'id_user_153'
              }
            }
          },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_490',
              'posted': '2017-04-06T20:52:45.058Z',
              'role': 'con',
              'text': 'Ratione sit nisi suscipit totam illum tenetur.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_859',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Myrtis',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alterchuca/128.jpg',
                'lastName': 'Purdy',
                'id': 'id_user_490'
              }
            }
          },
          'id_district_106': {
            'pro': {
              'owner': 'id_user_125',
              'posted': '2017-04-09T08:59:27.473Z',
              'role': 'pro',
              'text': 'Quo temporibus ratione ea repudiandae.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_861',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Raul',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/waghner/128.jpg',
                'lastName': 'Heidenreich',
                'id': 'id_user_125'
              }
            }, 'con': null
          },
          'id_district_107': {
            'pro': {
              'owner': 'id_user_359',
              'posted': '2017-04-15T03:28:47.934Z',
              'role': 'pro',
              'text': 'Ad quis voluptates hic non quibusdam.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_850',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josiah',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gabrielizalo/128.jpg',
                'lastName': 'Lemke',
                'id': 'id_user_359'
              }
            }, 'con': null
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_374',
              'posted': '2017-04-07T05:26:19.307Z',
              'role': 'pro',
              'text': 'Veniam quia et ut consectetur aut est.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_867',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Demetrius',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kennyadr/128.jpg',
                'lastName': 'Lindgren',
                'id': 'id_user_374'
              }
            },
            'con': {
              'owner': 'id_user_132',
              'posted': '2017-04-09T05:55:50.085Z',
              'role': 'con',
              'text': 'Natus magnam reiciendis odit explicabo reiciendis a enim.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_845',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Danial',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/maz/128.jpg',
                'lastName': 'Gutkowski',
                'id': 'id_user_132'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_454',
              'posted': '2017-04-15T01:51:37.570Z',
              'role': 'pro',
              'text': 'Ipsam deserunt eos aut perferendis.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_841',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Hunter',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/eitarafa/128.jpg',
                'lastName': 'Wolf',
                'id': 'id_user_454'
              }
            },
            'con': {
              'owner': 'id_user_112',
              'posted': '2017-04-16T08:09:01.034Z',
              'role': 'con',
              'text': 'Unde repudiandae non.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_848',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kathryne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/ruzinav/128.jpg',
                'lastName': 'Schinner',
                'id': 'id_user_112'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_282',
              'posted': '2017-04-09T02:52:33.364Z',
              'role': 'pro',
              'text': 'Nostrum fuga quia aut aut quia qui et officia.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_853',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Marilie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jedbridges/128.jpg',
                'lastName': 'Wisoky',
                'id': 'id_user_282'
              }
            },
            'con': {
              'owner': 'id_user_402',
              'posted': '2017-04-12T18:00:54.786Z',
              'role': 'con',
              'text': 'Sunt nihil fugiat ratione occaecati.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_860',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Hilario',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/daykiine/128.jpg',
                'lastName': 'Paucek',
                'id': 'id_user_402'
              }
            }
          }
        }
      }
    },
    'id_item_870': {
      'text': 'Tempora numquam tempore a illo. Eum sunt sint accusantium assumenda quo iure voluptas aspernatur corporis. Rerum sit iste a molestiae ratione libero repudiandae. Blanditiis minus perferendis explicabo ratione et id at. Illum voluptatem optio vitae est doloribus et voluptatem ipsa. Dicta repudiandae sint molestias et delectus veritatis quia fuga.',
      'itemNumber': 7,
      'total': { 'votes': { 'yes': 10, 'no': 7 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 2 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 1, 'no': 0 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 1 }
        },
        'id_district_102': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 1, 'no': 4 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_109': { 'votes': { 'yes': 2, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } }
      },
      'topComments': {
        'pro': null,
        'con': {
          'owner': 'Rsuvga6279gC9biAAB7ix6hr0sB3',
          'posted': '2017-04-20T02:46:49.465Z',
          'role': 'con',
          'text': 'Terrible idea.',
          'id': '-Ki8FJh4SXQ9JfHTOfFf',
          'votes': { 'up': 0, 'down': 0 },
          'author': { 'id': 'Rsuvga6279gC9biAAB7ix6hr0sB3' }
        },
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
          'id_district_110': {
            'pro': null,
            'con': {
              'owner': 'id_user_480',
              'posted': '2017-04-14T06:45:36.068Z',
              'role': 'con',
              'text': 'Ducimus itaque dignissimos voluptatum aut et error reprehenderit aperiam.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_888',
              'votes': { 'up': 1, 'down': 2 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Antonetta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/themrdave/128.jpg',
                'lastName': 'Dare',
                'id': 'id_user_480'
              }
            }
          }
        }
      }
    },
    'id_item_890': {
      'text': 'Ducimus laudantium earum animi nisi. Velit molestiae autem fugiat. Velit rem tempora sed quis cumque cumque consequuntur. Maiores nam cumque et nobis fuga et rerum.',
      'itemNumber': 8,
      'total': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 9, 'con': 12, 'neutral': 9 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 0, 'no': 0 },
          'comments': { 'pro': 1, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 3 } },
        'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 1, 'con': 4, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 3, 'con': 1, 'neutral': 2 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_444',
          'posted': '2017-04-07T21:02:43.545Z',
          'role': 'pro',
          'text': 'Officia enim architecto sint cum saepe rem.',
          'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
          'id': 'id_comment_901',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' } },
            'firstName': 'Kole',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jghyllebert/128.jpg',
            'lastName': 'McCullough',
            'id': 'id_user_444'
          }
        },
        'con': {
          'owner': 'id_user_114',
          'posted': '2017-04-07T20:17:47.675Z',
          'role': 'con',
          'text': 'Amet minus at totam autem ratione ut laborum eum.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_904',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Clare',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tobysaxon/128.jpg',
            'lastName': 'Abbott',
            'id': 'id_user_114'
          }
        },
        'byDistrict': {
          'id_district_101': {
            'pro': {
              'owner': 'id_user_309',
              'posted': '2017-04-09T14:02:32.040Z',
              'role': 'pro',
              'text': 'Et culpa recusandae quis ut et.',
              'userDistrict': { 'id': 'id_district_101', 'name': 'District 1', 'owner': 'id_doug' },
              'id': 'id_comment_902',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_101',
                    'name': 'District 1',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Payton',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cofla/128.jpg',
                'lastName': 'Willms',
                'id': 'id_user_309'
              }
            }, 'con': null
          },
          'id_district_102': { 'pro': null, 'con': null },
          'id_district_103': {
            'pro': {
              'owner': 'id_user_437',
              'posted': '2017-04-09T23:32:38.764Z',
              'role': 'pro',
              'text': 'Cupiditate error quia quia laboriosam ratione.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_911',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Simone',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/safrankov/128.jpg',
                'lastName': 'Hyatt',
                'id': 'id_user_437'
              }
            }, 'con': null
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_444',
              'posted': '2017-04-07T21:02:43.545Z',
              'role': 'pro',
              'text': 'Officia enim architecto sint cum saepe rem.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_901',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kole',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jghyllebert/128.jpg',
                'lastName': 'McCullough',
                'id': 'id_user_444'
              }
            },
            'con': {
              'owner': 'id_user_392',
              'posted': '2017-04-15T10:38:10.139Z',
              'role': 'con',
              'text': 'Omnis sit consequatur aperiam.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_895',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Wiley',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jeremymouton/128.jpg',
                'lastName': 'Reichert',
                'id': 'id_user_392'
              }
            }
          },
          'id_district_105': {
            'pro': null,
            'con': {
              'owner': 'id_user_504',
              'posted': '2017-04-17T22:14:45.307Z',
              'role': 'con',
              'text': 'Rerum est voluptatem cupiditate.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_910',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alford',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/robinclediere/128.jpg',
                'lastName': 'Hackett',
                'id': 'id_user_504'
              }
            }
          },
          'id_district_106': { 'pro': null, 'con': null },
          'id_district_107': {
            'pro': null,
            'con': {
              'owner': 'id_user_359',
              'posted': '2017-04-11T16:24:04.646Z',
              'role': 'con',
              'text': 'Error est quos assumenda error dolorum non beatae et eveniet.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_894',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Josiah',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/gabrielizalo/128.jpg',
                'lastName': 'Lemke',
                'id': 'id_user_359'
              }
            }
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_433',
              'posted': '2017-04-18T10:35:51.879Z',
              'role': 'pro',
              'text': 'Quia blanditiis quos.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_903',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Heloise',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nilshoenson/128.jpg',
                'lastName': 'Blanda',
                'id': 'id_user_433'
              }
            },
            'con': {
              'owner': 'id_user_114',
              'posted': '2017-04-07T20:17:47.675Z',
              'role': 'con',
              'text': 'Amet minus at totam autem ratione ut laborum eum.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_904',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Clare',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/tobysaxon/128.jpg',
                'lastName': 'Abbott',
                'id': 'id_user_114'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_312',
              'posted': '2017-04-10T21:48:06.687Z',
              'role': 'pro',
              'text': 'Tempora sunt laudantium.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_898',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Freeda',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/buzzusborne/128.jpg',
                'lastName': 'Hudson',
                'id': 'id_user_312'
              }
            },
            'con': {
              'owner': 'id_user_176',
              'posted': '2017-04-06T13:50:20.949Z',
              'role': 'con',
              'text': 'In doloremque sit tenetur vitae voluptatem quas.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_897',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Keven',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/malykhinv/128.jpg',
                'lastName': 'Bradtke',
                'id': 'id_user_176'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_282',
              'posted': '2017-04-09T07:43:23.498Z',
              'role': 'pro',
              'text': 'Modi cum ut.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_912',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Marilie',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jedbridges/128.jpg',
                'lastName': 'Wisoky',
                'id': 'id_user_282'
              }
            },
            'con': {
              'owner': 'id_user_190',
              'posted': '2017-04-18T04:57:06.341Z',
              'role': 'con',
              'text': 'Reprehenderit et voluptatum laborum earum.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_914',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Leopold',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/chacky14/128.jpg',
                'lastName': 'McGlynn',
                'id': 'id_user_190'
              }
            }
          }
        }
      }
    },
    'id_item_923': {
      'text': 'Mollitia odio est doloribus aut et. Eum enim optio vel rem ea culpa repellat omnis. Doloremque rerum incidunt molestias eos ipsam numquam maiores. Sint dolores nostrum suscipit repellat ratione. Culpa asperiores expedita qui.',
      'itemNumber': 9,
      'total': { 'votes': { 'yes': 13, 'no': 6 }, 'comments': { 'pro': 4, 'con': 5, 'neutral': 5 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 2, 'no': 1 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } },
        'id_district_103': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_105': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 0, 'neutral': 1 } },
        'id_district_106': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_107': { 'votes': { 'yes': 0, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_108': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 2, 'con': 1, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 1, 'no': 0 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_110': { 'votes': { 'yes': 1, 'no': 1 }, 'comments': { 'pro': 1, 'con': 0, 'neutral': 0 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_113',
          'posted': '2017-04-05T17:51:45.240Z',
          'role': 'pro',
          'text': 'Quaerat nemo alias incidunt illum.',
          'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
          'id': 'id_comment_952',
          'votes': { 'up': 0, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' } },
            'firstName': 'Emanuel',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fran_mchamy/128.jpg',
            'lastName': 'Jenkins',
            'id': 'id_user_113'
          }
        },
        'con': {
          'owner': 'id_user_162',
          'posted': '2017-04-10T02:36:18.601Z',
          'role': 'con',
          'text': 'Inventore repellendus illo.',
          'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
          'id': 'id_comment_956',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' } },
            'firstName': 'Yasmin',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fran_mchamy/128.jpg',
            'lastName': 'Franecki',
            'id': 'id_user_162'
          }
        },
        'byDistrict': {
          'id_district_101': { 'pro': null, 'con': null },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_449',
              'posted': '2017-04-16T19:38:50.971Z',
              'role': 'pro',
              'text': 'Aperiam est tempora.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_944',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Remington',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/sethlouey/128.jpg',
                'lastName': 'Zieme',
                'id': 'id_user_449'
              }
            }, 'con': null
          },
          'id_district_103': { 'pro': null, 'con': null },
          'id_district_104': {
            'pro': null,
            'con': {
              'owner': 'id_user_124',
              'posted': '2017-04-08T03:59:27.696Z',
              'role': 'con',
              'text': 'Molestias est doloremque praesentium in molestias soluta.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_948',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Electa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nwdsha/128.jpg',
                'lastName': 'Dickens',
                'id': 'id_user_124'
              }
            }
          },
          'id_district_105': { 'pro': null, 'con': null },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_170',
              'posted': '2017-04-16T12:43:40.485Z',
              'role': 'con',
              'text': 'Et sint sint similique voluptas est dignissimos velit incidunt aliquid.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_953',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Adell',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kerihenare/128.jpg',
                'lastName': 'Rau',
                'id': 'id_user_170'
              }
            }
          },
          'id_district_107': {
            'pro': null,
            'con': {
              'owner': 'id_user_236',
              'posted': '2017-04-17T14:32:50.754Z',
              'role': 'con',
              'text': 'Dolorem inventore officia perspiciatis ullam necessitatibus nobis qui.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_943',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Melvin',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/justinrhee/128.jpg',
                'lastName': 'Fay',
                'id': 'id_user_236'
              }
            }
          },
          'id_district_108': {
            'pro': {
              'owner': 'id_user_215',
              'posted': '2017-04-05T11:53:30.686Z',
              'role': 'pro',
              'text': 'Consectetur eum molestias accusamus ipsam quasi temporibus molestiae.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_949',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Cyrus',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/karalek/128.jpg',
                'lastName': 'Jacobson',
                'id': 'id_user_215'
              }
            },
            'con': {
              'owner': 'id_user_162',
              'posted': '2017-04-10T02:36:18.601Z',
              'role': 'con',
              'text': 'Inventore repellendus illo.',
              'userDistrict': { 'id': 'id_district_108', 'name': 'District 8', 'owner': 'id_doug' },
              'id': 'id_comment_956',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_108',
                    'name': 'District 8',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Yasmin',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fran_mchamy/128.jpg',
                'lastName': 'Franecki',
                'id': 'id_user_162'
              }
            }
          },
          'id_district_109': {
            'pro': null,
            'con': {
              'owner': 'id_user_260',
              'posted': '2017-04-05T17:59:36.919Z',
              'role': 'con',
              'text': 'Esse alias quae sunt illum voluptas nesciunt autem placeat officia.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_951',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lourdes',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nfedoroff/128.jpg',
                'lastName': 'Batz',
                'id': 'id_user_260'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_113',
              'posted': '2017-04-05T17:51:45.240Z',
              'role': 'pro',
              'text': 'Quaerat nemo alias incidunt illum.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_952',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Emanuel',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/fran_mchamy/128.jpg',
                'lastName': 'Jenkins',
                'id': 'id_user_113'
              }
            }, 'con': null
          }
        }
      }
    },
    'id_item_957': {
      'text': 'Eum omnis ut et adipisci distinctio amet qui. Dignissimos perspiciatis et sunt qui quisquam. Quas voluptatum eos quae consectetur qui suscipit voluptatem adipisci ut. Pariatur iure quibusdam explicabo laborum sed. Ipsum voluptates labore qui doloribus. Deserunt voluptatem saepe iusto quae assumenda beatae iure hic.',
      'itemNumber': 10,
      'total': { 'votes': { 'yes': 26, 'no': 23 }, 'comments': { 'pro': 6, 'con': 19, 'neutral': 7 } },
      'byDistrict': {
        'id_district_101': {
          'votes': { 'yes': 4, 'no': 5 },
          'comments': { 'pro': 0, 'con': 0, 'neutral': 0 }
        },
        'id_district_102': { 'votes': { 'yes': 4, 'no': 1 }, 'comments': { 'pro': 1, 'con': 1, 'neutral': 1 } },
        'id_district_103': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 0 } },
        'id_district_104': { 'votes': { 'yes': 2, 'no': 1 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
        'id_district_105': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 2 } },
        'id_district_106': { 'votes': { 'yes': 0, 'no': 1 }, 'comments': { 'pro': 0, 'con': 1, 'neutral': 1 } },
        'id_district_107': { 'votes': { 'yes': 3, 'no': 2 }, 'comments': { 'pro': 0, 'con': 2, 'neutral': 1 } },
        'id_district_108': { 'votes': { 'yes': 0, 'no': 2 }, 'comments': { 'pro': 0, 'con': 4, 'neutral': 1 } },
        'id_district_109': { 'votes': { 'yes': 3, 'no': 1 }, 'comments': { 'pro': 1, 'con': 2, 'neutral': 0 } },
        'id_district_110': { 'votes': { 'yes': 1, 'no': 7 }, 'comments': { 'pro': 2, 'con': 2, 'neutral': 1 } }
      },
      'topComments': {
        'pro': {
          'owner': 'id_user_423',
          'posted': '2017-04-13T04:19:48.056Z',
          'role': 'pro',
          'text': 'Vel magni qui.',
          'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
          'id': 'id_comment_1034',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'districts': { 'id_acc': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' } },
            'firstName': 'Claude',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kurtinc/128.jpg',
            'lastName': 'Kerluke',
            'id': 'id_user_423'
          }
        },
        'con': {
          'owner': 'id_user_419',
          'posted': '2017-04-05T01:43:12.594Z',
          'role': 'con',
          'text': 'Dolor dolores assumenda maiores corporis omnis.',
          'id': 'id_comment_1011',
          'votes': { 'up': 1, 'down': 0 },
          'author': {
            'firstName': 'Eusebio',
            'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/wim1k/128.jpg',
            'lastName': 'Gerhold',
            'id': 'id_user_419'
          }
        },
        'byDistrict': {
          'id_district_101': { 'pro': null, 'con': null },
          'id_district_102': {
            'pro': {
              'owner': 'id_user_483',
              'posted': '2017-04-17T05:30:08.353Z',
              'role': 'pro',
              'text': 'Qui rem ea incidunt architecto qui odio eaque qui.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1012',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Jacinto',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/levisan/128.jpg',
                'lastName': 'Haley',
                'id': 'id_user_483'
              }
            },
            'con': {
              'owner': 'id_user_346',
              'posted': '2017-04-08T13:54:51.578Z',
              'role': 'con',
              'text': 'Veritatis et modi quae suscipit est.',
              'userDistrict': { 'id': 'id_district_102', 'name': 'District 2', 'owner': 'id_doug' },
              'id': 'id_comment_1022',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_102',
                    'name': 'District 2',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Royce',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/strikewan/128.jpg',
                'lastName': 'Lang',
                'id': 'id_user_346'
              }
            }
          },
          'id_district_103': {
            'pro': null,
            'con': {
              'owner': 'id_user_398',
              'posted': '2017-04-18T18:08:43.203Z',
              'role': 'con',
              'text': 'Praesentium qui quasi praesentium ipsum.',
              'userDistrict': { 'id': 'id_district_103', 'name': 'District 3', 'owner': 'id_doug' },
              'id': 'id_comment_1028',
              'votes': { 'up': 0, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_103',
                    'name': 'District 3',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Margaretta',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/nomidesigns/128.jpg',
                'lastName': 'Nicolas',
                'id': 'id_user_398'
              }
            }
          },
          'id_district_104': {
            'pro': {
              'owner': 'id_user_257',
              'posted': '2017-04-08T02:22:10.285Z',
              'role': 'pro',
              'text': 'Adipisci alias dolorem aperiam fuga et quasi in numquam.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1033',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Florian',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/lu4sh1i/128.jpg',
                'lastName': 'Nicolas',
                'id': 'id_user_257'
              }
            },
            'con': {
              'owner': 'id_user_216',
              'posted': '2017-04-06T22:14:19.216Z',
              'role': 'con',
              'text': 'Facere iste tempore aliquam voluptatibus occaecati quas aut.',
              'userDistrict': { 'id': 'id_district_104', 'name': 'District 4', 'owner': 'id_doug' },
              'id': 'id_comment_1036',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_104',
                    'name': 'District 4',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Joanne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/jagan123/128.jpg',
                'lastName': 'Balistreri',
                'id': 'id_user_216'
              }
            }
          },
          'id_district_105': {
            'pro': {
              'owner': 'id_user_145',
              'posted': '2017-04-09T23:47:14.074Z',
              'role': 'pro',
              'text': 'Non enim asperiores aut necessitatibus.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1029',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Kailee',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/alevizio/128.jpg',
                'lastName': 'Lang',
                'id': 'id_user_145'
              }
            },
            'con': {
              'owner': 'id_user_399',
              'posted': '2017-04-14T09:22:25.729Z',
              'role': 'con',
              'text': 'Nihil quis dolor.',
              'userDistrict': { 'id': 'id_district_105', 'name': 'District 5', 'owner': 'id_doug' },
              'id': 'id_comment_1015',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_105',
                    'name': 'District 5',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Alexa',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bartoszdawydzik/128.jpg',
                'lastName': 'Flatley',
                'id': 'id_user_399'
              }
            }
          },
          'id_district_106': {
            'pro': null,
            'con': {
              'owner': 'id_user_293',
              'posted': '2017-04-10T00:07:51.163Z',
              'role': 'con',
              'text': 'Ratione et dolores repellat ut voluptatem minus velit nam assumenda.',
              'userDistrict': { 'id': 'id_district_106', 'name': 'District 6', 'owner': 'id_doug' },
              'id': 'id_comment_1021',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_106',
                    'name': 'District 6',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Allene',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/low_res/128.jpg',
                'lastName': 'Walsh',
                'id': 'id_user_293'
              }
            }
          },
          'id_district_107': {
            'pro': null,
            'con': {
              'owner': 'id_user_249',
              'posted': '2017-04-12T01:26:37.190Z',
              'role': 'con',
              'text': 'In velit aspernatur deserunt alias.',
              'userDistrict': { 'id': 'id_district_107', 'name': 'District 7', 'owner': 'id_doug' },
              'id': 'id_comment_1035',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_107',
                    'name': 'District 7',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Lacey',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/arishi_/128.jpg',
                'lastName': 'Moen',
                'id': 'id_user_249'
              }
            }
          },
          'id_district_108': {
            'pro': null,
            'con': {
              'owner': 'id_user_373',
              'posted': '2017-04-11T12:45:02.432Z',
              'role': 'con',
              'text': 'Aut mollitia suscipit esse distinctio ut occaecati.',
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
                'firstName': 'Isabelle',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/BillSKenney/128.jpg',
                'lastName': 'Klocko',
                'id': 'id_user_373'
              }
            }
          },
          'id_district_109': {
            'pro': {
              'owner': 'id_user_273',
              'posted': '2017-04-14T00:31:07.697Z',
              'role': 'pro',
              'text': 'Error occaecati adipisci deserunt facilis aut a modi.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1010',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Daphne',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/stevedesigner/128.jpg',
                'lastName': 'McClure',
                'id': 'id_user_273'
              }
            },
            'con': {
              'owner': 'id_user_319',
              'posted': '2017-04-14T03:33:00.702Z',
              'role': 'con',
              'text': 'Voluptas quaerat aperiam sint quia dolor.',
              'userDistrict': { 'id': 'id_district_109', 'name': 'District 9', 'owner': 'id_doug' },
              'id': 'id_comment_1031',
              'votes': { 'up': 0, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_109',
                    'name': 'District 9',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Garth',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/bpartridge/128.jpg',
                'lastName': 'Anderson',
                'id': 'id_user_319'
              }
            }
          },
          'id_district_110': {
            'pro': {
              'owner': 'id_user_423',
              'posted': '2017-04-13T04:19:48.056Z',
              'role': 'pro',
              'text': 'Vel magni qui.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1034',
              'votes': { 'up': 1, 'down': 0 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Claude',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/kurtinc/128.jpg',
                'lastName': 'Kerluke',
                'id': 'id_user_423'
              }
            },
            'con': {
              'owner': 'id_user_335',
              'posted': '2017-04-07T05:59:53.077Z',
              'role': 'con',
              'text': 'Nihil est ratione quibusdam mollitia velit est amet officiis ut.',
              'userDistrict': { 'id': 'id_district_110', 'name': 'District 10', 'owner': 'id_doug' },
              'id': 'id_comment_1018',
              'votes': { 'up': 1, 'down': 1 },
              'author': {
                'districts': {
                  'id_acc': {
                    'id': 'id_district_110',
                    'name': 'District 10',
                    'owner': 'id_doug'
                  }
                },
                'firstName': 'Guillermo',
                'icon': 'https://s3.amazonaws.com/uifaces/faces/twitter/cbracco/128.jpg',
                'lastName': 'Schinner',
                'id': 'id_user_335'
              }
            }
          }
        }
      }
    }
  }
};
