import { readBufferProgram } from "../../buffer";
import { ERRORS, SIZE } from "../../defs";
import { addVarNameIdx, setVar } from "../../vars";
import { context } from "../vm.def";

export function functionStatement() {
	// function could be run only on call (level>0)
	if (!context.level) {
		return ERRORS.ILLEGAL_STATEMENT;
	}

	// console.log("FUNCTION", context.exprStack);

	// skip function var
	readBufferProgram(SIZE.word);

	let parmCount = readBufferProgram(SIZE.byte);

	// console.log("FUNCTION parmCount", parmCount);

	if (context.exprStack.length < parmCount) {
		return ERRORS.NOT_ENOUGH_PARMS;
	}

	while (parmCount--) {
		const nameIdx = readBufferProgram(SIZE.word);
		const varType = readBufferProgram(SIZE.byte);

		const expr = context.exprStack.pop();
		if (expr?.type !== varType) return ERRORS.TYPE_MISMATCH;

		const varIdx = addVarNameIdx(nameIdx, context.level, varType, false, true);
		setVar(varIdx, expr.value);
	}

	return ERRORS.NONE;
}
