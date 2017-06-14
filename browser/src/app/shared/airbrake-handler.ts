import * as airbrake from 'airbrake-js';
import { ErrorHandler } from '@angular/core';
import { environment } from '../../environments/environment';

export class AirbrakeHandler implements ErrorHandler {
  airbrake: airbrake.Client;
  lastErrorTime: number = Date.now();
  lastErrorMessage: string;

  constructor() {

    if (environment.production) {
      this.airbrake = new airbrake({
        projectId: 145494,
        projectKey: 'e222ad4c3f26ba1a05d283bcf73d62e3'
      });
    }

  }

  handleError(error: any): void {
    if (environment.production) {
      const now = Date.now();

      if (now - this.lastErrorTime > 60000 || error.message !== this.lastErrorMessage) {
        this.airbrake.notify(error);
        this.lastErrorTime = now;
        this.lastErrorMessage = error.message;
      }
      throw error;
    }
  }

}
