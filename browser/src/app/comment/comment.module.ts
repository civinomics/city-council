import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { CommentComponent } from './comment-view/comment.component';
import { CommentService } from './comment.service';

@NgModule({
    imports: [
        SharedModule
    ],
    declarations: [ CommentComponent ],
    exports: [ CommentComponent ],
    providers: [ CommentService ]
})
export class CommentModule {
}
