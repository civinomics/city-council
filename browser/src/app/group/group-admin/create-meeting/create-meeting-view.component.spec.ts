import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateMeetingViewComponent } from './create-meeting-view.component';

describe('CreateMeetingViewComponent', () => {
  let component: CreateMeetingViewComponent;
  let fixture: ComponentFixture<CreateMeetingViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateMeetingViewComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateMeetingViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
