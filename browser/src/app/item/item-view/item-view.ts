import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';
import { Item } from '../item.model';
import { MdInputDirective } from '@angular/material';
import { Vote } from '../../vote/vote.model';
import { Comment } from '../../comment/comment.model';
import { VoteService } from '../../vote/vote.service';
import { Observable } from 'rxjs/Observable';
import { Representative } from '../../group/group.model';
import { ShareArgs, ShareButton, ShareProvider } from 'ngx-sharebuttons';

let _dontRemoveImport: Observable<any>;
declare const window: any;

@Component({
  selector: 'civ-item-view',
  templateUrl: './item.view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: [ './item.view.scss' ],
  animations: [
    trigger('voteBtn', [
      state('rejected', style({ opacity: 0.4, 'background-color': '#999' })),
      transition('* <=> rejected', animate('250ms'))
    ]),
    trigger('checkmark', [
      transition('void => fromLeft', [
        style({ transform: 'translateX(-30px)', opacity: 0 }),
        animate('250ms 100ms', keyframes([
          style({ transform: 'translateX(-30px)', opacity: 0 }),
          style({ transform: 'translateX(0)', opacity: 0.5 }),
          style({ transform: 'translateX(0)', opacity: 1 })
        ]))
      ]),
      transition('void => fromRight', [
        style({ transform: 'translateX(30px)', opacity: 0 }),
        animate('250ms 100ms', keyframes([
          style({ transform: 'translateX(30px)', opacity: 0 }),
          style({ transform: 'translateX(0)', opacity: 0.5 }),
          style({ transform: 'translateX(0)', opacity: 1 })
        ]))
      ])
    ]),
    trigger('speakBtn', [
      state('void', style({ transform: 'translateY(-50px)', opacity: 0 })),
      state('*', style({ transform: 'translateY(0)', opacity: 1 })),
      transition('void <=> *', animate(250))
    ]),

    trigger('contentPane', [
      transition(':enter', [
        style({ transform: 'translateX(-100vw)' }),
        animate('150ms  150ms ease-in', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'translateX(-100vw)' }))
      ])
    ]),

    trigger('editPane', [
      transition(':enter', [
        style({ transform: 'translateX(100vw)' }),
        animate('150ms 150ms ease-in', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'translateX(100vw)' }))
      ])
    ]),

    trigger('panel', [

      transition('void => *', animate('250ms 250ms ease-in', style({ opacity: 0, width: 0 }))),
      transition('* => void', [
        style({ transform: 'translateX(100%)', width: 0 }),
        animate('150ms ease-out', style({ transform: 'translateX(0)', width: '*' }))
      ]),
    ])
  ]
})
export class ItemViewComponent implements OnChanges, AfterViewInit {

  @Input() item: Item;
  @Input() userVote: Vote | null;
  @Input() numFollows: number;
  @Input() isFollowing: boolean;
  @Input() activeMeeting: string;
  @Input() userComment: Comment | null;
  @Input() votes: Vote[];
  @Input() activeGroup: string;
  @Input() userRep: Representative | null;
  @Input() canEdit: boolean;
  @Input() isEditing: boolean;
  @Input() savePending: boolean;
  @Input() saveError: string | null;

  @Input() numCommentsShown: number;
  @Output() showComments: EventEmitter<number> = new EventEmitter();

  topPro: Comment | null;
  topCon: Comment | null;

  @Input() comments: Comment[];

  @Output() follow: EventEmitter<boolean> = new EventEmitter();
  @Output() vote: EventEmitter<{ itemId: string, value: number, groupId: string }> = new EventEmitter();
  @Output() commentVote: EventEmitter<{ commentId: string, value: number }> = new EventEmitter();
  @Output() comment: EventEmitter<{ itemId: string, text: string, role: string, groupId: string }> = new EventEmitter();
  @Output() back: EventEmitter<any> = new EventEmitter();
  @Output() edit: EventEmitter<boolean> = new EventEmitter();
  @Output() save: EventEmitter<Item> = new EventEmitter();

  @Output() share: EventEmitter<{ provider: ShareProvider, args: ShareArgs }> = new EventEmitter();

  newComment: string;

  voteStats: { yes: number, no: number };

  @ViewChild('addComment', { read: MdInputDirective }) addCommentInput: MdInputDirective;
  addCommentPlaceholder = 'add your statement';

  private _commentOrder: string[] = [];

  editPending: boolean = false;

  edited: {
    text: string,
    resources: string[]
  };

