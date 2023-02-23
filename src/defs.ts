const identiferChar0 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
const identiferChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
const NUMBER_CHARS = ".0123456789";
const HEXA_CHARS = "ABCDEF0123456789";
const BINARY_CHARS = "01";
const ws = " \t";

const FIELDS = {
	TYPE: 0,
	LEVEL: 1,
	NAME: 2,
	VALUE: 4,
};

const SIZE = {
	byte: 1,
	word: 2,
	long: 3,
};

const VAR_FLAGS = {
	// MASK
	TYPE: 0b0001_1111, // 0x1f,
	FLAGS: 0b1110_0000, // 0xe0,

	FUNCTION: 0b0010_0000, // 0x20,
	ARRAY: 0b0100_0000, // 0x40,
	UNDECLARED: 0b1000_0000, // 0x80,
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
};

const CMDS: Record<string, number> = {
	REM: 0x00,
	DIM: 0x01,

	PRINT: 0x03,
	LET: 0x04,
	SET: 0x05,
	AS: 0x06,

	INPUT: 0x07,
	READ: 0x08,
	DATA: 0x09,

	BYTE: 0x0a,
	WORD: 0x0b,
	INT: 0x0c,
	LONG: 0x0d,
	FLOAT: 0x0e,
	STRING: 0x0f,

	IF: 0x10,
	THEN: 0x11,
	ELSE: 0x12,

	FOR: 0x13,
	TO: 0x14,
	STEP: 0x15,
	NEXT: 0x16,

	GOTO: 0x17,
	GOSUB: 0x18,
	RETURN: 0x19,
	FUNCTION: 0x1a,
	END_FUNCTION: 0x1b,

	LIST: 0x1c,

	// "(": 0x70,
	// ")": 0x71,
	// "$": 0x72,
	// "=": 0x73,
	// ",": 0x74,
	// ";": 0x75,
	// ":": 0x76,

	// ">=": 0x86,
	// "<=": 0x87,
	// "<>": 0x88,
	// ">": 0x89,
	// "<": 0x8a,
	// "-": 0x8b,
	// "+": 0x8c,
	// "/": 0x8d,
	// "*": 0x8e,

	END: 0xff,
};
const OPS: Record<string, number> = {
	"(": 0x70,
	")": 0x71,
	$: 0x72,
	"=": 0x73,
	",": 0x74,
	";": 0x75,
	":": 0x76,

	// ">=": 0x86,
	// "<=": 0x87,
	// "<>": 0x88,
	">": 0x89,
	"<": 0x8a,
	"-": 0x8b,
	"+": 0x8c,
	"/": 0x8d,
	"*": 0x8e,
};

enum TOKEN_TYPES {
	INT = 1,
	FLOAT = 2,
	STRING = 3,
	IDENTIFER = 4,
	COMMAND = 5,
	OPERATOR = 6,
}

const TOKENS = {
	LEFT_PARENT: OPS["("],
	RIGHT_PARENT: OPS[")"],
	DOLLAR: OPS["$"],
	EQUAL: OPS["="],
	COMMA: OPS[","],
	SEMICOLON: OPS[";"],
	COLON: OPS[":"],
};

const OPERATORS = {
	MULT: OPS["*"],
	DIV: OPS["/"],
	ADD: OPS["+"],
	SUB: OPS["-"],
	LT: OPS["<"],
	GT: OPS[">"],
	EQ: OPS["="], // 0xf9,
	NE: OPS["<>"],
	LTE: OPS["<="],
	GTE: OPS[">="],
};

const FNS: Record<string, number> = {
	USER_DEF: 0,
	GET_ITEM: 10,
	VARPTR: 20,

	INT: 100,
	RND: 101,

	CHR$: 200,
	HEX$: 201,
};

enum ERRORS {
	NONE = 0,
	SYNTAX_ERROR = 0xdead,
	TYPE_MISMATCH = 0xcafe,
	OUT_OF_BOUNDS = 0xb00b,
	OUT_OF_DATA = 0x0bb0,
	UNKNOWN_FUNCTION = 0xfeca,
	UNDECLARED_VARIABLE = 0xcaca,
	OVERFLOW = 0xfefe,
	DUPLICATE_NAME = 0xdafe,
	LINE_MISSING = 0xdada,
	UNKNOWN_STATEMENT = 0xdade,
	ILLEGAL_STATEMENT = 0xdede,
	NOT_ENOUGH_PARMS = 0xdeaf,
	UNKNOWN_VARIABLE = 0xfede,
	WRONG_DIM_COUNT = 0xf00d,
	END_OF_LINE = 0xfeed,
}

const HEADER = {
	VERSION: 0,
	START: 2,
	VARS: 4,
	STRINGS: 6,
	LINES: 8,
	ARRAYS: 10,
};
const HEADERS_SIZE = 12;

export type TToken = {
	type: number;
	value: number;
	err: number;
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

const headers = new Uint8Array(HEADERS_SIZE);

const source = {
	buffer: "",
	idx: 0,
};

export type TPrint = (...args: string[]) => void;

// READ / DATA
const DATA = "%DATA%";
const DATA_FIELDS= {
	COUNT: 0,
	PTR: 1,
	ITEMS: 2
}

export {
	source,
	identiferChar0,
	identiferChars,
	NUMBER_CHARS,
	HEXA_CHARS,
	BINARY_CHARS,
	ws,
	headers,
	prgLines,
	prgCode,
	ERRORS,
	CMDS,
	OPS,
	TOKENS,
	TOKEN_TYPES,
	FNS,
	OPERATORS,
	SIZE,
	TYPES,
	HEADER,
	FIELDS,
	VAR_FLAGS,
	DATA,
	DATA_FIELDS
};
