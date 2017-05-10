import * as functions from 'firebase-functions';
import { Event } from 'firebase-functions';
import { getEmailTransport, initializeAdminApp, initializeMockAdminApp } from './_internal';
import { Comment, Item, parseComment, parseItem } from '@civ/city-council';
import { Observable } from 'rxjs/Observable';

import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/map';

import 'rxjs/add/operator/reduce';
import { DeltaSnapshot } from 'firebase-functions/lib/providers/database';

let args = process.argv;

let app;

if (args.indexOf('dev') >= 0) {
  app = initializeMockAdminApp();
} else {
  app = initializeAdminApp();
}

const database = app.database();


export const newCommentNotifications = functions.database.ref(`/comment`).onWrite((event: Event<DeltaSnapshot>) => {
  handleNewComment(event);
});

export const meetingClosedNotifications = functions.https

function handleNewComment(event: Event<DeltaSnapshot>) {
  let delta = event.data;
  let newComments = {};
  delta.forEach((itemEntry: DeltaSnapshot) => {
    //each child here is a list of comments for a different item.
    if (itemEntry.previous.numChildren() !== itemEntry.numChildren()) {
      newComments[ itemEntry.key ] = [];

      itemEntry.forEach(commentEntry => {
        if (!commentEntry.previous.exists()) {
          newComments[ itemEntry.key ].push(commentEntry.key);
        }
        return false; //keep iterating
      });
    }
    return false; //keep iterating
  });

  if (Object.keys(newComments).length == 0) {
    return;
  }

  else {
    //there should never be more than one as this function is called on every write
    Object.keys(newComments).forEach(itemId =>
      newComments[ itemId ].forEach(commentId =>
        notifyItemFollowersOfNewComment(itemId, commentId)
      )
    );
  }

}


function notifyItemFollowersOfNewComment(itemId: string, commentId: string): Promise<any> {

  return new Promise((resolve, reject) => {
    Observable.forkJoin(
      Observable.fromPromise(getComment(itemId, commentId)).take(1),
      Observable.fromPromise(getItem(itemId)).take(1),
      Observable.fromPromise(getFollowers('item', itemId)).take(1)
    ).subscribe(([ comment, item, followers ]) => {
      console.log(`got comment, item, ${followers.length} followers`);
      Observable.forkJoin(
        ...followers.map(userId => Observable.fromPromise(getUserEmail(userId)).take(1)
          .map(email => createCommentNotificationEmail(email, comment, item))
        )
      ).subscribe(emails => {
        console.log(`sending ${emails.length} emails`);
        const transport = getEmailTransport();

        Promise.all(emails.map(email => new Promise((resolve, reject) => {
          transport.sendMail(email, (err, info) => {
            if (err) {
              reject(err);
            } else {
              console.log(info);
              resolve();
            }
          });
        }))).then(() => resolve()).catch(err => reject(err));
      }, err => reject(err))

    }, err => reject(err));
  });

}

function createCommentNotificationEmail(to: string, comment: Comment, item: Item) {

  let subject = item.text.length >= 50 ? item.text.substring(0, 50).concat('...') : item.text;
  let meeting = item.onAgendas[ Object.keys(item.onAgendas)[ 0 ] ].meetingId;
  let group = item.onAgendas[ Object.keys(item.onAgendas)[ 0 ] ].groupId;

  let link = `https://civinomics.com/group/${group}/meeting/${meeting}/item/${item.id}`;
  return {
    to,
    subject: `New Comment on ${subject}`,
    html: `<p>A new comment has been posted on <a href="${link}">an item you followed on Civinomics</a>: ${item.text}: </p>
           <p>${comment.text}</p>
           <p>Click <a href="${link}">here</a> to see the item</p>`
  }

}

function getUserEmail(id: string): Promise<string> {
  return new Promise((resolve, reject) => {
    database.ref(`/user_private/${id}/email`).once('value', (snapshot) => {
      resolve(snapshot.val());
    }).catch(err => {
      reject(err);
    })
  });
}

function getItem(id: string): Promise<Item> {
  return new Promise((resolve, reject) => {
    database.ref(`/item/${id}`).once('value', (snapshot) => {
      resolve(parseItem({ ...snapshot.val(), id }));
    }).catch(err => reject(err));
  });
}


function getComment(itemId: string, id: string): Promise<Comment> {
  return new Promise((resolve, reject) => {
    database.ref(`/comment/${itemId}/${id}`).once('value', (snapshot) => {
      resolve(parseComment({ ...snapshot.val(), id }));
    }).catch(err => reject(err));
  });
}

function getFollowers(type: 'meeting' | 'group' | 'item', id: string): Promise<string[]> {

  return new Promise((resolve, reject) => {
    database.ref(`following/${type}/${id}`).once('value', (snapshot) => {

      let dict = snapshot.val();

      resolve(
        Object.keys((dict || {})).filter(id => dict[ id ] == true))

    }).catch(err => reject(err));
  });

}

