import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Meeting, parseMeeting, RawMeeting} from '../models/meeting';
import {AngularFireDatabase} from 'angularfire2';
import {Item} from '../models/item';
import {ItemService} from './item.service';

@Injectable()
export class MeetingService {
  private data$: Observable<{ ids: string[], entities: { [id: string]: Meeting } }>;

  private focusedMeeting$: Observable<Meeting>;


  constructor(private db: AngularFireDatabase, private itemSvc: ItemService) {


  }


  public get(mtgId: string): Observable<Meeting> {
    console.log(`MeetingService getting ${mtgId}`);
    return this.db.object(`/meeting/${mtgId}`)
      .map((it: RawMeeting) => parseMeeting(it))
  }

  public getMeetingAgenda(mtgId: string): Observable<Item[]> {
    return this.get(mtgId).flatMap(mtg => {
      return Observable.forkJoin(...mtg.agendaIds.map(id => this.itemSvc.get(id, true).take(1)))
    })
  }

}
