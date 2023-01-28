const identiferChar0 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
const identiferChars =
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
const numberChars = ".0123456789";
const ws = " \t";

const SIZE = {
	byte: 1,
	word: 2,
	long: 3,
};

const TYPES = {
	string: 1,
	int: 2,
	float: 3,
	var: 4,
	fn: 5,
	iterator: 6,
	byte: 7,
	local: 8,

	END: 0x00,
	CLOSE: 0x60,

	// MASK
	SCALAR: 0x1f,
	FLAGS: 0xe0,

	FUNCTION: 0x20,
	ARRAY: 0x40,
	UNDECLARED: 0x80,
};

const CMDS: Record<string, number> = {
	REM: 0x00,
	DIM: 0x01,

	PRINT: 0x05,
	LET: 0x06,
	SET: 0x07,
	AS: 0x08,

	INPUT: 0x10,

	BYTE: 0x20,
	WORD: 0x21,
	INT: 0x22,
	LONG: 0x23,
	FLOAT: 0x24,
	STRING: 0x25,

	IF: 0x30,
	THEN: 0x31,
	ELSE: 0x32,

	FOR: 0x40,
	TO: 0x41,
	STEP: 0x42,
	NEXT: 0x43,

	GOTO: 0x50,
	GOSUB: 0x51,
	RETURN: 0x52,
	FUNCTION: 0x53,
	END_FUNCTION: 0x54,

	LIST: 0x60,

	"(": 0xe0,
	")": 0xe1,
	$: 0xe2,
	"=": 0xe3,
	",": 0xe4,
	";": 0xe5,
	":": 0xe6,

	END: 0xff,
};

const TOKENS = {
	LEFT_PARENT: CMDS["("],
	RIGHT_PARENT: CMDS[")"],
	DOLLAR: CMDS["$"],
	EQUAL: CMDS["="],
	COMMA: CMDS[","],
	SEMICOLON: CMDS[";"],
	COLON: CMDS[":"],

	_INT: 0xf0,
	_FLOAT: 0xf1,
	_STRING: 0xf2,
};

const OPERATORS = {
	MULT: 0xff,
	DIV: 0xfe,
	ADD: 0xfd,
	SUB: 0xfc,
	LT: 0xfb,
	GT: 0xfa,
	EQ: 0xf9,
	NE: 0xf8,
	LTE: 0xf7,
	GTE: 0xf6,
};

const FNS: Record<string, number> = {
	USER_DEF: 0,
	GET_ITEM: 10,
	INT: 100,
	RND: 101,
	CHR$: 200,
};

const ERRORS = {
	SYNTAX_ERROR: 0xdead,
	TYPE_MISMATCH: 0xcafe,
	UNKNOWN_FUNCTION: 0xfeca,
	UNDECLARED_VARIABLE: 0xcaca,
	OVERFLOW: 0xfefe,
	DUPLICATE_NAME: 0xdafe,
	LINE_MISSING: 0xdada,
	UNKNOWN_STATEMENT: 0xdade,
	ILLEGAL_STATEMENT: 0xdede,
	NOT_ENOUGH_PARMS: 0xdeaf,
	UNKNOWN_VARIABLE: 0xfede,
};

const HEADER = {
	VERSION: 0,
	START: 2,
	VARS: 4,
	STRINGS: 6,
	LINES: 8,
	ARRAYS: 10,
};

export type TPrgBuffer = {
	buffer: Uint8Array;
	idx: number;
};

const prgCode: TPrgBuffer = {
	buffer: new Uint8Array(255),
	idx: 0,
};

const prgLines: TPrgBuffer = {
	buffer: new Uint8Array(255),
	idx: 0,
};

const headers = new Uint8Array(12);

const source = {
	buffer: "",
	idx: 0,
};

export {
	source,
	identiferChar0,
	identiferChars,
	numberChars,
	ws,
	headers,
	prgLines,
	prgCode,
	ERRORS,
	CMDS,
	TOKENS,
	FNS,
	OPERATORS,
	SIZE,
	TYPES,
	HEADER,
};
