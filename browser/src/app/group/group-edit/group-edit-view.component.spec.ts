import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupEditViewComponent } from './group-edit-view.component';

describe('GroupEditViewComponent', () => {
  let component: GroupEditViewComponent;
  let fixture: ComponentFixture<GroupEditViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupEditViewComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupEditViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
