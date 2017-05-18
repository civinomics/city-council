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
import { MdInputDirective } from '@angular/material';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Comment } from '../../core/models';
import { Vote } from '../../vote/vote.model';

@Component({
    selector: 'civ-comment',
    templateUrl: './comment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: [ './comment.component.scss' ],
    animations: [
        trigger('editBtnRow', [
            state('void', style({ transform: 'translateY(-50px)', opacity: 0 })),
            state('*', style({ transform: 'translateY(0)', opacity: 1 })),
            transition('void <=> *', animate(150))
        ]),
        trigger('editBtn', [
            state('void', style({ transform: 'translateX(50px)', width: 0, opacity: 0 })),
            state('*', style({ transform: 'translateX(0)', width: '*', opacity: 1 })),
            transition('void <=> *', animate(150))
        ])

    ]
})
export class CommentComponent implements OnInit, OnChanges {



  @Input() comment: Comment;

    @Input() canEdit: boolean;

    /**
     * the ID of the
     */
    @Input() activeContext: string = 'id_acc';

    _showAuthor: boolean = true;
    _showVotes: boolean = true;
    _showReplies: boolean = true;
    _showVoteBtn: boolean = true;
    _showReplyBtn: boolean = true;

    @Input() set showAuthor(val: boolean) { this._showAuthor = val; }

  @Input() set textOnly(val: any) {
    this._showAuthor = false;
    this._showVotes = false;
    this._showReplies = false;
    this._showVoteBtn = false;
    this._showReplyBtn = false;
  }


    get showAuthor() { return this._showAuthor}


    @Input() set showVotes(val: boolean) { this._showVotes = val; }

    get showVotes() { return this._showVotes}


    @Input() set showReplies(val: boolean) { this._showReplies = val; }

    get showReplies() { return this._showReplies}


    @Input() set showVoteBtn(val: boolean) { this._showVoteBtn = val; }

    get showVoteBtn() { return this._showVoteBtn}


    @Input() set showReplyBtn(val: boolean) { this._showReplyBtn = val; }

    get showReplyBtn() { return this._showReplyBtn}

  @Input() userVote: Vote | null;

    @Output() edit: EventEmitter<{ text?: string, role?: string }> = new EventEmitter();
  @Output() vote: EventEmitter<number> = new EventEmitter();

    @ViewChild('editInput', { read: MdInputDirective }) input: MdInputDirective;

    isEditing: boolean = false;

    newText: string;
    originalText: string;


  //there's a bit of a lag waiting for the user vote to update, this just prevents that from being visible
  private _forceUserVote: number = -2;

  constructor() {}

    ngOnInit() {
        this.newText = this.originalText = this.comment.text;
    }

    toggleEditing() {
        this.isEditing = !this.isEditing;
        if (this.isEditing) {
            setTimeout(() => {
                this.input.focus();
            });
        }
    }

    saveEdit() {
        this.edit.emit({ text: this.newText });
        this.isEditing = false;
    }

    get authorDistrict() {
      if (!this.comment.author) {
        return null;
      }
        return this.comment.author.districts[ this.activeContext ];
    }

  get authorIcon() {
    if (!this.comment.author) {
      return null;
    }
    return this.comment.author.icon;
  }

  get authorName() {
    if (!this.comment.author) {
      return ''
    }
    return `${this.comment.author.firstName} ${this.comment.author.lastName}`
  }

  castVote(value: number) {
    if (!!this.userVote && this.userVote.value == value) {
      this._forceUserVote = 0;
    } else {
      this._forceUserVote = value;
    }

    console.log('set _forceUserVote - calling cdr.dc()');

    this.vote.emit(value);

  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes[ 'comment' ]) {
      console.log(changes[ 'comment' ]);
    }
    if (changes[ 'userVote' ]) {
      this._forceUserVote = -2;
      console.log('received updated userVote - setting _forceUserVote to -2');
    }
  }

  get userVotedUp() {
    return this._forceUserVote == 1 || (!!this.userVote && this.userVote.value == 1);
  }


  get userVotedDown() {
    return this._forceUserVote == -1 || (!!this.userVote && this.userVote.value == -1);
  }


}
