import { computeItemIdx, getArrayItem, setArrayItem } from "./arrays";
import { readBuffer, readBufferHeader, readBufferLine } from "./buffer";
import { CMDS, ERRORS, FNS, HEADER, OPERATORS, prgCode, SIZE, TPrgBuffer, TYPES, VAR_FLAGS } from "./defs";
import { TProgram } from "./parser";
import { concatStrings, copyString, createString, getString, newString, resetTempStrings, setTempStrings } from "./strings";
import { hexByte, hexWord } from "./utils";
import {
	addVarNameIdx,
	findVar,
	getIteratorVar,
	getVar,
	getVarFlags,
	getVarName,
	getVarType,
	isVarDeclared, ITERATOR, removeVarsForLevel,
	setIteratorVar,
	setVar,
	setVarDeclared
} from "./vars";

type TExpr = {
	type: number;
	value: number;
};
let expr: TExpr = {
	type: 0,
	value: 0,
};
const program: TPrgBuffer = {
	buffer: prgCode.buffer,
	idx: 0,
};

type TContext = TProgram & {
	lineIdx: number;
	lineNum?: number;
	level: number;
	returnExpr: TExpr | null;
	exprStack: TExpr[];
};

let context: TContext;

/*
	headers: headers,
	lines: prgLines,
	code: prgCode,
	strings: strings,
	vars: vars,
*/
export function run(prg: TProgram) {
	context = {
		...prg,
		lineIdx: readBufferHeader(HEADER.START),
		level: 0,
		returnExpr: null,
		exprStack: [],
	};

	// setTempStrings(context.lineIdx);
	setTempStrings();

	const err = execStatements();
	prg.lineNum = context.lineNum;
	return err;
}

function execStatements() {
	let lineNum;
	let err;

	while (context.lineIdx !== 0xffff) {
		lineNum = readBufferLine(context.lineIdx);
		program.idx = readBufferLine(context.lineIdx + 2);
		context.lineIdx = readBufferLine(context.lineIdx + 4);

		context.lineNum = lineNum;

		// console.info("*** line", lineNum, hexWord(program.idx));

		if (program.idx === 0xffff) return ERRORS.LINE_MISSING;

		const cmd = readBuffer(program, SIZE.byte);

		// console.info("*** prg", Object.keys(CMDS)[Object.values(CMDS).indexOf(cmd)]);
		// console.info("*** prg", hexWord(program.idx)," : ", hexByte(cmd));

		switch (cmd) {
			case CMDS.FUNCTION: {
				// function could be run only on call (level>0)
				if (!context.level) return ERRORS.ILLEGAL_STATEMENT;

				// console.log("FUNCTION", context.exprStack);

				// skip function var
				readBuffer(program, SIZE.word);

				let parmCount = readBuffer(program, SIZE.byte);

				// console.log("FUNCTION parmCount", parmCount);

				if (context.exprStack.length < parmCount) {
					return ERRORS.NOT_ENOUGH_PARMS;
				}

				while (parmCount--) {
					const nameIdx = readBuffer(program, SIZE.word);
					const varType = readBuffer(program, SIZE.byte);
					const expr = context.exprStack.pop();
					if (expr?.type !== varType) return ERRORS.TYPE_MISMATCH;
					const varIdx = addVarNameIdx(nameIdx, context.level, varType, false, true);
					setVar(varIdx, expr.value);
				}

				break;
			}

			case CMDS.RETURN: {
				// return only from a function (level>0)
				if (!context.level) return ERRORS.ILLEGAL_STATEMENT;

				err = evalExpr();
				if (err) return err;

				context.returnExpr = expr;

				removeVarsForLevel(context.level);

				return;
			}

			case CMDS.END_FUNCTION: {
				// return only from a function (level>0)
				if (!context.level) return ERRORS.ILLEGAL_STATEMENT;

				context.returnExpr = { type: 0, value: 0 };
				return;
			}

			case CMDS.DIM:
			case CMDS.REM: {
				readBuffer(program, SIZE.word);
				break;
			}

			case CMDS.END: {
				// allowed only on main prg, not in functions
				if (context.level) return ERRORS.ILLEGAL_STATEMENT;

				return;
			}

			case CMDS.LET: {
				err = assignVar();
				if (err) return err;
				break;
			}

			case CMDS.SET: {
				err = assignArrayItem();
				if (err) return err;
				break;
			}

			case CMDS.IF: {
				err = evalExpr();
				if (err) return err;

				if (!expr.value) break;

				readBuffer(program, SIZE.byte);
			}

			case CMDS.GOTO: {
				context.lineIdx = readBuffer(program, SIZE.word);
				break;
			}

			case CMDS.PRINT: {
				let sep;

				while (sep !== TYPES.END) {
					let outStr = "";
					err = evalExpr();
					if (err) return err;

					switch (expr.type) {
						case TYPES.string: {
							outStr += getString(expr.value);
							break;
						}
						case TYPES.byte:
						case TYPES.int: {
							outStr += expr.value;
							break;
						}
						case TYPES.float: {
							outStr += expr.value;
							break;
						}
					}

					term(outStr);

					sep = readBuffer(program, SIZE.byte);
					switch (sep) {
						case 0x09: {
							term("\t");
							sep = readBuffer(program, SIZE.byte, true);
							break;
						}
						case 0x0a: {
							sep = readBuffer(program, SIZE.byte, true);
							break;
						}
						default: {
							term("\n");
							break;
						}
					}
				}

				break;
			}

			case CMDS.FOR: {
				const iteratorIdx = readBuffer(program, SIZE.word);

				err = evalExpr();
				if (err) return err;
				if (expr.type === TYPES.string) return ERRORS.TYPE_MISMATCH;

				const varIdx = getIteratorVar(iteratorIdx, ITERATOR.VAR);
				setVar(varIdx, expr.value);

				// upper bound
				err = evalExpr();
				if (err) return err;
				setIteratorVar(iteratorIdx, ITERATOR.MAX, expr.value);

				// step
				err = evalExpr();
				if (err) return err;
				setIteratorVar(iteratorIdx, ITERATOR.INC, expr.value);

				setIteratorVar(iteratorIdx, ITERATOR.PTR, context.lineIdx);

				break;
			}

			case CMDS.NEXT: {
				const iteratorIdx = readBuffer(program, SIZE.word);

				const inc = getIteratorVar(iteratorIdx, ITERATOR.INC);
				const max = getIteratorVar(iteratorIdx, ITERATOR.MAX);
				const varIdx = getIteratorVar(iteratorIdx, ITERATOR.VAR);

				const sum = addInt16(inc, getVar(varIdx));

				if (cmpInt16(sum, max, "<=")) {
					setVar(varIdx, sum);
					context.lineIdx = getIteratorVar(iteratorIdx, ITERATOR.PTR);
				}

				break;
			}

			default:
				console.error("UNKNOWN_STATEMENT", cmd, lineNum, program.idx, context.lineIdx);

				return ERRORS.UNKNOWN_STATEMENT;
		}

		resetTempStrings();
	}

	return 0;
}

