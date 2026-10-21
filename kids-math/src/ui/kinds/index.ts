import type { Question } from '../../engine/types';
import type { Ctx, KindView } from './types';
import { freeVerticalView, placeValueView, spotErrorView, vgridView } from './vertical';
import { fillBlankView, matchView, wordView } from './addition';
import { compareView, completeGraphView, conceptualView, countSceneView, graphReadView, graphToTableView, missingNameView } from './graph';

/** نوع السؤال ← مكوّنه. نوع جديد = سطر جديد هنا. */
export function viewFor(q: Question, ctx: Ctx): KindView {
  switch (q.kind) {
    case 'vgrid': return vgridView(q, ctx);
    case 'placeValue': return placeValueView(q, ctx);
    case 'freeVertical': return freeVerticalView(q, ctx);
    case 'spotError': return spotErrorView(q, ctx);
    case 'matchEqual': return matchView(q, ctx);
    case 'wordProblem': return wordView(q, ctx);
    case 'fillBlank': return fillBlankView(q, ctx);
    case 'countScene': return countSceneView(q, ctx);
    case 'completeGraph': return completeGraphView(q, ctx);
    case 'graphToTable': return graphToTableView(q, ctx);
    case 'missingName': return missingNameView(q, ctx);
    case 'graphRead': return graphReadView(q, ctx);
    case 'conceptual': return conceptualView(q, ctx);
    case 'compareGraphs': return compareView(q, ctx);
  }
}
