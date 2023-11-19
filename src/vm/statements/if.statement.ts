import { readBufferProgram } from "../../buffer";
import { ERRORS, SIZE } from "../../defs";
import { evalExpr, expr } from "../expr.vm";

export function ifStatement() {
	const err = evalExpr();
	if (err) return err;

	if (!expr.value) return ERRORS.NONE;

	readBufferProgram(SIZE.byte);

	return ERRORS.NONE;
}
