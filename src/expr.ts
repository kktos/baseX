import { writeBufferProgram } from "./buffer";
import { ERRORS, FNS, OPERATORS, SIZE, TOKENS, TOKEN_TYPES, TToken, TYPES } from "./defs";
import { advance, lexeme, lexer } from "./lexer";
import { newString } from "./strings";
import { addVar, findVar, isVarArray, isVarDeclared, setVarAsFunction } from "./vars";

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
		if (tok.err === ERRORS.END_OF_LINE) return ERRORS.NONE;
		if (tok.err) return tok.err;

		if (tok.type !== TOKEN_TYPES.OPERATOR) return ERRORS.NONE;

		switch (tok.value) {
			case OPERATORS.GT:
			case OPERATORS.LT:
			case OPERATORS.EQ: {
				lexer();

				const err = parseAdd();
				if (err) return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, tok.value);

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
		if (tok.err === ERRORS.END_OF_LINE) return ERRORS.NONE;
		if (tok.err) return tok.err;

		if (tok.type !== TOKEN_TYPES.OPERATOR) return ERRORS.NONE;

		switch (tok.value) {
			case OPERATORS.ADD:
			case OPERATORS.SUB: {
				lexer();

				const err = parseAdd();
				if (err) return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, tok.value);

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
		if (tok.err === ERRORS.END_OF_LINE) return ERRORS.NONE;
		if (tok.err) return tok.err;

		if (tok.type !== TOKEN_TYPES.OPERATOR) return ERRORS.NONE;

		switch (tok.value) {
			case OPERATORS.MULT:
			case OPERATORS.DIV: {
				lexer();

				const err = parseTerm();
				if (err) return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, tok.value);
				break;
			}
			default:
				return 0;
		}
	}
}

function parseTerm(): number {
	let tok = lexer(true);
	if (tok.err) return tok.err;

	switch (tok.type) {
		case TOKEN_TYPES.INT: {
			advance();
			const num = parseInt(lexeme);
			writeBufferProgram(SIZE.byte, TYPES.int);
			writeBufferProgram(SIZE.word, num);
			return 0;
		}

		case TOKEN_TYPES.FLOAT: {
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

		case TOKEN_TYPES.STRING: {
			advance();
			writeBufferProgram(SIZE.byte, TYPES.string);
			const idx = newString(lexeme.slice(1));
			writeBufferProgram(SIZE.word, idx);
			return 0;
		}

		case TOKEN_TYPES.OPERATOR:
			return parseTermOperator(tok);
	}

	if (tok.type !== TOKEN_TYPES.IDENTIFER) return ERRORS.SYNTAX_ERROR;

	advance();

	if (FNS.hasOwnProperty(lexeme.toUpperCase())) {
		const fn = FNS[lexeme.toUpperCase()];

		let tok = lexer();
		if (tok.err) return tok.err;
		if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.LEFT_PARENT) return ERRORS.SYNTAX_ERROR;

		const err = parseExpr();
		if (err) return err;

		tok = lexer();
		if (tok.err) return tok.err;
		if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.RIGHT_PARENT) return ERRORS.SYNTAX_ERROR;

		writeBufferProgram(SIZE.byte, TYPES.fn);
		writeBufferProgram(SIZE.byte, fn);
		return 0;
	}

	let varIdx = findVar(lexeme);
	if (varIdx < 0) {
		varIdx = addVar(lexeme, 0);
	}

	tok = lexer(true);
	if (tok.err && tok.err !== ERRORS.END_OF_LINE) return tok.err;

	const isArrOrFn = tok.err !== ERRORS.END_OF_LINE && tok.type === TOKEN_TYPES.OPERATOR && tok.value === TOKENS.LEFT_PARENT;
	if (!isArrOrFn) {
		writeBufferProgram(SIZE.byte, TYPES.var);
		writeBufferProgram(SIZE.word, varIdx);
		return 0;
	}

	// arr(idx)

	if (!isVarDeclared(varIdx) || isVarArray(varIdx)) {
		lexer();

		const err = parseExpr();
		if (err) return err;

		tok = lexer(true);
		if (tok.err) return tok.err;
		if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.RIGHT_PARENT) return ERRORS.SYNTAX_ERROR;

		writeBufferProgram(SIZE.byte, TYPES.var);
		writeBufferProgram(SIZE.word, varIdx);
		writeBufferProgram(SIZE.byte, TYPES.fn);
		writeBufferProgram(SIZE.byte, FNS.GET_ITEM);
		return 0;
	}

	// fn(params, ...)

	setVarAsFunction(varIdx);

	lexer();

	const err = parseExpr();
	if (err) return err;

	tok = lexer(true);
	if (tok.err) return tok.err;
	if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.RIGHT_PARENT) return ERRORS.SYNTAX_ERROR;

	writeBufferProgram(SIZE.byte, TYPES.fn);
	writeBufferProgram(SIZE.byte, FNS.USER_DEF);
	writeBufferProgram(SIZE.word, varIdx);

	return 0;
}

function parseTermOperator(tok: TToken) {
	switch (tok.value) {
		case TOKENS.RIGHT_PARENT: {
			return 0;
		}

		case TOKENS.LEFT_PARENT: {
			advance();
			const err = parseExpr();
			if (err) return err;

			const tok = lexer();
			if (tok.err) return tok.err;
			if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.RIGHT_PARENT) return ERRORS.SYNTAX_ERROR;

			return 0;
		}

		case TOKENS.DOLLAR: {
			advance();
			const tok = lexer();
			if (tok.err) return tok.err;
			if (tok.type !== TOKEN_TYPES.IDENTIFER) return ERRORS.SYNTAX_ERROR;
			const nameIdx = newString(lexeme, true);
			writeBufferProgram(SIZE.byte, TYPES.local);
			writeBufferProgram(SIZE.word, nameIdx);
			return 0;
		}

		default:
			return ERRORS.SYNTAX_ERROR;
	}
}
