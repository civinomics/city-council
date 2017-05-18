import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupAdminViewComponent } from './group-admin-view';

describe('GroupAdminViewComponent', () => {
  let component: GroupAdminViewComponent;
  let fixture: ComponentFixture<GroupAdminViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupAdminViewComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupAdminViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
