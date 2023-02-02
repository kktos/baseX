import { addArray } from "../arrays";
import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, SIZE, TOKENS, TOKEN_TYPES, TYPES } from "../defs";
import { isLookaheadCommand, isOperator, lexeme, lexer } from "../lexer";
import { declareVar, findVar, getVarType, isVarArray, isVarDeclared, isVarInt, setVar, setVarDeclared, setVarType } from "../vars";
import { parseNum } from "./number.parser";

export function parserDim() {
	let tok = lexer();
	if (tok.err) return tok.err;
	if (tok.type !== TOKEN_TYPES.IDENTIFER) return ERRORS.SYNTAX_ERROR;

	let varIdx = findVar(lexeme);
	if (varIdx < 0) {
		// varIdx= declareVar(varName, context.level, true);
		varIdx = declareVar(lexeme, 0, true);
	} else {
		if (!isVarArray(varIdx) || isVarDeclared(varIdx)) return ERRORS.TYPE_MISMATCH;
		setVarDeclared(varIdx);
	}
	writeBufferProgram(SIZE.word, varIdx);

	if (!isOperator(TOKENS.LEFT_PARENT)) return ERRORS.SYNTAX_ERROR;

	const dim = parseNum();
	if (isNaN(dim)) return ERRORS.SYNTAX_ERROR;

	if (!isOperator(TOKENS.RIGHT_PARENT)) return ERRORS.SYNTAX_ERROR;

	if (isLookaheadCommand(CMDS.AS)) {
		if (!isVarInt(varIdx)) return ERRORS.TYPE_MISMATCH;

		lexer();

		tok = lexer();
		if (tok.err) return tok.err;
		if (tok.type !== TOKEN_TYPES.COMMAND) return ERRORS.SYNTAX_ERROR;

		switch (tok.value) {
			case CMDS.BYTE: {
				setVarType(varIdx, TYPES.byte);
				break;
			}
			case CMDS.WORD: {
				break;
			}
			default:
				return ERRORS.SYNTAX_ERROR;
		}
	}

	const arrIdx = addArray(getVarType(varIdx) & 0x3f, dim);
	setVar(varIdx, arrIdx);

	return 0;
}
