import {CityCouncilPage} from './app.po';

describe('city-council App', () => {
  let page: CityCouncilPage;

  beforeEach(() => {
    page = new CityCouncilPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('civ works!');
  });
});
