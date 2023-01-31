import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, SIZE, TYPES } from "../defs";
import { parseExpr } from "../expr";
import { lexer, tokenizer } from "../lexer";
import {
	addIteratorVar,
	addVar,
	declareVar,
	findIteratorVar,
	findVar,
	getVarType,
} from "../vars";

export function parserFor() {
	const varName = lexer();
	if (varName == null) return ERRORS.SYNTAX_ERROR;

	let iteratorIdx = -1;
	let varIdx = findVar(varName);
	if (varIdx < 0) varIdx = declareVar(varName, 0);
	else iteratorIdx = findIteratorVar(varIdx);

	if (iteratorIdx < 0) iteratorIdx = addIteratorVar(varIdx);

	if (getVarType(varIdx) !== TYPES.int) return ERRORS.TYPE_MISMATCH;

	// const iteratorIdx = addIteratorVar(varIdx);
	writeBufferProgram(SIZE.word, iteratorIdx);

	if (lexer() !== "=") return ERRORS.SYNTAX_ERROR;

	let err = parseExpr();
	if (err) return err;
	writeBufferProgram(SIZE.byte, TYPES.END);

	if (tokenizer() !== CMDS.TO) return ERRORS.SYNTAX_ERROR;

	err = parseExpr();
	if (err) return err;
	writeBufferProgram(SIZE.byte, TYPES.END);

	if (tokenizer(true) === CMDS.STEP) {
		lexer();
		err = parseExpr();
		if (err) return err;
	} else {
		writeBufferProgram(SIZE.byte, TYPES.int);
		writeBufferProgram(SIZE.word, 1);
	}
	writeBufferProgram(SIZE.byte, TYPES.END);

	return 0;
}

export function parserNext() {
	const varName = lexer();
	if (!varName) return ERRORS.SYNTAX_ERROR;

	let varIdx = findVar(varName);
	if (varIdx < 0)
		// varIdx= addVar(varName, context.level);
		varIdx = addVar(varName, 0);

	if (getVarType(varIdx) !== TYPES.int) return ERRORS.TYPE_MISMATCH;

	let iteratorIdx = findIteratorVar(varIdx);
	if (iteratorIdx < 0) iteratorIdx = addIteratorVar(varIdx);
	writeBufferProgram(SIZE.word, iteratorIdx);

	return 0;
}
