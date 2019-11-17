import { Key } from 'readline';
import { EventEmitter } from 'events';
import color from 'kleur';

export interface IOnRenderFn {
	(kleur: typeof color): void;
}

export interface IValidatorFn {
	(value: string): Promise<boolean | string>;
}

export interface IPromptOpts {
	stdin?: NodeJS.ReadStream;
	stdout?: NodeJS.WriteStream;
	onRender?: IOnRenderFn;
}

export abstract class PromptActions {
	protected abstract _(c: string, key: Key): void;
	protected abstract first(key?: Key): void;
	protected abstract last(key?: Key): void;
	protected abstract up(key?: Key): void;
	protected abstract down(key?: Key): void;
	protected abstract left(key?: Key): void;
	protected abstract right(key?: Key): void;
	protected abstract submit(key?: Key): void;
	protected abstract abort(key?: Key): void;
	protected abstract reset(key?: Key): void;
	protected abstract delete(key?: Key): void;
	protected abstract deleteForward(key?: Key): void;
	protected abstract next(key?: Key): void;
	protected abstract nextPage(key?: Key): void;
	protected abstract prevPage(key?: Key): void;
}

