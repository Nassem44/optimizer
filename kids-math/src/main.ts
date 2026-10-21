import './styles.css';
import { load } from './storage/store';
import { createApp, type Screen } from './ui/app';
import { mapScreen } from './ui/screens/map';
import { endScreen, sessionScreen } from './ui/screens/session';
import { parentScreen } from './ui/screens/parent';
import { harness } from './ui/harness';

const root = document.getElementById('app')!;

if (location.hash.startsWith('#harness')) {
  // صفحة اختبار العرض (tests/ui) — لا تظهر للطفل
  root.replaceChildren(harness(location.hash));
} else {
  void load().then((state) => {
    const app = createApp(state, root, (app, s: Screen) => {
      switch (s) {
        case 'map': return mapScreen(app);
        case 'session': return sessionScreen(app);
        case 'end': return endScreen(app);
        case 'parent': return parentScreen(app);
      }
    });
    app.go('map');
  });
}
