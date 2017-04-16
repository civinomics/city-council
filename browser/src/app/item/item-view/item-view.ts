import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';
import { Item } from '../item.model';
import { MdInputDirective } from '@angular/material';
import { Vote } from '../../models/vote';
import { Comment } from '../../models/comment';

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
    trigger('panel', [
      state('void', style({ position: 'absolute' })),
      transition('void => *', animate('250ms 250ms ease-in', style({ opacity: 0, width: 0 }))),
      transition('* => void', [
        style({ transform: 'translateX(100%)', width: 0 }),
        animate('150ms ease-out', style({ transform: 'translateX(0)', width: '*' }))
      ]),
    ])
  ]
})
export class ItemViewComponent implements OnInit, OnChanges {

  @Input() item: Item;
  @Input() userVote: Vote | null;
  @Input() activeMeeting: string;

  @Input() userComment: Comment | null;

  @Input() votes: Vote[];


  @Output() vote: EventEmitter<{ itemId: string, value: number }> = new EventEmitter();
  @Output() comment: EventEmitter<{ itemId: string, text: string, role: string }> = new EventEmitter();


  newComment: string;

  voteStats: { yes: number, no: number };

  @ViewChild('addComment', { read: MdInputDirective }) addCommentInput: MdInputDirective;
  addCommentPlaceholder = 'why you haven\'t voted';



  constructor() { }

  ngOnInit() {
  }


  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
    if (changes['userVote'] && changes['userVote'].previousValue == null && !!changes['userVote'].currentValue) {
      if (!!this.addCommentInput) {
        this.addCommentInput.focus();
      }
    }
    if (changes['votes'] && !!changes['votes'].currentValue) {
      this.voteStats = {
        yes: this.votes.filter(vote => vote.value == 1).length,
        no: this.votes.filter(vote => vote.value == -1).length,
      }
    }
  }

  get itemNumber() {
    if (!this.item || !this.activeMeeting) {
      return 0;
    }
    return this.item.onAgendas[this.activeMeeting].itemNumber;
  }

  castVote(value: number) {
    this.vote.emit({itemId: this.item.id, value});
  }

  postComment() {
    let role = !this.userVote ? 'neutral' : this.userVote.value == 1 ? 'pro' : 'con';
    this.comment.emit({itemId: this.item.id, text: this.newComment, role})
  }

  editComment(edited: { text?: string, role?: string }) {
    console.log('editing comment');
    let push = {
      itemId: this.item.id,
      role: edited.role || this.userComment.role,
      text: edited.text || this.userComment.text
    };
    this.comment.emit(push);
  }

  share(provider: 'facebook' | 'google' | 'twitter') {

  }

  get userVoteVal(): number | null {
    return !this.userVote ? null : this.userVote.value;
  }


}
