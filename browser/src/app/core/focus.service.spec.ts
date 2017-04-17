import { inject, TestBed } from '@angular/core/testing';

import { AppFocusService } from './focus.service';

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
