import {inject, TestBed} from '@angular/core/testing';

import {AppFocusService} from './app-focus.service';

describe('AppFocusService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppFocusService]
    });
  });

  it('should ...', inject([AppFocusService], (service: AppFocusService) => {
    expect(service).toBeTruthy();
  }));
});
