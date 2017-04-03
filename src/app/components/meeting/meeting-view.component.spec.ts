import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MeetingViewComponent} from './meeting-view.component';

describe('MeetingViewComponent', () => {
  let component: MeetingViewComponent;
  let fixture: ComponentFixture<MeetingViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MeetingViewComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetingViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
