import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {SignInViewComponent} from './signin-view.component';

describe('SignInViewComponent', () => {
  let component: SignInViewComponent;
  let fixture: ComponentFixture<SignInViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SignInViewComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignInViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
