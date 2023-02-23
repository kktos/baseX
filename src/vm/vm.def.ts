import { prgCode, TPrgBuffer } from "../defs";
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

