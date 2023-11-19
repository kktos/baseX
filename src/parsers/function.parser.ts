import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, SIZE, TOKENS, TOKEN_TYPES, TYPES, prgCode } from "../defs";
import { isLookaheadOperator, lexeme, lexer } from "../lexer";
import { currentLineIdx } from "../parser";
import { STRING_TYPE, newString } from "../strings";
import { findVar, getTypeFromName, isVarDeclared, setVar, setVarAsFunction, setVarDeclared } from "../vars";
import { parseExpr } from "./expr.parser";

export function parserFunction() {
	let tok = lexer();
	if (tok.err) return tok.err;

	const varIdx = findVar(lexeme);
	if (varIdx >= 0) {
		if (isVarDeclared(varIdx)) return ERRORS.DUPLICATE_NAME;

		setVarDeclared(varIdx);
		setVarAsFunction(varIdx);
		setVar(varIdx, currentLineIdx);

		writeBufferProgram(SIZE.word, varIdx);

		const parmCountPos = prgCode.idx;
		writeBufferProgram(SIZE.byte, 0);

		if (isLookaheadOperator(TOKENS.LEFT_PARENT)) {
			let done = false;
			let parmCount = 0;
			while (!done) {
				lexer();

				if (!isLookaheadOperator(TOKENS.DOLLAR)) return ERRORS.SYNTAX_ERROR;

				tok = lexer();
				if (tok.err) return tok.err;

				const nameIdx = newString(lexeme, STRING_TYPE.VARNAME);
				writeBufferProgram(SIZE.word, nameIdx);
				parmCount++;

				let varType = getTypeFromName(lexeme);

				tok = lexer(true);
				if (tok.err) return tok.err;

				if ((tok.type === TOKEN_TYPES.COMMAND && tok.value === CMDS.AS) || (tok.type === TOKEN_TYPES.OPERATOR && tok.value === TOKENS.COLON)) {
					lexer();

					tok = lexer(true);
					if (tok.err) return tok.err;
					if (tok.type !== TOKEN_TYPES.COMMAND) return ERRORS.SYNTAX_ERROR;

					switch (tok.value) {
						case CMDS.INT:
						case CMDS.WORD:
							varType = TYPES.int;
							break;
						case CMDS.BYTE:
							varType = TYPES.byte;
							break;
						case CMDS.STRING:
							varType = TYPES.string;
							break;
						case CMDS.FLOAT:
							varType = TYPES.float;
							break;
						default:
							return ERRORS.SYNTAX_ERROR;
					}

					tok = lexer(true);
					if (tok.err) return tok.err;
				}
				writeBufferProgram(SIZE.byte, varType);

				if (tok.type === TOKEN_TYPES.OPERATOR) {
					switch (tok.value) {
						case TOKENS.COMMA:
						case TOKENS.RIGHT_PARENT:
							done = true;
							break;
					}
				}
			}
			lexer();
			prgCode.buffer[parmCountPos] = parmCount;
		}
		//return ERRORS.SYNTAX_ERROR;
	} else throw new Error("NOT YET IMPLEMENTED !");

	return 0;
}

export function parserReturn() {
	const err = parseExpr();
	if (err) return err;
	writeBufferProgram(SIZE.byte, TYPES.END);
	return 0;
}
