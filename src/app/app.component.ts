import { Component } from '@angular/core';
import { DataSource, CollectionViewer } from '@angular/cdk/collections';

import * as Rx from 'rxjs/Rx';

// tslint:disable-next-line:interface-over-type-literal
type TimestampSourceMap = {
  time: number,
  [source: string]: any
};

class TimestampSourceMapDataSource extends DataSource<TimestampSourceMap> {
  constructor(private sourceData: Rx.Observable<TimestampSourceMap[]>) {
    super();
  }
  connect(collectionViewer: CollectionViewer): Rx.Observable<TimestampSourceMap[]> {
    return this.sourceData;
  }
  disconnect(collectionViewer: CollectionViewer) {

  }
}


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
  headers: string[];

  render: Rx.Observable<TimestampSourceMap[]>;

  tableData: TimestampSourceMapDataSource;

  startTime = Date.now();

  readonly streams: {[source: string]: Rx.Observable<any>} = {
    alpha: this.alpha$,
    num: this.num$
  };

  readonly actions: {[source: string]: () => void} = {
    alpha: this.pushAlpha,
  };

  readonly actionKeys: string[];

  private setupPlayground() {
    // ####################################################
    // #
    // #       setup playground here
    // #
    // #####################################################

    // add streams to render
    this.streams['sample'] = this.alpha$.sample(this.num$);
    // this.streams['interval'] = Rx.Observable.interval(1000);

    // add input to the input bar
    this.actions['num'] = this.pushNum;
  }

  pushAlpha() {
    this.alpha$.next(this._alphaGen.next().value);
  }

  pushNum() {
    this.num$.next(this._numGen.next().value);
  }

  private *_generator(characters: string[]): IterableIterator<string> {
    for (let i = 0; true; i = (i + 1) % characters.length) { yield characters[i]; }
  }

  private normalize(value: number, decimal = 1) {
    return Math.floor(value / decimal) * decimal;
  }

  constructor() {
    this.setupPlayground();

    // create the initial header list from the keys for the stream
    const headers = Object.keys(this.streams);

    // create an observable of all the streams
    this.render = Rx.Observable.from(
      // use the headers to map the streams to additional metadata
      headers.map(key =>
        this.streams[key].map(v => {
          const d: { time: number, [header: string]: any} = {
            // timestamp of when the data entered the stream
            time: this.normalize(Date.now() - this.startTime),
            [key]: v
          };

          return d;
        })
      )
    )

    // bring everything into a single stream
    .mergeAll()

    // group items by timestamp
    .groupBy(v => v.time)

    // merge the group streams into a single collection of source: value pairs
    .mergeMap(o =>
      o.takeUntil(Rx.Observable.timer(10))
      .reduce<TimestampSourceMap>(Object.assign, {time: 0})
    )

    // bring everything into a single collection for the view
    .scan((acc, value) => {
      acc.push(value);
      return acc;
    }, [])

    // multicast the data so new subscribers do not cause duplicate data
    .share();

    // this.render.subscribe(v => console.log(v));

    this.tableData = new TimestampSourceMapDataSource(this.render);

    // insert an extra header for the timestamp
    this.headers = ['time', ...headers];
    this.actionKeys = Object.keys(this.actions);
    this.actionKeys.forEach(a => this.actions[a] = this.actions[a].bind(this));
  }
}
