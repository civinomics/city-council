import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { VoteService } from './vote.service';

@NgModule({
  imports: [
    SharedModule
  ],
  providers: [
    VoteService
  ]
})
export class VoteModule {
}