function addInt16(a: number, b: number) {
	return a + b;
}

function cmpInt16(a: number, b: number, op: string) {
	switch (op) {
		case "<=":
			return a <= b;
		case "<":
			return a < b;
		case "<>":
			return a !== b;
	}
	return false;
}

function assignVar(excluded: number[] = []) {
	const varIdx = readBuffer(program, SIZE.word);
	const err = evalExpr();
	if (err) return err;

	if (excluded.includes(expr.type)) return ERRORS.TYPE_MISMATCH;

	const varType = getVarType(varIdx);

	if (varType !== (expr.type & VAR_FLAGS.TYPE)) return ERRORS.TYPE_MISMATCH;

	if (varType === TYPES.string) {
		let destStrIdx = getVar(varIdx);

		console.log(hexWord(destStrIdx), hexByte(getVarFlags(varIdx)), getVarName(varIdx));

		if (destStrIdx === 0xffff) {
			destStrIdx = createString(255);
			setVar(varIdx, destStrIdx);
		}

		const err = copyString(destStrIdx, expr.value);
		if (err) return err;
	} else {
		setVar(varIdx, expr.value);
	}

	setVarDeclared(varIdx);

	return 0;
}

function assignArrayItem() {
	const varIdx = readBuffer(program, SIZE.word);

	if (!isVarDeclared(varIdx)) return ERRORS.UNDECLARED_VARIABLE;

	const dimsCount = readBuffer(program, SIZE.byte);
	const dims= [];
	let err;

	for(let idx= 0; idx < dimsCount; idx++) {
		err = evalExpr();
		if (err) return err;

		if (expr.type !== TYPES.int) return ERRORS.TYPE_MISMATCH;

		dims.push(expr.value);
		// const idx = expr.value;
	}

	err = evalExpr();
	if (err) return err;

	const arrayIdx = getVar(varIdx);
	const offset= computeItemIdx(getVarType(varIdx), arrayIdx, dims);
	err = setArrayItem(getVarType(varIdx), arrayIdx, offset, expr.value);
	if (err) return err;

	return 0;
}