  fbShareBtn = new ShareButton(
    ShareProvider.FACEBOOK,
    ``,
    'facebook'
  );

  tweetBtn = new ShareButton(
    ShareProvider.TWITTER,
    `<i class="fa fa-twitter"></i>`,
    'twitter'
  );

  constructor(private voteSvc: VoteService) { }

  addOrRemoveFollow() {
    this.follow.emit(!this.isFollowing);
  }

  ngAfterViewInit(): void {
    //TODO remove after diagnosing bug # , which causes the page to scroll to the bottom when viewing an item for the first time
    window.scrollTo(0, 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
    if (changes['userVote'] && changes['userVote'].previousValue == null && !!changes['userVote'].currentValue) {
      if (!!this.addCommentInput) {
        //  this.addCommentInput.focus();
      }
    }
    if (changes['votes'] && !!changes['votes'].currentValue) {
      this.voteStats = {
        yes: this.votes.filter(vote => vote.value == 1).length,
        no: this.votes.filter(vote => vote.value == -1).length,
      }
    }

    if (changes[ 'item' ] && !!this.item) {
      this.edited = {
        text: this.item.text,
        resources: (this.item.resourceLinks || []).map(it => it.url)
      }
    }

  }

  removeResource(idx: number) {
    this.edited.resources.splice(idx, 1);
  }

  addResource() {
    this.edited.resources.push('');
  }

  get itemNumber() {
    if (!this.item || !this.activeMeeting) {
      return 0;
    }
    return this.item.onAgendas[this.activeMeeting].itemNumber;
  }


  get isClosedSession() {
    if (!this.item || !this.activeMeeting || !this.item.onAgendas[ this.activeMeeting ]) {
      return false;
    }
    return this.item.onAgendas[ this.activeMeeting ].closedSession;
  }

  castVote(value: number) {
    this.vote.emit({ itemId: this.item.id, value, groupId: this.activeGroup });
  }

  postComment() {
    let role = !this.userVote ? 'neutral' : this.userVote.value == 1 ? 'pro' : 'con';
    this.comment.emit({ itemId: this.item.id, text: this.newComment, role, groupId: this.activeGroup })
  }


  editComment(edited: { text?: string, role?: string }) {
    console.log('editing comment');
    let push = {
      itemId: this.item.id,
      role: edited.role || this.userComment.role,
      text: edited.text || this.userComment.text,
      groupId: this.activeGroup
    };
    this.comment.emit(push);
  }

  userVoteFor(id: string) {
    return this.voteSvc.getSessionUserVoteFor(id);
  }

  hasChanges() {
    if (this.edited.text != this.item.text || this.edited.resources.length !== this.item.resourceLinks.length) {
      return true;
    }
    for (let i = 0; i < this.edited.resources.length; i++) {
      if (this.edited.resources[ i ] !== this.item.resourceLinks[ i ].url) {
        return true;
      }
    }
    return false;
  }

  saveChanges() {
    let resourceLinks = this.edited.resources
      .filter(it => !!it)
      .map(str => ({ url: str }));

    let it: Item = { ...this.item, text: this.edited.text, resourceLinks };
    this.save.emit(it);
  }

  get userVoteVal(): number | null {
    return !this.userVote ? null : this.userVote.value;
  }

  showMoreComments() {
    this.showComments.emit(this.numCommentsShown);
  }

  visibleComments(): Comment[] {
    if (!!this.comments && this._commentOrder.length < this.comments.length) {
      console.log('sorting');
      this.comments
        .sort((x, y) => (y.voteStats.up - y.voteStats.down) - (x.voteStats.up - x.voteStats.down));
      this._commentOrder = this.comments.map(it => it.id);
    }
    return this.comments
      .sort((x, y) => this._commentOrder.indexOf(x.id) - this._commentOrder.indexOf(y.id))
      .slice(0, this.numCommentsShown);
  }

  doShare(provider: 'facebook' | 'twitter' | 'google') {
    const url = `https://civinomics.com/group/${this.activeGroup}/meeting/${this.activeMeeting}/item/${this.item.id}`;
    const args = new ShareArgs(
      url,
      '',
      this.item.text,
      `https://civinomics.com/assets/img/civ_logo_dark.png`
    );

    this.share.emit(
      {
        provider: provider == 'facebook' ? ShareProvider.FACEBOOK : provider == 'twitter' ? ShareProvider.TWITTER : ShareProvider.GOOGLEPLUS,
        args
      });
  }

}
