import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { FollowService } from './follow.service';
import { AngularFireDatabase } from 'angularfire2';
import { Observable } from 'rxjs/Rx';


describe('FollowService', () => {

  let db: AngularFireDatabase;
  let followSvc: FollowService;
  beforeEach(() => {

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AngularFireDatabase,
          useValue: jasmine.createSpyObj('angularFireDatabase', [ 'object', 'list' ])
        },
        FollowService
      ]
    });

    db = TestBed.get(AngularFireDatabase);
    followSvc = TestBed.get(FollowService);
  });

  function setReturnVal(returnVal) {
    const db = TestBed.get(AngularFireDatabase);
    db.object.and.returnValue(Observable.of(returnVal));
    followSvc = TestBed.get(FollowService);
  }

  it('should return the correct number of followers', fakeAsync(() => {

    let retVal = {
      id1: true,
      id2: true,
      id3: true,
      id4: true
    };

    setReturnVal(retVal);

    let result: number;

    followSvc.getFollowCount('meeting', 'foo').subscribe(num => result = num);

    tick(100);

    expect(result).toEqual(Object.keys(retVal).length);
  }));


});