function evalExpr(): number {
	function getVarValue(varIdx: number) {
		expr.type = getVarType(varIdx); // & 0x3F;
		switch (expr.type) {
			case TYPES.int: {
				expr.value = getVar(varIdx);
				break;
			}
			case TYPES.float: {
				expr.value = getVar(varIdx);
				break;
			}
			case TYPES.string: {
				expr.value = getVar(varIdx);
				break;
			}
			default: {
				expr.value = getVar(varIdx);
				break;
			}
		}
	}

	while (true) {
		const itemType = readBuffer(program, SIZE.byte);
		if (itemType === TYPES.END) break;

		switch (itemType) {
			case TYPES.local: {
				const nameIdx = readBuffer(program, SIZE.word);
				const varIdx = findVar(getString(nameIdx), context.level);
				if (varIdx < 0) return ERRORS.UNKNOWN_VARIABLE;
				getVarValue(varIdx);
				break;
			}

			case TYPES.var: {
				const varIdx = readBuffer(program, SIZE.word);
				getVarValue(varIdx);
				break;
			}

			case TYPES.string: {
				const strIdx = readBuffer(program, SIZE.word);
				expr.type = TYPES.string;
				expr.value = strIdx;
				break;
			}

			case TYPES.int: {
				const num = readBuffer(program, SIZE.word);
				expr.type = TYPES.int;
				expr.value = num;
				break;
			}

			case TYPES.float: {
				const buffer = new Uint8Array(4);
				const view = new DataView(buffer.buffer);
				for (let idx = 0; idx < 4; idx++) {
					view.setUint8(idx, readBuffer(program, SIZE.byte));
				}
				expr.type = TYPES.float;
				expr.value = view.getFloat32(0);
				break;
			}

			case TYPES.fn: {
				const fnIdx = readBuffer(program, SIZE.byte);
				const err = execFn(fnIdx);
				if (err) return err;
				continue;
			}
		}
		context.exprStack.push({ type: expr.type, value: expr.value });
	}

	if (context.exprStack.length) {
		const e = context.exprStack.pop();
		if (e) expr = e;
	}
	// console.log("\n---- expr", expr);
	return 0;
}

function execFn(fnIdx: number) {
	switch (fnIdx) {
		case OPERATORS.ADD: {
			const op1 = context.exprStack.pop();
			const op2 = context.exprStack.pop();
			if (!(op1 && op2)) return ERRORS.TYPE_MISMATCH;

			const result = { type: 0, value: 0 };
			// concat strings
			if (op1.type === TYPES.string) {
				if (op2.type !== TYPES.string) return ERRORS.TYPE_MISMATCH;
				result.type = TYPES.string;
				result.value = concatStrings(op2.value, op1.value);
			} else {
				result.type = op1.type;
				result.value = op1.value + op2.value;
			}

			context.exprStack.push(result);
			break;
		}
		case OPERATORS.SUB: {
			const op1 = context.exprStack.pop();
			const op2 = context.exprStack.pop();
			if (!(op1 && op2)) return ERRORS.TYPE_MISMATCH;
			context.exprStack.push({ type: op1.type, value: op2.value - op1.value });
			break;
		}
		case OPERATORS.MULT: {
			const op1 = context.exprStack.pop();
			const op2 = context.exprStack.pop();
			if (!(op1 && op2)) return ERRORS.TYPE_MISMATCH;
			context.exprStack.push({ type: op1.type, value: op1.value * op2.value });
			break;
		}
		case OPERATORS.GT: {
			const op1 = context.exprStack.pop();
			const op2 = context.exprStack.pop();
			if (!(op1 && op2)) return ERRORS.TYPE_MISMATCH;
			context.exprStack.push({
				type: op1.type,
				value: op2.value > op1.value ? 1 : 0,
			});
			break;
		}
		case FNS.CHR$: {
			const op1 = context.exprStack.pop();
			if (!op1) return ERRORS.TYPE_MISMATCH;
			op1.type = TYPES.string;
			op1.value = newString(String.fromCharCode(op1.value));
			context.exprStack.push(op1);
			break;
		}
		case FNS.GET_ITEM: {
			const arr = context.exprStack.pop();
			const op1 = context.exprStack.pop();

			if (!(op1 && arr)) return ERRORS.TYPE_MISMATCH;

			if (op1.type !== TYPES.int && !(arr.type & VAR_FLAGS.ARRAY)) return ERRORS.TYPE_MISMATCH;

			arr.type = arr.type & VAR_FLAGS.TYPE;
			arr.value = getArrayItem(arr.type, arr.value, op1.value);
			context.exprStack.push(arr);
			break;
		}
		case FNS.USER_DEF: {
			const varIdx = readBuffer(program, SIZE.word);

			// const op1= context.exprStack.pop();

			const lineIdx = context.lineIdx;
			const prgIdx = program.idx;

			context.level++;
			context.lineIdx = getVar(varIdx);

			const err = execStatements();
			if (err) return err;

			if (!context.returnExpr) return ERRORS.TYPE_MISMATCH;

			context.level--;
			program.idx = prgIdx;
			context.lineIdx = lineIdx;

			context.exprStack.push(context.returnExpr);

			break;
		}
		default:
			return ERRORS.UNKNOWN_FUNCTION;
	}

	return 0;
}
