import type { AppState } from '../engine/progress';
import { save } from '../storage/store';
import { setMuted } from './sound';

export type Screen = 'map' | 'session' | 'end' | 'parent';

export interface App {
  state: AppState;
  root: HTMLElement;
  go(screen: Screen): void;
  persist(): Promise<void>;
}

export function createApp(state: AppState, root: HTMLElement, render: (app: App, s: Screen) => HTMLElement): App {
  const app: App = {
    state,
    root,
    go(screen) {
      setMuted(app.state.settings.muted);
      root.replaceChildren(render(app, screen));
      root.scrollTop = 0;
    },
    persist: () => save(app.state),
  };
  return app;
}
