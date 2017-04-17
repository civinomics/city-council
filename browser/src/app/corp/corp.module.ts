import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { AboutComponent } from './about/about.component';
import { SplashComponent } from './splash/splash.component';
import { TermsComponent } from './terms/terms.component';
import { CareersComponent } from './careers/careers.component';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    SharedModule, RouterModule.forChild([])
  ],
  declarations: [
    AboutComponent, SplashComponent, TermsComponent, CareersComponent
  ]
})
export class CorpModule {
}
