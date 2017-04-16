import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingAgendaComponent } from './meeting-agenda.component';

describe('MeetingAgendaComponent', () => {
  let component: MeetingAgendaComponent;
  let fixture: ComponentFixture<MeetingAgendaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MeetingAgendaComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetingAgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
