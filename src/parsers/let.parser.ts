import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, prgCode, SIZE, TOKENS, TYPES } from "../defs";
import { parseExpr } from "../expr";
import { lexer, tokenizer } from "../lexer";
import { addVar, declareVar, findVar, setVarDeclared } from "../vars";

export function parserLet() {
	const varName = lexer();
	if (varName == null) return ERRORS.SYNTAX_ERROR;

	let tok = tokenizer();
	const isArray = tok === TOKENS.LEFT_PARENT;

	let varIdx = findVar(varName);
	if (varIdx < 0) {
		varIdx = isArray ? addVar(varName, 0, true) : declareVar(varName, 0);
	} else setVarDeclared(varIdx);

	if (isArray) {
		prgCode.idx--;
		writeBufferProgram(SIZE.byte, CMDS.SET);
	}

	writeBufferProgram(SIZE.word, varIdx);

	if (isArray) {
		const err = parseExpr();
		if (err) return err;

		writeBufferProgram(SIZE.byte, TYPES.END);

		if (tokenizer() !== TOKENS.RIGHT_PARENT) return ERRORS.SYNTAX_ERROR;

		tok = tokenizer();
	}

	if (tok !== TOKENS.EQUAL) return ERRORS.SYNTAX_ERROR;

	const err = parseExpr();
	if (err) return err;
	writeBufferProgram(SIZE.byte, TYPES.END);

	return 0;
}
