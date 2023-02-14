import { addArray } from "../arrays";
import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, SIZE, TOKENS, TOKEN_TYPES, TYPES } from "../defs";
import { isLookaheadCommand, isLookaheadOperator, isOperator, lexeme, lexer } from "../lexer";
import { declareVar, findVar, getVarType, isVarArray, isVarDeclared, isVarInt, setVar, setVarDeclared, setVarType } from "../vars";
import { parseNum } from "./number.parser";

//
// TODO: re-DIM error
//     20 dim b%(15)
//     30 dim b%(20) <- REDIM ERROR
//
// DIM
// 0000 : 01        ; DIM
// 0001 : 0000      ; varIdx e.g. a[]
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

	const dims: number[] = [];

	while (true) {
		const dim = parseNum();
		if (isNaN(dim)) return ERRORS.SYNTAX_ERROR;

		dims.push(dim);

		if (!isLookaheadOperator(TOKENS.COMMA)) break;

		lexer();
	}

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

	const arrIdx = addArray(getVarType(varIdx), dims);
	setVar(varIdx, arrIdx);

	return 0;
}
