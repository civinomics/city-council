import {browser, by, element} from 'protractor';

export class CityCouncilPage {
  navigateTo() {
    return browser.get('/');
  }

  getParagraphText() {
    return element(by.css('civ-root h1')).getText();
  }
}
