import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MeetingContainerComponent} from './meeting-container.component';

describe('MeetingContainerComponent', () => {
  let component: MeetingContainerComponent;
  let fixture: ComponentFixture<MeetingContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MeetingContainerComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetingContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
