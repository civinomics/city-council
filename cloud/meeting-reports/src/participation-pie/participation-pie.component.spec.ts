import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ParticipationPieComponent} from './participation-pie.component';

describe('ParticipationPieComponent', () => {
  let component: ParticipationPieComponent;
  let fixture: ComponentFixture<ParticipationPieComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ParticipationPieComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParticipationPieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
