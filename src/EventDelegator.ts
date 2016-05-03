import {Stream} from 'xstream';
import {ScopeChecker} from './ScopeChecker';
import {IsolateModule} from './isolateModule';
import {getScope, getSelectors} from './utils';

interface MatchesSelector {
  (element: Element, selector: string): boolean;
}
let matchesSelector: MatchesSelector;
declare var require: any;
try {
  matchesSelector = require(`matches-selector`);
} catch (e) {
  matchesSelector = <MatchesSelector> Function.prototype;
}

interface Destination {
  subject: Stream<Event>;
  scopeChecker: ScopeChecker;
  selector: string;
}

export interface PatchedEvent extends Event {
  propagationHasBeenStopped?: boolean;
  ownerTarget?: Element;
}

/**
 * Attaches an actual event listener to the DOM root element,
 * handles "destinations" (interested DOMSource output subjects), and bubbling.
 */
export class EventDelegator {
  private destinations: Array<Destination> = [];
  private roof: Element;

  constructor(rootElement: Element,
              public eventType: string,
              public useCapture: boolean,
              public isolateModule: IsolateModule) {
    this.roof = rootElement.parentElement;
    if (useCapture) {
      rootElement.addEventListener(eventType, ev => this.capture(ev), useCapture);
    } else {
      rootElement.addEventListener(eventType, ev => this.bubble(ev), useCapture);
    }
  }

  bubble(rawEvent: Event): void {
    const ev = this.patchEvent(rawEvent);
    for (let el = <Element> ev.target; el && el !== this.roof; el = el.parentElement) {
      if (ev.propagationHasBeenStopped) {
        return;
      }
      this.matchEventAgainstDestinations(el, ev);
    }
  }

  matchEventAgainstDestinations(el: Element, ev: PatchedEvent) {
    for (let i = 0, n = this.destinations.length; i < n; i++) {
      const dest = this.destinations[i];
      if (!dest.scopeChecker.isStrictlyInRootScope(el)) {
        continue;
      }
      if (matchesSelector(el, dest.selector)) {
        this.mutateEventCurrentTarget(ev, el);
        dest.subject.shamefullySendNext(ev);
      }
    }
  }

  capture(ev: Event) {
    for (let i = 0, n = this.destinations.length; i < n; i++) {
      const dest = this.destinations[i];
      if (matchesSelector((<Element> ev.target), dest.selector)) {
        dest.subject.shamefullySendNext(ev);
      }
    }
  }

  addDestination(subject: Stream<Event>, namespace: Array<string>) {
    const scope = getScope(namespace);
    const selector = getSelectors(namespace);
    const scopeChecker = new ScopeChecker(scope, this.isolateModule);
    this.destinations.push({subject, scopeChecker, selector});
  }

  patchEvent(event: Event): PatchedEvent {
    const pEvent: PatchedEvent = <PatchedEvent> event;
    pEvent.propagationHasBeenStopped = false;
    const oldStopPropagation = pEvent.stopPropagation;
    pEvent.stopPropagation = function stopPropagation() {
      oldStopPropagation.call(this);
      this.propagationHasBeenStopped = true;
    };
    return pEvent;
  }

  mutateEventCurrentTarget(event: PatchedEvent, currentTargetElement: Element) {
    try {
      Object.defineProperty(event, `currentTarget`, {
        value: currentTargetElement,
        configurable: true,
      });
    } catch (err) {
      console.log(`please use event.ownerTarget`);
    }
    event.ownerTarget = currentTargetElement;
  }
}
