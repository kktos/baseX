import { writeBufferProgram } from "../buffer";
import { ERRORS, SIZE, TOKENS, TOKEN_TYPES, TYPES, VAR_FLAGS } from "../defs";
import { isOperator, lexeme, lexer } from "../lexer";
import { addVar, findVar } from "../vars";
import { parseExpr } from "./expr.parser";

export function parserRead() {
	while (true) {
		let tok = lexer();
		if (tok.err) return tok.err;
		if (tok.type !== TOKEN_TYPES.IDENTIFER) return ERRORS.TYPE_MISMATCH;

		let varIdx = findVar(lexeme);
		if (varIdx < 0) varIdx = addVar(lexeme);

		tok = lexer();
		if (tok.err) {
			if (tok.err === ERRORS.END_OF_LINE) {
				writeBufferProgram(SIZE.byte, TYPES.var);
				writeBufferProgram(SIZE.word, varIdx);
				// writeBufferProgram(SIZE.byte, TYPES.END);
				break;
			}
			return tok.err;
		}

		const isArray = tok.type === TOKEN_TYPES.OPERATOR && tok.value === TOKENS.LEFT_PARENT;

		writeBufferProgram(SIZE.byte, isArray ? VAR_FLAGS.ARRAY | TYPES.var : TYPES.var);
		writeBufferProgram(SIZE.word, varIdx);

		if (isArray) {
			const err = parseExpr();
			if (err) return err;

			if (!isOperator(TOKENS.RIGHT_PARENT)) return ERRORS.SYNTAX_ERROR;

			writeBufferProgram(SIZE.byte, TYPES.END);

			tok = lexer();
			if (tok.err) {
				if (tok.err === ERRORS.END_OF_LINE) break;
				return tok.err;
			}
		}
		// else {
		// 	writeBufferProgram(SIZE.byte, TYPES.END);
		// }

		if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.COMMA) return ERRORS.SYNTAX_ERROR;
	}

	writeBufferProgram(SIZE.byte, TYPES.END);
	// writeBufferProgram(SIZE.word, 0xffff);
	return ERRORS.NONE;
}
