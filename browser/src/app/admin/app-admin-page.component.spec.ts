import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AppAdminPageComponent } from './app-admin-page.component';

describe('AppAdminPageComponent', () => {
  let component: AppAdminPageComponent;
  let fixture: ComponentFixture<AppAdminPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AppAdminPageComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AppAdminPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
