import { writeBufferProgram } from "./buffer";
import { ERRORS, FNS, OPERATORS, SIZE, TOKENS, TYPES } from "./defs";
import { advance, isIdentifer, lexeme, lexer, tokenizer } from "./lexer";
import { addString } from "./strings";
import { addVar, findVar, isVarArray, setVarFunction } from "./vars";

export function parseExpr(): number {
	const err = parseCmp();
	if (err) return err;

	return 0;
}

function parseCmp(): number {
	const err = parseAdd();
	if (err) return err;

	while (true) {
		const tok = lexer(true);
		switch (tok) {
			case ">": {
				lexer();

				const err = parseAdd();
				if (err) return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.GT);

				break;
			}
			case "<": {
				lexer();

				const err = parseAdd();
				if (err) return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.LT);

				break;
			}
			case "=": {
				lexer();

				const err = parseAdd();
				if (err) return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.EQ);

				break;
			}
			default:
				return 0;
		}
	}
}

function parseAdd(): number {
	const err = parseProduct();
	if (err) return err;

	while (true) {
		const tok = lexer(true);
		switch (tok) {
			case "+": {
				lexer();

				const err = parseAdd();
				if (err) return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.ADD);

				break;
			}
			case "-": {
				lexer();

				const err = parseAdd();
				if (err) return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.SUB);

				break;
			}
			default:
				return 0;
		}
	}
}

function parseProduct(): number {
	const err = parseTerm();
	if (err) return err;

	while (true) {
		const tok = lexer(true);
		switch (tok) {
			case "*": {
				lexer();

				const err = parseTerm();
				if (err) return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.MULT);
				break;
			}
			case "/": {
				lexer();

				const err = parseTerm();
				if (err) return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.DIV);
				break;
			}
			default:
				return 0;
		}
	}
}

function parseTerm(): number {
	const tok = tokenizer(true);
	if (!lexeme) return ERRORS.SYNTAX_ERROR;

	switch (tok) {
		case TOKENS._INT: {
			advance();
			const num = parseInt(lexeme);
			writeBufferProgram(SIZE.byte, TYPES.int);
			writeBufferProgram(SIZE.word, num);
			return 0;
		}

		case TOKENS._FLOAT: {
			advance();
			const num = parseFloat(lexeme);
			const buffer = new Uint8Array(4);
			const view = new DataView(buffer.buffer);
			view.setFloat32(0, num);
			writeBufferProgram(SIZE.byte, TYPES.float);
			for (let idx = 0; idx < 4; idx++) {
				writeBufferProgram(SIZE.byte, view.getUint8(idx));
			}
			return 0;
		}

		case TOKENS._STRING: {
			advance();
			writeBufferProgram(SIZE.byte, TYPES.string);
			const idx = addString(lexeme.slice(1));
			writeBufferProgram(SIZE.word, idx);
			return 0;
		}

		case TOKENS.RIGHT_PARENT: {
			return 0;
		}

		case TOKENS.LEFT_PARENT: {
			advance();
			const err = parseExpr();
			if (err) return err;

			if (tokenizer() !== TOKENS.RIGHT_PARENT) return ERRORS.SYNTAX_ERROR;

			return 0;
		}

		case TOKENS.DOLLAR: {
			advance();
			const varName = lexer();
			if(varName == null)
				return ERRORS.SYNTAX_ERROR;
			const nameIdx = addString(varName, true);
			writeBufferProgram(SIZE.byte, TYPES.local);
			writeBufferProgram(SIZE.word, nameIdx);
			return 0;
		}
	}

	if (!isIdentifer) return ERRORS.SYNTAX_ERROR;

	advance();

	if (FNS.hasOwnProperty(lexeme.toUpperCase())) {
		const fn = FNS[lexeme.toUpperCase()];
		if (tokenizer() !== TOKENS.LEFT_PARENT) return ERRORS.SYNTAX_ERROR;

		const err = parseExpr();
		if (err) return err;

		if (tokenizer() !== TOKENS.RIGHT_PARENT) return ERRORS.SYNTAX_ERROR;

		writeBufferProgram(SIZE.byte, TYPES.fn);
		writeBufferProgram(SIZE.byte, fn);
		return 0;
	}

	let varIdx = findVar(lexeme);
	if (varIdx < 0) {
		varIdx = addVar(lexeme, 0);
	}

	const isFnCall = tokenizer(true) === TOKENS.LEFT_PARENT;
	if (isFnCall) {
		setVarFunction(varIdx);

		lexer();

		const err = parseExpr();
		if (err) return err;

		if (lexer() !== ")") return ERRORS.SYNTAX_ERROR;

		writeBufferProgram(SIZE.byte, TYPES.fn);
		writeBufferProgram(SIZE.byte, FNS.USER_DEF);
		writeBufferProgram(SIZE.word, varIdx);

		return 0;
	}

	writeBufferProgram(SIZE.byte, TYPES.var);
	writeBufferProgram(SIZE.word, varIdx);

	if (isVarArray(varIdx)) {
		lexer();

		const err = parseExpr();
		if (err) return err;

		if (lexer() !== ")") return ERRORS.SYNTAX_ERROR;

		writeBufferProgram(SIZE.byte, TYPES.fn);
		writeBufferProgram(SIZE.byte, FNS.GET_ITEM);

		// writeBufferProgram(SIZE.byte, TYPES.END);
	}

	return 0;
}
