export class Mutable<T> {
  value: T;

  constructor(initial: T) {
    this.value = initial;
  }
}
