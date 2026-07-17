export type ControlDefinition = {
  key: string;
  label: string;
  type: 'range' | 'checkbox' | 'select' | 'text';
  value: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: Array<[string, string]>;
};

export function buildControls(container: HTMLElement, definitions: ControlDefinition[], onChange: (key: string, value: number | boolean | string) => void) {
  container.replaceChildren();
  definitions.forEach((definition) => {
    const wrapper = document.createElement('label');
    wrapper.className = `control-row control-${definition.type}`;
    const text = document.createElement('span');
    text.className = 'control-label';
    text.textContent = definition.label;
    const output = document.createElement('output');
    output.className = 'control-output';
    output.textContent = format(definition.value, definition.unit);
    text.append(output);
    wrapper.append(text);

    let input: HTMLInputElement | HTMLSelectElement;
    if (definition.type === 'select') {
      input = document.createElement('select');
      definition.options?.forEach(([value, label]) => input.append(new Option(label, value)));
      input.value = String(definition.value);
    } else {
      input = document.createElement('input');
      input.type = definition.type;
      if (definition.type === 'checkbox') input.checked = Boolean(definition.value);
      else {
        input.min = String(definition.min ?? 0); input.max = String(definition.max ?? 100); input.step = String(definition.step ?? 1);
        input.value = String(definition.value);
      }
    }
    input.id = `control-${definition.key}`;
    input.dataset.control = definition.key;
    input.addEventListener('input', () => {
      const value = input instanceof HTMLInputElement && input.type === 'checkbox' ? input.checked : input instanceof HTMLInputElement && input.type === 'range' ? Number(input.value) : input.value;
      output.textContent = format(value, definition.unit);
      onChange(definition.key, value);
    });
    wrapper.htmlFor = input.id;
    wrapper.append(input);
    container.append(wrapper);
  });
}

export function buildActions(container: HTMLElement, actions: Array<{ label: string; action: string; primary?: boolean }>, handler: (action: string) => void) {
  container.replaceChildren();
  actions.forEach(({ label, action, primary }) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label; button.dataset.action = action;
    button.className = primary ? 'experiment-button primary' : 'experiment-button';
    button.addEventListener('click', () => handler(action));
    container.append(button);
  });
}

export function updateData(container: HTMLElement, values: Array<[string, string | number]>) {
  const fragment = document.createDocumentFragment();
  values.forEach(([label, value]) => {
    const group = document.createElement('div');
    const term = document.createElement('dt'); term.textContent = label;
    const description = document.createElement('dd'); description.textContent = String(value);
    group.append(term, description); fragment.append(group);
  });
  container.replaceChildren(fragment);
}

export function announce(element: HTMLElement, message: string) { element.textContent = message; }

export function updateDetails(container: HTMLElement, formula: string, symbols: Array<[string, string]>, explanation: string) {
  const symbolRows = symbols.map(([symbol, meaning]) => `<dt>${escapeHtml(symbol)}</dt><dd>${escapeHtml(meaning)}</dd>`).join('');
  container.innerHTML = `<details open><summary>Formula &amp; model</summary><code class="experiment-formula">${escapeHtml(formula)}</code><dl class="symbol-list">${symbolRows}</dl><p>${escapeHtml(explanation)}</p></details>`;
}

function format(value: number | boolean | string, unit = '') {
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  return `${value}${unit ? ` ${unit}` : ''}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}
