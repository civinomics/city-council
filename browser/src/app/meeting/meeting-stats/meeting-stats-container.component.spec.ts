import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingStatsContainerComponent } from './meeting-stats-container.component';

describe('MeetingStatsContainerComponent', () => {
  let component: MeetingStatsContainerComponent;
  let fixture: ComponentFixture<MeetingStatsContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MeetingStatsContainerComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetingStatsContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
