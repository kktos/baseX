import { readBufferProgram } from "../../buffer";
import { ERRORS, SIZE } from "../../defs";
import { ITERATOR, getIteratorVar, getVar, setVar } from "../../vars";
import { addInt16, cmpInt16 } from "../vm";
import { context } from "../vm.def";

export function nextStatement() {
	const iteratorIdx = readBufferProgram(SIZE.word);

	const inc = getIteratorVar(iteratorIdx, ITERATOR.INC);
	const max = getIteratorVar(iteratorIdx, ITERATOR.MAX);
	const varIdx = getIteratorVar(iteratorIdx, ITERATOR.VAR);

	const sum = addInt16(inc, getVar(varIdx));

	if (cmpInt16(sum, max, "<=")) {
		setVar(varIdx, sum);
		context.lineIdx = getIteratorVar(iteratorIdx, ITERATOR.PTR);
	}

	return ERRORS.NONE;
}
