export interface IStyle {
    scale: number;
    render: (input: string) => string;
}
export interface IStyles {
    password: IStyle;
    emoji: IStyle;
    invisible: IStyle;
    default: IStyle;
}
export declare const styles: Readonly<IStyles>;
export declare const render: (type: "password" | "default" | "emoji" | "invisible") => IStyle;
export interface ISymbols {
    aborted: string;
    done: string;
    default: string;
}
export declare const symbols: Readonly<ISymbols>;
export declare const symbol: (done: boolean, aborted: boolean) => string;
export declare const delimiter: (completing: boolean) => string;
export declare const item: (expandable: boolean, expanded: boolean) => string;
