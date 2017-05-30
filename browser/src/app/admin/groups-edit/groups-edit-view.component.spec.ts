import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AppAdminViewComponent } from './app-admin-view.component';

describe('GroupsEditViewComponent', () => {
  let component: AppAdminViewComponent;
  let fixture: ComponentFixture<AppAdminViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AppAdminViewComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AppAdminViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
