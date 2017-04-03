import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {PlaceContainerComponent} from './place-container.component';

describe('PlaceContainerComponent', () => {
  let component: PlaceContainerComponent;
  let fixture: ComponentFixture<PlaceContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlaceContainerComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlaceContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
