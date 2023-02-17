import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, OPERATORS, SIZE, TOKEN_TYPES, TYPES } from "../defs";
import { lexeme, lexer } from "../lexer";
import { addIteratorVar, addVar, declareVar, findIteratorVar, findVar, getVarType } from "../vars";
import { parseExpr } from "./expr.parser";

export function parserFor() {
	let tok = lexer();
	if (tok.err) return tok.err;
	if (tok.type !== TOKEN_TYPES.IDENTIFER) return ERRORS.SYNTAX_ERROR;

	let iteratorIdx = -1;
	let varIdx = findVar(lexeme);
	if (varIdx < 0) varIdx = declareVar(lexeme, 0);
	else iteratorIdx = findIteratorVar(varIdx);

	if (iteratorIdx < 0) iteratorIdx = addIteratorVar(varIdx);

	if (getVarType(varIdx) !== TYPES.int) return ERRORS.TYPE_MISMATCH;

	// const iteratorIdx = addIteratorVar(varIdx);
	writeBufferProgram(SIZE.word, iteratorIdx);

	tok = lexer();
	if (tok.err) return tok.err;
	if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== OPERATORS.EQ) return ERRORS.SYNTAX_ERROR;

	let err = parseExpr();
	if (err) return err;
	writeBufferProgram(SIZE.byte, TYPES.END);

	tok = lexer();
	if (tok.err) return tok.err;
	if (tok.type !== TOKEN_TYPES.COMMAND || tok.value !== CMDS.TO) return ERRORS.SYNTAX_ERROR;

	err = parseExpr();
	if (err) return err;
	writeBufferProgram(SIZE.byte, TYPES.END);

	tok = lexer(true);
	if (tok.type === TOKEN_TYPES.COMMAND && tok.value === CMDS.STEP) {
		lexer();
		err = parseExpr();
		if (err) return err;
	} else {
		writeBufferProgram(SIZE.byte, TYPES.int);
		writeBufferProgram(SIZE.word, 1);
	}
	writeBufferProgram(SIZE.byte, TYPES.END);

	if (tok.err && tok.err !== ERRORS.END_OF_LINE) return tok.err;

	return 0;
}

export function parserNext() {
	const tok = lexer();
	if (tok.err) return tok.err;

	let varIdx = findVar(lexeme);
	if (varIdx < 0)
		// varIdx= addVar(varName, context.level);
		varIdx = addVar(lexeme, 0);

	if (getVarType(varIdx) !== TYPES.int) return ERRORS.TYPE_MISMATCH;

	let iteratorIdx = findIteratorVar(varIdx);
	if (iteratorIdx < 0) iteratorIdx = addIteratorVar(varIdx);
	writeBufferProgram(SIZE.word, iteratorIdx);

	return 0;
}
