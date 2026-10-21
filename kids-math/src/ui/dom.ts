type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, unknown> & { class?: string; style?: string; dir?: string };

/** h('div', {class: 'x', onclick: fn}, ...children) */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else if (k === 'class') el.className = String(v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
}

export const clear = (el: Element) => {
  while (el.firstChild) el.removeChild(el.firstChild);
};

export function shake(el: Element) {
  el.classList.remove('shake');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('shake');
}
