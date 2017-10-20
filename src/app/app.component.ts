import { Component } from '@angular/core';

import * as Rx from 'rxjs/Rx';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  private _alphaGen = this._generator('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
  private _numGen = this._generator('0123456789'.split(''));

  readonly alpha$ = new Rx.Subject<string>();
  readonly num$ = new Rx.Subject<string>();

  pushAlpha() {
    this.alpha$.next(this._alphaGen.next().value);
  }

  pushNum() {
    this.num$.next(this._numGen.next().value);
  }

  private *_generator(characters: string[]): IterableIterator<string> {
    for (let i = 0; true; i = (i + 1) % characters.length) { yield characters[i]; }
  }

  private scan(arg: {key: string, observable: Rx.Observable<any>}): Rx.Observable<{source: string, values: any[]}> {
    const {key, observable} = arg;
    return observable
    // add a timestamp to each entry
    .map(v => ({timestamp: Date.now(), value: v}))

    // collect the results
    .scan((acc: any[], value: any) => {
      acc.push(value);
      return acc;
    }, [])

    // tag the collection with the source stream
    .map(v => ({source: key, values: v}));
  }

  constructor() {
    const t = (key: string, observable: Rx.Observable<any>) => ({key, observable});
    Rx.Observable.from([
      t('alpha', this.alpha$),
      t('num', this.num$),
    ].map(this.scan))

    // bring everything into a single stream
    .mergeAll()

    // log
    .subscribe(v => console.log(`${v.source}: [${v.values.map(a => a.value).join(', ')}]`));
  }
}