const before = {
  id_item_10014: {
    'id_comment_10042': {
      'owner': 'id_user_372',
      'posted': '2017-03-21T08:32:52.707Z',
      'role': 'con',
      'text': 'At qui aut.',
      'userDistrict': {
        'id': 'id_district_110',
        'name': 'District 10',
        'owner': 'id_doug'
      }
    },
    'id_comment_10043': {
      'owner': 'id_user_492',
      'posted': '2017-03-18T00:30:31.350Z',
      'role': 'pro',
      'text': 'Et architecto molestiae sequi quibusdam perspiciatis repudiandae repellendus voluptatem iure.',
      'userDistrict': {
        'id': 'id_district_108',
        'name': 'District 8',
        'owner': 'id_doug'
      }
    },
    'id_comment_10044': {
      'owner': 'id_user_490',
      'posted': '2017-03-17T11:15:34.499Z',
      'role': 'con',
      'text': 'Magnam nulla nihil debitis.',
      'userDistrict': {
        'id': 'id_district_105',
        'name': 'District 5',
        'owner': 'id_doug'
      }
    },
    'id_comment_10045': {
      'owner': 'id_user_311',
      'posted': '2017-03-10T16:34:40.316Z',
      'role': 'con',
      'text': 'Fugiat hic blanditiis molestias.',
      'userDistrict': {
        'id': 'id_district_105',
        'name': 'District 5',
        'owner': 'id_doug'
      }
    },
    'id_comment_10046': {
      'owner': 'id_user_119',
      'posted': '2017-03-20T02:32:32.999Z',
      'role': 'pro',
      'text': 'Voluptates omnis mollitia temporibus.',
      'userDistrict': {
        'id': 'id_district_110',
        'name': 'District 10',
        'owner': 'id_doug'
      }
    },
    'id_comment_10047': {
      'owner': 'id_user_454',
      'posted': '2017-03-12T01:24:36.576Z',
      'role': 'neutral',
      'text': 'Non ducimus eum tempora architecto doloribus voluptatem atque.',
      'userDistrict': {
        'id': 'id_district_109',
        'name': 'District 9',
        'owner': 'id_doug'
      }
    },
    'id_comment_10048': {
      'owner': 'id_user_175',
      'posted': '2017-03-16T07:13:08.980Z',
      'role': 'pro',
      'text': 'Quam et sit fuga aliquam est sunt voluptatem accusantium neque.',
      'userDistrict': {
        'id': 'id_district_101',
        'name': 'District 1',
        'owner': 'id_doug'
      }
    },
    'id_comment_10049': {
      'owner': 'id_user_169',
      'posted': '2017-03-19T18:39:48.230Z',
      'role': 'pro',
      'text': 'Qui libero velit.',
      'userDistrict': {
        'id': 'id_district_108',
        'name': 'District 8',
        'owner': 'id_doug'
      }
    },
    'id_comment_10050': {
      'owner': 'id_user_458',
      'posted': '2017-03-11T21:52:42.466Z',
      'role': 'pro',
      'text': 'Vel aut magnam modi similique voluptas rem saepe doloremque.',
      'userDistrict': {
        'id': 'id_district_109',
        'name': 'District 9',
        'owner': 'id_doug'
      }
    },
    'id_comment_10051': {
      'owner': 'id_user_202',
      'posted': '2017-03-19T11:41:56.869Z',
      'role': 'neutral',
      'text': 'Explicabo consectetur maxime reprehenderit.',
      'userDistrict': {
        'id': 'id_district_101',
        'name': 'District 1',
        'owner': 'id_doug'
      }
    },
    'id_comment_10052': {
      'owner': 'id_user_237',
      'posted': '2017-03-14T02:55:01.187Z',
      'role': 'neutral',
      'text': 'Eligendi autem id id.',
      'userDistrict': {
        'id': 'id_district_101',
        'name': 'District 1',
        'owner': 'id_doug'
      }
    },
    'id_comment_10053': {
      'owner': 'id_user_233',
      'posted': '2017-03-08T09:35:17.178Z',
      'role': 'con',
      'text': 'Natus aliquam est esse doloremque aut.',
      'userDistrict': {
        'id': 'id_district_105',
        'name': 'District 5',
        'owner': 'id_doug'
      }
    },
    'id_comment_10054': {
      'owner': 'id_user_252',
      'posted': '2017-03-18T07:45:39.290Z',
      'role': 'con',
      'text': 'Architecto quis impedit asperiores deserunt qui.',
      'userDistrict': {
        'id': 'id_district_110',
        'name': 'District 10',
        'owner': 'id_doug'
      }
    },
    'id_comment_10055': {
      'owner': 'id_user_324',
      'posted': '2017-03-10T23:22:56.331Z',
      'role': 'con',
      'text': 'Aut sit cumque rerum provident et laboriosam quis dolor.',
      'userDistrict': {
        'id': 'id_district_101',
        'name': 'District 1',
        'owner': 'id_doug'
      }
    },
    'id_comment_10056': {
      'owner': 'id_user_492',
      'posted': '2017-03-12T23:08:09.924Z',
      'role': 'pro',
      'text': 'Aut provident provident quos suscipit deserunt consequatur.',
      'userDistrict': {
        'id': 'id_district_108',
        'name': 'District 8',
        'owner': 'id_doug'
      }
    },
    'id_comment_10057': {
      'owner': 'id_user_185',
      'posted': '2017-03-11T11:18:48.787Z',
      'role': 'con',
      'text': 'Atque eveniet beatae et eligendi veritatis vel dicta qui accusantium.',
      'userDistrict': {
        'id': 'id_district_103',
        'name': 'District 3',
        'owner': 'id_doug'
      }
    }
  },
  id_item_10497: {
    'id_comment_10560': {
      'owner': 'id_user_462',
      'posted': '2017-03-19T17:20:06.917Z',
      'role': 'pro',
      'text': 'Dolores rem eos assumenda quaerat eos.',
      'userDistrict': {
        'id': 'id_district_107',
        'name': 'District 7',
        'owner': 'id_doug'
      }
    },
    'id_comment_10561': {
      'owner': 'id_user_220',
      'posted': '2017-03-11T05:42:24.289Z',
      'role': 'pro',
      'text': 'Labore suscipit repellat quod.',
      'userDistrict': {
        'id': 'id_district_101',
        'name': 'District 1',
        'owner': 'id_doug'
      }
    },
    'id_comment_10562': {
      'owner': 'id_user_186',
      'posted': '2017-03-18T17:57:44.249Z',
      'role': 'pro',
      'text': 'Est praesentium iure eos optio corrupti corporis necessitatibus et.',
      'userDistrict': {
        'id': 'id_district_104',
        'name': 'District 4',
        'owner': 'id_doug'
      }
    },
    'id_comment_10563': {
      'owner': 'id_user_338',
      'posted': '2017-03-10T22:03:51.219Z',
      'role': 'pro',
      'text': 'Exercitationem rerum aut architecto dolorem.',
      'userDistrict': {
        'id': 'id_district_105',
        'name': 'District 5',
        'owner': 'id_doug'
      }
    },
    'id_comment_10564': {
      'owner': 'id_user_280',
      'posted': '2017-03-19T10:54:38.707Z',
      'role': 'pro',
      'text': 'Sequi soluta in repudiandae iure enim.',
      'userDistrict': {
        'id': 'id_district_110',
        'name': 'District 10',
        'owner': 'id_doug'
      }
    },
    'id_comment_10565': {
      'owner': 'id_user_185',
      'posted': '2017-03-13T10:22:46.548Z',
      'role': 'con',
      'text': 'Autem facilis iusto deserunt.',
      'userDistrict': {
        'id': 'id_district_103',
        'name': 'District 3',
        'owner': 'id_doug'
      }
    },
    'id_comment_10566': {
      'owner': 'id_user_407',
      'posted': '2017-03-10T15:15:31.495Z',
      'role': 'pro',
      'text': 'Autem sed voluptatem commodi et.',
      'userDistrict': {
        'id': 'id_district_106',
        'name': 'District 6',
        'owner': 'id_doug'
      }
    },
    'id_comment_10567': {
      'owner': 'id_user_337',
      'posted': '2017-03-13T23:26:34.718Z',
      'role': 'pro',
      'text': 'Sequi illo placeat culpa id et ea.',
      'userDistrict': {
        'id': 'id_district_109',
        'name': 'District 9',
        'owner': 'id_doug'
      }
    },
    'id_comment_10568': {
      'owner': 'id_user_276',
      'posted': '2017-03-12T08:36:24.720Z',
      'role': 'pro',
      'text': 'Autem et ut consequuntur laborum omnis.',
      'userDistrict': {
        'id': 'id_district_103',
        'name': 'District 3',
        'owner': 'id_doug'
      }
    },
    'id_comment_10569': {
      'owner': 'id_user_501',
      'posted': '2017-03-19T18:16:05.707Z',
      'role': 'pro',
      'text': 'Id unde et odio nesciunt sed eius a.',
      'userDistrict': {
        'id': 'id_district_109',
        'name': 'District 9',
        'owner': 'id_doug'
      }
    },
    'id_comment_10570': {
      'owner': 'id_user_294',
      'posted': '2017-03-16T02:56:09.054Z',
      'role': 'pro',
      'text': 'Tempore dolor sunt qui vitae fuga accusantium.',
      'userDistrict': {
        'id': 'id_district_108',
        'name': 'District 8',
        'owner': 'id_doug'
      }
    }
  }
};

const after = {
  id_item_10497: before.id_item_10497,
  id_item_10014: {
    ...before.id_item_10014,
    'id_comment_10058': {
      'owner': 'id_user_498',
      'posted': '2017-03-15T00:17:38.813Z',
      'role': 'pro',
      'text': 'Enim omnis ipsam debitis voluptatem nihil quo.',
      'userDistrict': {
        'id': 'id_district_109',
        'name': 'District 9',
        'owner': 'id_doug'
      }
    }
  }
};

/*
 const fakeEvent = {
 data: new functions.database.DeltaSnapshot(null, null, before, after, 'input')
 };

 handleNewComment(fakeEvent);
 */
