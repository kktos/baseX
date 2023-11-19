import { TPrgBuffer, prgCode } from "../defs";
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

export const program: TPrgBuffer = {
	buffer: prgCode.buffer,
	idx: 0,
};

export const context: TContext = {
	lineIdx: 0,
	level: 0,
	returnExpr: null,
	exprStack: [],
};
