import {Injectable} from '@angular/core';
import * as moment from 'moment';
import {AuthService} from './auth.service';
import {AngularFireDatabase} from 'angularfire2';
import {Observable} from 'rxjs';
import {parseVote, Vote} from '../models/vote';
import {SessionUser} from '../models/user';
import {Actions, Effect, toPayload} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {AppState, getSessionUser, getUserVoteForSelectedItem} from '../reducers/index';
import {SELECT_ITEM} from '../reducers/focus';
import {VotesLoadedAction} from '../reducers/data';

@Injectable()
export class VoteService {
  @Effect()
  loadSessionUserVoteForSelectedItemEffect =
    this.store.select(getSessionUser)
      .withLatestFrom(this.actions.ofType(SELECT_ITEM)
        .map(toPayload)
        .filter(it => !!it))
      .do((x) => {
        console.log(`yup`);
        console.log(x)
      })
      .filter(([user, itemId]) => !!user && !!user.votes[itemId])
      .flatMap(([user, itemId]) => this.loadSingleVote(itemId, user.votes[itemId]).map(vote => new VotesLoadedAction([vote], itemId)));


  @Effect()
  loadVotesForSelectedItemEffect = this.actions.ofType(SELECT_ITEM)
    .map(toPayload)
    .filter(it => !!it)
    .flatMap(id => this.loadVotesForItem(id).take(1).map(votes => new VotesLoadedAction(votes, id)));

  constructor(private authService: AuthService, private db: AngularFireDatabase, private store: Store<AppState>, private actions: Actions, private authSvc: AuthService) {

  }


  public castVote(itemId: string, value: 1 | -1) {
    console.log('voting');
    this.authService.sessionUser$.take(1).subscribe(user => {
      if (!user) {
        console.debug('no user signed in - opening modal');
        this.authService.requestAuthModal('We need you to sign in before voting.', (result) => {
          setTimeout(() => {
            console.debug(`modal callback - result ${result} : casting again`);
            this.castVote(itemId, value);
          }, 1000);
        });
        return;
      } else if (user.isVerified == false) {
        console.debug('user is not verified.');
        this.authService.showVerificationRequiredModal();
        return;
      }


      this.getUserVoteFor(itemId).take(1).subscribe(extantVote => {
        if (extantVote == null) {
          this.castNewVote(itemId, value, user);
        } else if (extantVote.value == value) {
          this.deleteVote(itemId, extantVote.id, user.id);
        } else {
          this.changeVote(itemId, extantVote.id, value);
        }
      })


    })
  }


  private loadVotesForItem(itemId: string): Observable<Vote[]> {
    return this.db.list(`/vote/${itemId}`).map(votes => votes.map(vote => parseVote(vote)));
  }

  private loadSingleVote(itemId: string, voteId: string): Observable<Vote> {
    console.log('loading single vote');
    return this.db.object(`/vote/${itemId}/${voteId}`).map(vote => parseVote(vote));
  }

  private changeVote(itemId: string, voteId: string, value: 1 | -1) {
    console.log(`changing vote ${itemId}/${voteId}`);
    this.db.object(`/vote/${itemId}/${voteId}`).update({value, posted: moment().toISOString()}).then(res => {

    }).catch(err => {
      console.error(`error updating vote ${itemId}/${voteId}: ${err.message}`);
    })
  }

  private castNewVote(itemId: string, value: 1 | -1, user: SessionUser) {
    console.log(`casting new vote`);
    let userDistrict = user.districts['id_acc'] || null;

    this.db.list(`/vote/${itemId}`).push({
      value,
      owner: user.id,
      userDistrict,
      posted: moment().toISOString()
    }).then(result => {
      let voteId = result.key;
      console.log(`vote created with ID ${voteId}`);
      this.db.object(`/user_private/${user.id}/votes`).update({[itemId]: voteId}).then(() => {
        console.log(`vote ${voteId} added to user_private/${user.id}`)
      })
    }).catch(err => {
      console.error(`error casting vote: ${err.message}`)
    })
  }

  private deleteVote(itemId: string, voteId: string, userId: string) {
    console.info(`deleting vote ${itemId}/${voteId}`);
    this.db.object(`/vote/${itemId}/${voteId}`).remove()
      .then(() => console.info(`successfully deleted /vote/${itemId}/${voteId}`))
      .catch((err) => `error deleting vote: ${err.message}`);
    this.db.object(`/user_private/${userId}/votes/${itemId}`).remove()
      .then(() => console.info(`successfully deleted /user_private/${userId}/votes/${voteId}`))
      .catch((err) => `error deleting user vote entry: ${err.message}`);
  }

  getUserVoteForSelectedItem() {
    return this.store.select(getUserVoteForSelectedItem);
  }

  getUserVoteFor(itemId: string): Observable<Vote | null> {
    console.log(`getting user vote for ${itemId}`);
    let userVoteId: Observable<string | null> = this.authService.sessionUserId$.flatMap(userId =>
      !userId ? Observable.of(null) : this.db.object(`/user_private/${userId}/votes/${itemId}`).map(it =>
        !it ? null : it.$value)
    );

    return userVoteId
      .flatMap(it => it == null ? Observable.of(null) : this.db.object(`/vote/${itemId}/${it}`).map(it => parseVote(it)));

  }

}
