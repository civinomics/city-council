import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Group, parseGroup, RawGroup} from '../models/group';
import {AngularFireDatabase} from 'angularfire2';

@Injectable()
export class GroupService {


  constructor(private db: AngularFireDatabase) {

  }


  public get(groupId: string): Observable<Group> {
    console.log(`GroupService getting ${groupId}`);
    return this.db.object(`/group/${groupId}`)
      .map((it: RawGroup) => parseGroup(it));
  }

}
