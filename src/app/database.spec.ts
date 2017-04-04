import './custom_matchers';
import * as moment from 'moment';
import * as targaryen from 'targaryen/plugins/jasmine';
import Moment = moment.Moment;

const rules = require('./../../database.rules.json');

const user1Id = 'id_user_1';
const user2Id = 'id_user_2';


describe('database rules', () => {
  let now: Moment;
  beforeEach(() => {
    jasmine.addMatchers(targaryen.matchers);
    targaryen.setFirebaseData(JSON.stringify(data));
    targaryen.setFirebaseRules(rules);

    now = moment();
  });

  it('should allow anyone to read from user/*', () => {
    expect(null).canRead(`/user/${user1Id}`)
  });

  it('should only allow id_user_1 to write or patch user/id_user_1', () => {
    const updatedData = {...data.user.id_user_1, firstName: 'Bob'};
    const url = '/user/id_user_1';
    expect(null).cannotWrite(url, updatedData);
    expect(null).cannotPatch(url, updatedData);
    expect({uid: 'id_user_1'}).canWrite(url, updatedData);
    expect({uid: 'id_user_1'}).canPatch(url, updatedData);
  });

  it('should only allow id_user_1 to read, write or patch user_private/id_user_1', () => {
    const updatedData = {...data.user_private.id_user_1, email: 'bob@bob.com'};
    const url = `/user_private/id_user_1`;
    expect(null).cannotRead(url);
    expect(null).cannotPatch(url, updatedData);

    expect({uid: 'id_user_1'}).canRead(url);
    expect({uid: 'id_user_1'}).canPatch(url, updatedData);
  });

  it('should allow auth user to post the first vote or comment on an item', () => {
    const vote = {value: 1, posted: now.toISOString(), owner: user1Id};
    const comment = {text: 'blah', role: 'pro', owner: user1Id, posted: now.toISOString()};

    expect({uid: user1Id}).canWrite(`vote/id_item_without_votes_or_comments/fooId`, vote);
    expect({uid: user1Id}).canWrite(`comment/id_item_without_votes_or_comments/fooId`, comment);
  });

  it('should allow auth user to post subsequent votes and comments to an item', () => {

    const vote = {value: 1, posted: now.toISOString(), owner: user1Id};
    const comment = {text: 'blah', role: 'pro', owner: user2Id, posted: now.toISOString()};

    expect({uid: user1Id}).canWrite(`vote/id_with_votes_and_comments/fooId`, vote);
    expect({uid: user2Id}).canWrite(`comment/id_with_votes_and_comments/fooId`, comment);
  });


});

const data = {
  user: {
    id_user_1: {
      firstName: 'Drew',
      lastName: 'Moore',
      icon: 'asdf'
    },
    id_user_2: {
      firstName: 'Foo',
      lastName: 'Bar',
      icon: 'asdf'
    },
    id_doug: {
      firstName: 'Doug',
      lastName: 'Matthews',
      icon: 'asdf'
    }
  },
  user_private: {
    id_user_1: {
      email: 'drew@civinomics.com',
      address: {
        line1: '140 Jackson St',
        line2: '',
        city: 'Brooklyn',
        zip: '11211'
      },
      votes: {
        id_item_with_votes_and_comments: 'id_vote_1'
      },
      comments: {
        id_item_with_votes_and_comments: 'id_comment_1'
      }
    },
    id_doug: {
      email: 'doug@austintexas.gov',
      address: {
        line1: '144 Foo St',
        line2: '',
        city: 'Austin',
        zip: '78751'
      }
    }
  },

  item: {
    id_item_with_votes_and_comments: {
      text: 'Approve the minutes of...',
      owner: 'id_doug'
    },
    id_item_without_votes_or_comments: {
      text: 'blah',
      owner: 'id_doug'
    }
  },

  vote: {
    id_item_with_votes_and_comments: {
      id_vote_1: {
        value: 1,
        posted: '2017-03-23T22:56:48.965Z',
        owner: 'id_user_1'
      }
    }
  },

  comment: {
    id_item_with_votes_and_comments: {
      id_comment_1: {
        text: 'blah',
        role: 'pro',
        posted: '2017-03-23T22:56:48.965Z',
        owner: 'id_user_1'
      }
    }
  }


};
