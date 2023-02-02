import { CMDS, ERRORS, identiferChar0, identiferChars, numberChars, OPS, source, TOKEN_TYPES, TToken, ws } from "./defs";

export let lexeme: string;
export let lexerErr: number;

const ASCII_DOUBLE_QUOTE = 0x22;
const ASCII_DOT = 0x2e;
const ASCII_0 = 0x30;
const ASCII_9 = 0x39;
const ASCII_A = 0x41;
const ASCII_Z = 0x5a;
const ASCII_UNDERSCORE = 0x5f;
const ASCII_UPPERCASE_MASK = 0xdf;
const CHAR_KINDS = {
	other: 0,
	string: 1,
	number: 2,
	identifier: 3,
};

export function advance() {
	// skip whitespaces
	while (source.idx < source.buffer.length && ws.includes(source.buffer[source.idx])) source.idx++;

	const ch = source.buffer[source.idx++];

	if (ch === '"') {
		while (source.idx++ < source.buffer.length && source.buffer[source.idx] !== '"');
		source.idx++;
		return;
	}

	if (identiferChar0.includes(ch)) {
		while (source.idx < source.buffer.length && identiferChars.includes(source.buffer[source.idx])) source.idx++;

		if ("$%".includes(source.buffer[source.idx])) source.idx++;

		return;
	}

	if (numberChars.includes(ch)) {
		while (source.idx < source.buffer.length && numberChars.includes(source.buffer[source.idx])) source.idx++;
		return;
	}
}

function getCharKind(ch: string) {
	let charCode = ch.charCodeAt(0);

	if (charCode === ASCII_DOUBLE_QUOTE) return CHAR_KINDS.string;

	if (charCode === ASCII_DOT || (charCode >= ASCII_0 && charCode <= ASCII_9)) return CHAR_KINDS.number;

	charCode = ch.charCodeAt(0) & ASCII_UPPERCASE_MASK;

	if (charCode === ASCII_UNDERSCORE || (charCode >= ASCII_A && charCode <= ASCII_Z)) return CHAR_KINDS.identifier;

	return CHAR_KINDS.other;
}

/**
 *
 * @param lookahead
 * @returns token
 *
 * 10 let toto = 10
 * command(LET) identifier(toto) operator(=) int(10)
 *
 * 10 let toto$ = "yes"
 * command(LET) identifier(toto$) operator(=) string(yes)
 */
export function lexer(lookahead = false): TToken {
	let tokenType;
	let token;
	let currIdx = source.idx;

	lexerErr = ERRORS.NONE;
	lexeme = "";

	// skip whitespaces
	while (currIdx < source.buffer.length && ws.includes(source.buffer[currIdx])) currIdx++;

	if (currIdx === source.buffer.length) {
		lexerErr = ERRORS.END_OF_LINE;
		return { type: 0, value: 0, err: lexerErr };
	}

	const idxSOT = currIdx;
	const ch = source.buffer[currIdx++];
	const charKind = getCharKind(ch);

	switch (charKind) {
		case CHAR_KINDS.string:
			while (currIdx++ < source.buffer.length && source.buffer[currIdx] !== '"');
			tokenType = TOKEN_TYPES.STRING;
			break;

		case CHAR_KINDS.identifier:
			while (currIdx < source.buffer.length && identiferChars.includes(source.buffer[currIdx])) currIdx++;

			if ("$%".includes(source.buffer[currIdx])) currIdx++;
			tokenType = TOKEN_TYPES.IDENTIFER;
			break;

		case CHAR_KINDS.number: {
			let isFloat = ch === ".";
			while (currIdx < source.buffer.length && numberChars.includes(source.buffer[currIdx])) {
				if (source.buffer[currIdx] === ".") isFloat = true;
				currIdx++;
			}
			if (source.buffer[currIdx] === "f") {
				isFloat = true;
				currIdx++;
			}
			tokenType = isFloat ? TOKEN_TYPES.FLOAT : TOKEN_TYPES.INT;
			break;
		}
		case CHAR_KINDS.other: {
			if (OPS.hasOwnProperty(ch)) {
				token = OPS[ch];
				tokenType = TOKEN_TYPES.OPERATOR;
			} else {
				lexerErr = ERRORS.SYNTAX_ERROR;
			}
			break;
		}
	}

	lexeme = source.buffer.slice(idxSOT, currIdx);

	if (!lookahead) {
		source.idx = currIdx;
		if (tokenType === TOKEN_TYPES.STRING) source.idx++;
	}

	if (tokenType === TOKEN_TYPES.IDENTIFER) {
		const cmd = lexeme.toUpperCase();
		if (CMDS.hasOwnProperty(cmd)) {
			token = CMDS[cmd];
			tokenType = TOKEN_TYPES.COMMAND;
		}
	}

	// return in Acc and Xreg and Carry, for instance
	// jsr lexer
	//
	// ;to test error
	// bcs syntax_error
	//
	// cmp #TOKEN_TYPES.COMMAND
	// bne nextTest
	// asl
	// tax
	// jsr (commandJumpTable, x)
	// bra next
	// nextTest:
	//
	return { type: tokenType, value: token, err: lexerErr };
}

export function isLookaheadOperator(op: number) {
	const tok = lexer(true);
	return !tok.err && tok.type === TOKEN_TYPES.OPERATOR && tok.value === op;
}
export function isOperator(op: number) {
	const tok = lexer();
	return !tok.err && tok.type === TOKEN_TYPES.OPERATOR && tok.value === op;
}

export function isLookaheadCommand(cmd: number) {
	const tok = lexer(true);
	return !tok.err && tok.type === TOKEN_TYPES.COMMAND && tok.value === cmd;
}
export function isCommand(cmd: number) {
	const tok = lexer();
	return !tok.err && tok.type === TOKEN_TYPES.COMMAND && tok.value === cmd;
}
