import { inject, TestBed } from '@angular/core/testing';

import { IsSuperuserGuard } from './is-superuser.guard';

describe('IsSuperuserGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ IsSuperuserGuard ]
    });
  });

  it('should ...', inject([ IsSuperuserGuard ], (guard: IsSuperuserGuard) => {
    expect(guard).toBeTruthy();
  }));
});
