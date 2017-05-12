import { ActivityPipe } from './activity.pipe';

describe('ActivityPipe', () => {
  it('create an instance', () => {
    const pipe = new ActivityPipe();
    expect(pipe).toBeTruthy();
  });
});
