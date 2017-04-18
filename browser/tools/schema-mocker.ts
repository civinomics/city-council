import * as Faker from 'faker';

import * as moment from 'moment';
import { keys, random, range } from 'lodash';
import { Vote } from '../src/app/vote/vote.model';
import { Comment } from '../src/app/comment/comment.model';
import { Item } from '../src/app/item/item.model';
import { SessionUser, User } from '../src/app/user/user.model';
import * as fs from 'fs';
import { Meeting } from '../src/app/meeting/meeting.model';
import Moment = moment.Moment;

const tenMinsAgo = moment().subtract(10, 'minutes');
const twoWeeksAgo = moment().subtract(2, 'weeks');
const sixMonthsAgo = moment().subtract(6, 'months');

/**********MAIM***********/
const it = schema();
fs.writeFile('mock_data.json', JSON.stringify(it, null, '\t'), err => {
  console.error('ERROR');
  console.error(err);
});

/*********************/

export type MockInput = {

  before?: Moment,
  after?: Moment,
  owner?: string,
  userDistrict?: {id: string, name: string}
};

export type MockUserInput = MockInput & {
  accDistrict?: {id: string, name: string}
}
export type MockVoteInput = MockInput & { value?: 1 | -1 };

export type MockCommentInput = MockInput & { role?: 'pro' | 'con', text?: string };

export type MockItemInput =
  MockInput
  & { text?: string, agendas: { meetingId: string, groupId: string, itemNumber: number }[], deadline?: Moment }

export type MockMeetingInput = { startTime?: Moment, past?: boolean, items?: Item[], numItems?: number, owner?: string, published?: boolean }


export type MockSchemaInput = { numUsers?: number, numMeetings?: number, numItems?: number, numItemsPerMeeting: number }

function randTime(after?: Moment, before?: Moment) {
  let diff = (after || twoWeeksAgo).diff(before || tenMinsAgo);
  return moment(before).add(random(diff));
}

var _lastId: number = 100;
var _fails = 0;

function randId(type?: string) {
  if (isNaN(_lastId)) {
    console.log(`${_lastId} is NaN!`);
    console.log(type);
    _lastId = 100;
  }

  _lastId++;
  return `id_${type || 'rand'}_${_lastId}`;
}

function randBoolean() {
  return random(0, 10) % 2 == 0;
}

function randVoteVal(): 1 | -1 {
  return randBoolean() ? 1 : -1;
}

function randRole(): 'pro' | 'con' | 'neutral' {
  switch (random(0, 13) % 3) {
    case 0:
      return 'pro';
    case 1:
      return 'con';
    case 2:
      return 'neutral';
  }
}

/*function randItemActivity(): ItemStatsAdt {
 let pros = random(0, 50),
 cons = random(0, 50),
 yeses = random(0, 100),
 nos = random(0, 100);
 return {

 }
 }*/

export function mockUser(input?: MockUserInput): SessionUser {
  const id = randId('user');
  return {
    firstName: Faker.name.firstName(),
    lastName: Faker.name.lastName(),
    icon: Faker.internet.avatar(),
    joined: randTime(sixMonthsAgo),
    lastOn: randTime(),
    districts: input && input.accDistrict ? {'id_acc': input.accDistrict} : {},
    isVerified: true,
    id,
    email: Faker.internet.email(),
    address: {
      line1: `${Faker.address.streetAddress()}`,
      city: `${Faker.address.city()}`,
      zip: `${Faker.address.zipCode()}`,
      state: Faker.address.stateAbbr()
    },
    superuser: false,
    votes: {},
    comments: {},
    following: [],
    owner: id
  }
}

export function mockVote(input?: MockVoteInput): Vote {
  return {
    value: input && input.value || randVoteVal(),
    posted: randTime(input && input.before || twoWeeksAgo, input && input.after || tenMinsAgo),
    owner: input && input.owner || randId('user'),
    userDistrict: input && input.userDistrict || null,
    id: randId('vote')
  }
}


export function mockComment(input?: MockCommentInput): Comment {
  return {
    text: input && input.text || Faker.lorem.sentence(),
    role: input && input.role || randRole(),
    posted: randTime(input && input.before || twoWeeksAgo, input && input.after || tenMinsAgo),
    id: randId('comment'),
    userDistrict: input && input.userDistrict || null,
    owner: input && input.owner || randId('user')
  }
}
let _lastNo: number = 1;
export function mockItem(input?: MockItemInput): Item {
  let itemNo = _lastNo++ % 100;
  return {
    text: input && input.text || Faker.lorem.paragraph(),
    onAgendas: input.agendas.reduce((result, next) => ({...result, [next.meetingId]: next}), {}),
    id: randId('item'),
    feedbackDeadline: input && input.deadline || randTime(),
    sireLink: `https://austin.siretechnologies.com/sirepub/agdocs.aspx?doctype=agenda&itemid=${67000 + random()}`,
    owner: input && input.owner || randId('user'),
  }
}

