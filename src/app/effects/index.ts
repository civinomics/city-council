import { FocusStateEffects } from './focus-state.effects';
import { EffectsModule } from '@ngrx/effects';
export const EFFECTS = [
  FocusStateEffects
];

export const RUN_EFFECTS = EFFECTS.map(it => EffectsModule.run(it));
