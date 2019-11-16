declare const assignmentCompatibilityHack: unique symbol;

// Returns any keys of TRecord with the type of TMatch
export type MatchingKeys<
	TRecord,
	TMatch,
	K extends keyof TRecord = keyof TRecord
	> = K extends (TRecord[K] extends TMatch ? K : never) ? K : never;
export interface TypeRecord<T, U, V> {
	' _emitterType'?: T;
	' _eventsType'?: U;
	' _emitType'?: V;
}

export type ReturnTypeOfMethod<T> = T extends (...args: any[]) => any
	? ReturnType<T>
	: void;
export type ReturnTypeOfMethodIfExists<T, S extends string> = S extends keyof T
	? ReturnTypeOfMethod<T[S]>
	: void;

export type InnerEEMethodReturnType<T, TValue, FValue> = T extends (
	...args: any[]
) => any
	? ReturnType<T> extends void | undefined ? FValue : TValue
	: FValue;

export type EEMethodReturnType<
	T,
	S extends string,
	TValue,
	FValue = void
	> = S extends keyof T ? InnerEEMethodReturnType<T[S], TValue, FValue> : FValue;

type ListenerType<T> = [T] extends [(...args: infer U) => any]
	? U
	: [T] extends [void] ? [] : [T];

// EventEmitter method overrides
export type OverriddenMethods<
	TEmitter,
	TEventRecord,
	TEmitRecord = TEventRecord
	> = {
		on<P extends keyof TEventRecord, T>(
			this: T,
			event: P,
			listener: (...args: ListenerType<TEventRecord[P]>) => void
		): EEMethodReturnType<TEmitter, 'on', T>;
		on(
			event: typeof assignmentCompatibilityHack,
			listener: (...args: any[]) => any
		): void;

		addListener<P extends keyof TEventRecord, T>(
			this: T,
			event: P,
			listener: (...args: ListenerType<TEventRecord[P]>) => void
		): EEMethodReturnType<TEmitter, 'addListener', T>;
		addListener(
			event: typeof assignmentCompatibilityHack,
			listener: (...args: any[]) => any
		): void;

		addEventListener<P extends keyof TEventRecord, T>(
			this: T,
			event: P,
			listener: (...args: ListenerType<TEventRecord[P]>) => void
		): EEMethodReturnType<TEmitter, 'addEventListener', T>;
		addEventListener(
			event: typeof assignmentCompatibilityHack,
			listener: (...args: any[]) => any
		): void;

		removeListener<P extends keyof TEventRecord, T>(
			this: T,
			event: P,
			listener: (...args: any[]) => any
		): EEMethodReturnType<TEmitter, 'removeListener', T>;
		removeListener(
			event: typeof assignmentCompatibilityHack,
			listener: (...args: any[]) => any
		): void;

		removeEventListener<P extends keyof TEventRecord, T>(
			this: T,
			event: P,
			listener: (...args: any[]) => any
		): EEMethodReturnType<TEmitter, 'removeEventListener', T>;
		removeEventListener(
			event: typeof assignmentCompatibilityHack,
			listener: (...args: any[]) => any
		): void;

		once<P extends keyof TEventRecord, T>(
			this: T,
			event: P,
			listener: (...args: ListenerType<TEventRecord[P]>) => void
		): EEMethodReturnType<TEmitter, 'once', T>;
		once(
			event: typeof assignmentCompatibilityHack,
			listener: (...args: any[]) => any
		): void;

		emit<P extends keyof TEmitRecord, T>(
			this: T,
			event: P,
			...args: ListenerType<TEmitRecord[P]>
		): EEMethodReturnType<TEmitter, 'emit', T>;
		emit(event: typeof assignmentCompatibilityHack, ...args: any[]): void;
	};

export type OverriddenKeys = keyof OverriddenMethods<any, any, any>;

export type StrictEventEmitter<
	TEmitterType,
	TEventRecord,
	TEmitRecord = TEventRecord,
	UnneededMethods extends Exclude<OverriddenKeys, keyof TEmitterType> = Exclude<OverriddenKeys, keyof TEmitterType>,
	NeededMethods extends Exclude<OverriddenKeys, UnneededMethods> = Exclude<OverriddenKeys, UnneededMethods>
	> =
	// Store the type parameters we've instantiated with so we can refer to them later
	TypeRecord<TEmitterType, TEventRecord, TEmitRecord> &

	// Pick all the methods on the original type we aren't going to override
	Pick<TEmitterType, Exclude<keyof TEmitterType, OverriddenKeys>> &

	// Finally, pick the needed overrides (taking care not to add an override for a method
	// that doesn't exist)
	Pick<OverriddenMethods<TEventRecord, TEmitRecord>, NeededMethods>;

export default StrictEventEmitter;
