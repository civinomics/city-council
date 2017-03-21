import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowseContainerComponent } from './browse-container.component';

describe('BrowseContainerComponent', () => {
  let component: BrowseContainerComponent;
  let fixture: ComponentFixture<BrowseContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrowseContainerComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrowseContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
