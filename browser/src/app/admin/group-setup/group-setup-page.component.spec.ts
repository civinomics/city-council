import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupSetupPageComponent } from './group-setup-page.component';

describe('GroupSetupPageComponent', () => {
  let component: GroupSetupPageComponent;
  let fixture: ComponentFixture<GroupSetupPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupSetupPageComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupSetupPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