export function mockMeeting(input?: MockMeetingInput): Meeting {
  let start, end, deadline;
  let past = input && input.past || false;

  start = input && input.startTime ? input.startTime : past ? moment().subtract(2, 'months') : moment().add(2, 'days');
  end = moment(start).add(2, 'hours');
  deadline = moment(start).subtract('24', 'hours');


  return {
    title: `Regular Meeting of the Austin City Council`,
    startTime: start,
    endTime: end,
    feedbackDeadline: deadline,
    published: input&&input.published||true,
    id: randId('meeting'),
    owner: input && input.owner || 'id_doug',
    agenda: [],
    groupId: 'id_acc'
  }
}

export function mockAustin() {
  return {
    name: 'Austin',
    longName: 'City of Austin',
    id: 'id_austin',
    icon: 'https://cmgstatesmanaustin.files.wordpress.com/2015/08/city-of-austin-flag.png',
    groups: ['id_acc'],
    owner: 'id_doug'
  }
}

function mockDistrict() {

}

export function mockAcc(input?: { meetingIds?: string[] }) {

  let districts = range(1, 11).map(num => ({
    name: `District ${num}`,
    id: randId('district'),
    owner: 'id_doug'
  })).reduce((result, next) => ({...result, [next.id]: next}), {});

  return {
    name: 'Austin City Council',
    icon: 'https://cmgstatesmanaustin.files.wordpress.com/2015/08/city-of-austin-flag.png',
    id: 'id_acc',
    owner: 'id_doug',
    districts,
    meetings: input && input.meetingIds || []
  }
}


