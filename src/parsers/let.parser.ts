import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, prgCode, SIZE, TOKENS, TOKEN_TYPES, TYPES } from "../defs";
import { parseExpr } from "../expr";
import { isOperator, lexeme, lexer } from "../lexer";
import { addVar, findVar, setVarAsArray, setVarDeclared } from "../vars";

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
		setVarAsArray(varIdx);
		// change CMD from LET to SETs
		prgCode.idx--;
		writeBufferProgram(SIZE.byte, CMDS.SET);
	} else if (!isNewVar) setVarDeclared(varIdx);

	writeBufferProgram(SIZE.word, varIdx);

	if (isArray) {
		const err = parseExpr();
		if (err) return err;

		writeBufferProgram(SIZE.byte, TYPES.END);

		if (!isOperator(TOKENS.RIGHT_PARENT)) return ERRORS.SYNTAX_ERROR;

		tok = lexer();
	}

	if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.EQUAL) return ERRORS.SYNTAX_ERROR;

	const err = parseExpr();
	if (err) return err;

	writeBufferProgram(SIZE.byte, TYPES.END);

	return 0;
}
