export class Mutable<T> {
  state: T;

  constructor(initial: T) {
    this.state = initial;
  }
}
