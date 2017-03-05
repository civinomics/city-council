import { CivCcPage } from './app.po';

describe('civ-cc App', () => {
  let page: CivCcPage;

  beforeEach(() => {
    page = new CivCcPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('civ works!');
  });
});
