import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupSetupViewComponent } from './group-setup-view.component';

describe('GroupSetupViewComponent', () => {
  let component: GroupSetupViewComponent;
  let fixture: ComponentFixture<GroupSetupViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupSetupViewComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupSetupViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
