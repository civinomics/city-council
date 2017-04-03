import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {SignInContainerComponent} from './signin-container.component';

describe('SignInContainerComponent', () => {
  let component: SignInContainerComponent;
  let fixture: ComponentFixture<SignInContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SignInContainerComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignInContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
