import { run_all } from './utils.js';

let update_scheduled = false;

let dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];

const before_next = [];
const after_next = [];

export const intros = { enabled: false };

export function schedule_update(component) {
	dirty_components.push(component);
	if (!update_scheduled) {
		update_scheduled = true;
		queue_microtask(flush);
	}
}

export function add_render_callback(fn) {
	render_callbacks.push(fn);
}

export function add_binding_callback(fn) {
	binding_callbacks.push(fn);
}

export function beforeNextUpdate(fn) {
	before_next.push(fn);
}

export function afterNextUpdate(fn) {
	after_next.push(fn);
}

export function flush() {
	const seen_callbacks = new Set();

	do {
		// first, call beforeNextUpdate callbacks
		if (before_next.length) run_all(before_next.splice(0, before_next.length));
		
		// then call beforeUpdate functions
		// and update components
		while (dirty_components.length) {
			update(dirty_components.shift().$$);
		}

		while (binding_callbacks.length) binding_callbacks.shift()();

		// then call afterNextUpdate callbacks
		if (after_next.length) run_all(after_next.splice(0, after_next.length));

		// then, once components are updated, call
		// afterUpdate functions. This may cause
		// subsequent updates...
		while (render_callbacks.length) {
			const callback = render_callbacks.pop();
			if (!seen_callbacks.has(callback)) {
				callback();

				// ...so guard against infinite loops
				seen_callbacks.add(callback);
			}
		}
	} while (dirty_components.length + before_next.length + after_next.length);

	update_scheduled = false;
}

function update($$) {
	if ($$.fragment) {
		$$.update($$.dirty);
		run_all($$.before_render);
		$$.fragment.p($$.dirty, $$.ctx);
		$$.dirty = null;

		$$.after_render.forEach(add_render_callback);
	}
}

function queue_microtask(callback) {
	Promise.resolve().then(() => {
		if (update_scheduled) callback();
	});
}