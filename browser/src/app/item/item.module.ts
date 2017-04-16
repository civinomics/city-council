import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { ItemService } from './item.service';
import { ItemPageComponent } from './item.page';
import { ItemViewComponent } from './item-view/item-view';
import { CommentModule } from '../comment/comment.module';

@NgModule({
    imports: [
        SharedModule,
        CommentModule
    ],
    declarations: [
        ItemPageComponent, ItemViewComponent
    ],
    providers: [
        ItemService
    ]
})
export class ItemModule {
}
