import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { AuthService } from '../user/auth.service';

@Injectable()
export class IsSuperuserGuard implements CanActivate {

  constructor(private authService: AuthService) {}

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.authService.sessionUser$
      .filter(it => !!it)
      .take(1)
      .map(user => user.superuser === true);
  }
}
