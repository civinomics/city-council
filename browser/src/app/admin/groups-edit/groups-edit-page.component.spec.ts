import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupsEditPageComponent } from './groups-edit-page.component';

describe('GroupsEditPageComponent', () => {
  let component: GroupsEditPageComponent;
  let fixture: ComponentFixture<GroupsEditPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupsEditPageComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupsEditPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
