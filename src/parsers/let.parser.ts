import { getArrayDimsCount } from "../arrays";
import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, prgCode, SIZE, TOKENS, TOKEN_TYPES, TYPES } from "../defs";
import { parseExpr } from "../expr";
import { isLookaheadOperator, isOperator, lexeme, lexer } from "../lexer";
import { addVar, findVar, getVar, setVarAsArray, setVarDeclared } from "../vars";

export function parserLet() {
	let tok = lexer();
	if (tok.err) return tok.err;

	let varIdx = findVar(lexeme);
	const isNewVar = varIdx < 0;
	if (isNewVar) varIdx = addVar(lexeme, 0);

	tok = lexer();
	if (tok.err) return tok.err;

	const isArray = tok.type === TOKEN_TYPES.OPERATOR && tok.value === TOKENS.LEFT_PARENT;

	if (isArray) {
		if (isNewVar) setVarAsArray(varIdx);
		// change CMD from LET to SETs
		prgCode.idx--;
		writeBufferProgram(SIZE.byte, CMDS.SET);
	} else if (isNewVar) setVarDeclared(varIdx);

	writeBufferProgram(SIZE.word, varIdx);

	if (isArray) {
		const arrayDimPtr = writeBufferProgram(SIZE.byte, 0);
		let arrayDimCount = 1;
		while (true) {
			const err = parseExpr();
			if (err) return err;

			writeBufferProgram(SIZE.byte, TYPES.END);

			if (!isLookaheadOperator(TOKENS.COMMA)) break;

			tok = lexer();
			arrayDimCount++;
		}

		if (!isNewVar) {
			const arrayIdx = getVar(varIdx);
			if (arrayDimCount !== getArrayDimsCount(arrayIdx)) return ERRORS.WRONG_DIM_COUNT;
		}
		writeBufferProgram(SIZE.byte, arrayDimCount, arrayDimPtr);

		if (!isOperator(TOKENS.RIGHT_PARENT)) return ERRORS.SYNTAX_ERROR;

		tok = lexer();
	}

	if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.EQUAL) return ERRORS.SYNTAX_ERROR;

	const err = parseExpr();
	if (err) return err;

	writeBufferProgram(SIZE.byte, TYPES.END);

	return 0;
}
