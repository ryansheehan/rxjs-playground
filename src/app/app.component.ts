import { Component } from '@angular/core';
import { DataSource, CollectionViewer } from '@angular/cdk/collections';

import * as Rx from 'rxjs/Rx';

// tslint:disable-next-line:interface-over-type-literal
type TimestampSourceMap = {
  time: number,
  [source: string]: any
};

class TimestampSourceMapDataSource extends DataSource<TimestampSourceMap> {

  constructor(private data: Rx.Observable<TimestampSourceMap[]>) {
    super();
  }
  connect(collectionViewer: CollectionViewer): Rx.Observable<TimestampSourceMap[]> {
    return this.data;
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

  private setupPlayground() {
    // playground here
    this.streams['sample'] = this.alpha$.sample(this.num$);
    // this.streams['mapTo'] = this.streams['sample'].mapTo('true');
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

  private normalize(value: number, decimal = 10) {
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

          // headers.forEach(header => d[header] = header === key ? v : undefined);

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

    .map(v => {
      headers.forEach(h => v[h] = v[h] || '');
      return v;
    })

    // bring everything into a single collection for the view
    .scan((acc, value) => {
      acc.push(value);
      return acc;
    }, [])

    //.startWith([]);

    this.render.subscribe(v => console.log(v));

    this.tableData = new TimestampSourceMapDataSource(this.render);

    // insert an extra header for the timestamp
    this.headers = ['time', ...headers];
  }
}
