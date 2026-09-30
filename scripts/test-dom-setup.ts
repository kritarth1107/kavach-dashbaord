/**
 * React decides at import time whether text fields emit input events.
 * This has to run before react-dom is loaded, or a textarea onChange never fires.
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost",
});

const g = globalThis as typeof globalThis & Record<string, unknown>;
g.window = dom.window as unknown as Window & typeof globalThis;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.HTMLInputElement = dom.window.HTMLInputElement;
g.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
g.HTMLButtonElement = dom.window.HTMLButtonElement;
g.File = dom.window.File;
g.Event = dom.window.Event;
g.InputEvent = dom.window.InputEvent;
g.Node = dom.window.Node;
g.IS_REACT_ACT_ENVIRONMENT = true;

export { dom };
