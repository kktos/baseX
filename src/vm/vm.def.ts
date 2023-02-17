import { TProgram } from "../parser";

export type TExpr = {
	type: number;
	value: number;
	varIdx?: number;
};

export type TContext = TProgram & {
	lineIdx: number;
	lineNum?: number;
	level: number;
	returnExpr: TExpr | null;
	exprStack: TExpr[];
};
