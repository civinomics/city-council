import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MeetingStatsComponent} from './meeting-stats.component';

describe('MeetingStatsComponent', () => {
  let component: MeetingStatsComponent;
  let fixture: ComponentFixture<MeetingStatsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MeetingStatsComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetingStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
