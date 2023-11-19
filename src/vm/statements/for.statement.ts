import { readBufferProgram } from "../../buffer";
import { ERRORS, SIZE, TYPES } from "../../defs";
import { ITERATOR, getIteratorVar, setIteratorVar, setVar } from "../../vars";
import { evalExpr, expr } from "../expr.vm";
import { context } from "../vm.def";

export function forStatement() {
	const iteratorIdx = readBufferProgram(SIZE.word);

	let err = evalExpr();
	if (err) return err;
	if (expr.type === TYPES.string) return ERRORS.TYPE_MISMATCH;

	const varIdx = getIteratorVar(iteratorIdx, ITERATOR.VAR);
	setVar(varIdx, expr.value);

	// upper bound
	err = evalExpr();
	if (err) return err;
	setIteratorVar(iteratorIdx, ITERATOR.MAX, expr.value);

	// step
	err = evalExpr();
	if (err) return err;
	setIteratorVar(iteratorIdx, ITERATOR.INC, expr.value);

	setIteratorVar(iteratorIdx, ITERATOR.PTR, context.lineIdx);

	return ERRORS.NONE;
}
