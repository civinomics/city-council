import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateMeetingPageComponent } from './create-meeting-page.component';

describe('CreateMeetingPageComponent', () => {
  let component: CreateMeetingPageComponent;
  let fixture: ComponentFixture<CreateMeetingPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateMeetingPageComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateMeetingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
