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
import {animate, keyframes, state, style, transition, trigger} from '@angular/animations';
import {Item} from '../../models/item';
import {MdInputDirective} from '@angular/material';
import {Vote} from '../../models/vote';

@Component({
  selector: 'civ-item-view',
  templateUrl: './item-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: [ './item-view.component.scss' ],
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
  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
  }

  @Input() item: Item;
  @Input() userVote: Vote | null;

  @Output() vote: EventEmitter<{ itemId: string, value: 1 | -1 }> = new EventEmitter();

  userComment: string = '';

  @ViewChild('addComment', { read: MdInputDirective }) addCommentInput: MdInputDirective;
  addCommentPlaceholder = 'why you haven\'t voted';


  constructor() { }

  ngOnInit() {
  }


  castVote(value: 1 | -1) {
    this.vote.emit({itemId: this.item.id, value});
  }

  postComment() {
    this.userComment = this.addCommentInput.value;
    this.addCommentInput.value = '';
  }

  share(provider: 'facebook' | 'google' | 'twitter') {

  }

  get userVoteVal(): 1 | -1 | null {
    return !this.userVote ? null : this.userVote.value;
  }


}
