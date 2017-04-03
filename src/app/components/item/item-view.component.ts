import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {animate, keyframes, state, style, transition, trigger} from '@angular/animations';
import {AgendaItem} from '../../models/item';
import {MdInputDirective} from '@angular/material';

@Component({
  selector: 'civ-item-view',
  templateUrl: './item-view.component.html',
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
export class ItemViewComponent implements OnInit {
  @Input() item: AgendaItem;


  userVote: 'yes' | 'no';
  userComment: string = '';

  @ViewChild('addComment', { read: MdInputDirective }) addCommentInput: MdInputDirective;
  addCommentPlaceholder = 'why you haven\'t voted';


  constructor() { }

  ngOnInit() {
  }


  vote(val: 'yes' | 'no') {
    if (this.userVote == val) {
      this.userVote = null;
      this.addCommentPlaceholder = 'why you haven\'t voted';
    } else {
      this.userVote = val;
      this.addCommentPlaceholder = `why you voted ${val}`;
      if (!!this.addCommentInput) {
        this.addCommentInput.focus();
      }
    }
  }

  postComment() {
    this.userComment = this.addCommentInput.value;
    this.addCommentInput.value = '';
  }

  share(provider: 'facebook' | 'google' | 'twitter') {

  }


}
