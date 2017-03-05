import { browser, element, by } from 'protractor';

export class CivCcPage {
  navigateTo() {
    return browser.get('/');
  }

  getParagraphText() {
    return element(by.css('civ-root h1')).getText();
  }
}
