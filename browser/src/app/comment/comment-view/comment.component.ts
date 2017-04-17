import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { MdInputDirective } from '@angular/material';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Comment } from '../../core/models';
import { CommentService } from '../comment.service';

@Component({
    selector: 'civ-comment',
    templateUrl: './comment.component.html',
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
        ]),
        trigger('resetBtn', [
            state('void', style({ transform: 'translateX(-50px)', width: 0, opacity: 0 })),
            state('*', style({ transform: 'translateX(0)', width: '*', opacity: 1 })),
            transition('void <=> *', animate(150))
        ])

    ]
})
export class CommentComponent implements OnInit {

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

    get showAuthor() { return this._showAuthor}


    @Input() set showVotes(val: boolean) { this._showVotes = val; }

    get showVotes() { return this._showVotes}


    @Input() set showReplies(val: boolean) { this._showReplies = val; }

    get showReplies() { return this._showReplies}


    @Input() set showVoteBtn(val: boolean) { this._showVoteBtn = val; }

    get showVoteBtn() { return this._showVoteBtn}


    @Input() set showReplyBtn(val: boolean) { this._showReplyBtn = val; }

    get showReplyBtn() { return this._showReplyBtn}

    @Output() edit: EventEmitter<{ text?: string, role?: string }> = new EventEmitter();

    @ViewChild('editInput', { read: MdInputDirective }) input: MdInputDirective;

    isEditing: boolean = false;

    newText: string;
    originalText: string;

    constructor(private commentSvc: CommentService) {
    }

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
        return this.comment.author.districts[ this.activeContext ];
    }

}