export function schema(input?: MockSchemaInput): any {

  const NUM_USERS = 400;

  const MIN_VOTES_PER = 0;
  const MAX_VOTES_PER = 100;

  const MIN_COMMS_PER = 0;
  const MAX_COMMS_PER = 50;


  const DEFAULT_NUM_USERS = 200;
  const DEFAULT_ITEMS_PER_MEETING = 60;


  const NUM_MEETINGS = 4;
  const ITEMS_PER_MEETING = 52;


  const TOT_NUM_COMMENT_REPLIES = (((MIN_COMMS_PER + MAX_COMMS_PER) / 2 ) * (NUM_MEETINGS * ITEMS_PER_MEETING) * 0.35);
  const TOT_NUM_COMMENT_VOTES = (((MIN_VOTES_PER + MAX_VOTES_PER) / 2 ) * (NUM_MEETINGS * ITEMS_PER_MEETING) * 0.3);


  const adminId = 'id_doug';
  const atxId = 'id_austin';
  const accId = 'id_acc';


  const atx = mockAustin(), acc = mockAcc();

  const districtIds = Object.keys(acc.districts);


  const users = range(0, NUM_USERS).map(() => {
    let accDistrict = random(0, 8) == 6 ? null : acc.districts[districtIds[random(0, districtIds.length - 1)]];
    return mockUser({accDistrict});
  });
  const meetings = [];

  const items: Item[] = [];
  const votes: { [itemId: string]: Vote[] } = {};
  const comments: { [itemId: string]: Comment[] } = {};

  const userVotes: { [userId: string]: { [itemId: string]: string } } = users.reduce((result, next) => ({
    ...result,
    [next.id]: {}
  }), {});
  const userComments: { [userId: string]: { [commId: string]: string } } = users.reduce((result, next) => ({
    ...result,
    [next.id]: {}
  }), {});

  let totItems, totVotes, totComms;
  totItems = totVotes = totComms = 0;


  for (let m = 0; m < NUM_MEETINGS; m++) {

    let dayDiff = m * 14 - 2;

    let mtgDate = moment().subtract(dayDiff, 'days').set('hours', 18);

    let feedbackEnd = moment(mtgDate).subtract(24, 'hours');
    let feedbackStart = moment(feedbackEnd).subtract(2, 'weeks');

    let meeting = mockMeeting({ startTime: mtgDate, owner: adminId, published: m < NUM_MEETINGS - 1 });

    let agenda = [];

    for (let i = 0; i < ITEMS_PER_MEETING; i++) {
      let item = mockItem({
        owner: adminId,
        agendas: [{itemNumber: i + 1, meetingId: meeting.id, groupId: 'id_acc'}],
        deadline: feedbackEnd
      });
      agenda.push(item);

      let numVotes = random(MIN_VOTES_PER, MAX_VOTES_PER),
        numComms = random(MIN_COMMS_PER, MAX_COMMS_PER);

      const itemVotes: Vote[] = [];
      const itemComms: Comment[] = [];

      let voter: User, vote: Vote, commenter: User, comment: Comment;

      for (let v = 0; v < numVotes; v++) {
        voter = randUser();

        vote = mockVote({
          owner: voter.id,
          before: feedbackEnd,
          after: feedbackStart,
          userDistrict: voter.districts['id_acc']
        });

        itemVotes.push(vote);
        userVotes[voter.id][item.id] = vote.id
      }

      for (let c = 0; c < numComms; c++) {
        commenter = randUser();
        comment = mockComment({
          before: feedbackStart,
          after: feedbackEnd,
          owner: commenter.id,
          userDistrict: commenter.districts['id_acc']
        });
        itemComms.push(comment);
        userComments[commenter.id][item.id] = comment.id;
      }

      totVotes += itemVotes.length;
      totComms += itemComms.length;

      votes[item.id] = itemVotes;
      comments[item.id] = itemComms;


      items.push(item);

      totItems++;

    }
    meetings.push({...meeting, agenda: agenda.reduce((result, item) => ({...result, [item.id]: true}), {})});
  }

  console.log(`top level votes | comments: ${totVotes} | ${totComms}`);

  acc.meetings = meetings.reduce((result, next) => ({...result, [next.id]:true}), {});

  const itemIds = items.map(it => it.id);

  const randComment = () => {
    let arr = [];
    while (arr.length == 0) {
      arr = comments[itemIds[random(0, itemIds.length - 1)]];
    }
    return arr[random(0, arr.length - 1)]
  };

  const replies: { [commId: string]: { [targId: string]: Comment } } = {};
  const commVotes: { [commId: string]: { [targId: string]: Vote } } = {};

  console.log(`tot replies: ${TOT_NUM_COMMENT_REPLIES}`);
  console.log(`tot comm votes: ${TOT_NUM_COMMENT_VOTES}`);

  for (let i = 0; i < TOT_NUM_COMMENT_REPLIES; i++) {
    let target = randComment();
    let poster = randUser();
    let after = target.posted;
    let before = moment(after).add(4, 'days');
    let reply = mockComment({owner: poster.id, userDistrict: poster.districts['id_acc'], before, after});
    userComments[poster.id][target.id] = reply.id;

    if (!replies[target.id]) {
      replies[target.id] = {}
    }

    totComms++;
    replies[target.id][reply.id] = reply;
  }


  for (let i = 0; i < TOT_NUM_COMMENT_REPLIES; i++) {
    let target = randComment();
    let poster = randUser();
    let after = target.posted;
    let before = moment(after).add(4, 'days');
    let vote = mockVote({owner: poster.id, userDistrict: poster.districts['id_acc'], before, after});
    userVotes[poster.id][target.id] = vote.id;
    if (!commVotes[target.id]) {
      commVotes[target.id] = {}
    }

    commVotes[target.id][vote.id] = vote;
    totVotes++;
  }


  console.log(`total votes | comments: ${totVotes} | ${totComms}`);


  const user = users.reduce((result, next) => ({
    ...result,
    [next.id]: {firstName: next.firstName, lastName: next.lastName, icon: next.icon, districts: next.districts}
  }), {});

  const user_private = users.reduce((result, next) => ({
    ...result,
    [next.id]: {
      email: next.email,
      address: next.address,
      votes: userVotes[next.id],
      comments: userComments[next.id]
    }
  }), {});


  const item = items.reduce((result, next) => ({...result, [next.id]: next}), {});


  const vote = {
    ...items.filter(item => votes[item.id].length > 0).reduce((outerResult, item) =>
        ({
          ...outerResult, [item.id]: votes[item.id].reduce((itemResult, vote) =>
            ({...itemResult, [vote.id]: vote}), {})
        }),
      {}),
    ...commVotes
  };

  const comment = {

    ...items.filter(item => comments[item.id].length > 0).reduce((outerResult, item) =>
        ({
          ...outerResult, [item.id]: comments[item.id].reduce((itemResult, comment) =>
            ({...itemResult, [comment.id]: comment}), {})
        }),
      {}),
    replies
  };


  const meeting = meetings.reduce((result, mtg) => ({...result, [mtg.id]: mtg}), {});

  const place = {[atx.id]: atx};

  const group = {[acc.id]: acc};


  delete group[acc.id].id;
  delete place[atx.id].id;

  keys(meeting).forEach(id => {
    delete meeting[id].id;
  });

  keys(comment).forEach(itemId => {
    keys(comment[itemId]).forEach(commentId => {
      delete comment[itemId][commentId].id;
    })
  });

  keys(vote).forEach(itemId => {
    keys(vote[itemId]).forEach(voteId => {
      delete vote[itemId][voteId].id;
    })
  });

  keys(commVotes).forEach(targId => {
    keys(commVotes[targId]).forEach(voteId => {
      delete commVotes[targId][voteId].id;
    })
  });

  keys(replies).forEach(targId => {
    keys(replies[targId]).forEach(commId => {
      delete replies[targId][commId].id;
    })
  });

  return {
    user,
    user_private,
    place,
    group,
    meeting,
    item,
    vote,
    comment
  };


  function randUser() {
    return users[random(0, users.length - 1)];
  }


}
