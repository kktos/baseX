import { computeItemIdx, copyToArrayItem, getArrayDim, getArrayDimsCount, getArrayItem, setArrayDim, setArrayItem } from "../../arrays";
import { readBufferProgram } from "../../buffer";
import { DATA_FIELDS, DATA_SYSVAR, ERRORS, SIZE, TYPES, VAR_FLAGS } from "../../defs";
import { getCodePtr } from "../../prglines";
import { copyVar as copyToVar, findVar, getVar, getVarType, setVarDeclared } from "../../vars";
import { evalExpr, expr } from "../expr.vm";
import { program } from "../vm.def";

let dataLinesArrayID = -1;
let curPtr = 0xffff;

export function findDataVar() {
	if (dataLinesArrayID === -1) {
		const dataVarID = findVar(DATA_SYSVAR);
		if (dataVarID === -1) return -1;
		dataLinesArrayID = getVar(dataVarID);
	}
	return dataLinesArrayID;
}

function nextDataLine() {
	// get data lines count
	const dataLinesCount = getArrayDim(dataLinesArrayID, 0);
	// get current line index
	const currentLineIdx = (getArrayItem(TYPES.int, dataLinesArrayID, DATA_FIELDS.COUNT) + 1) & 0xffff;
	// check if we consumed all
	if (currentLineIdx >= dataLinesCount) return ERRORS.OUT_OF_DATA;

	// currentLineIdx= currentLineIdx + 1
	setArrayItem(TYPES.int, dataLinesArrayID, DATA_FIELDS.COUNT, currentLineIdx);

	const lineIdx = getArrayItem(TYPES.int, dataLinesArrayID, DATA_FIELDS.ITEMS + currentLineIdx);
	// line is DATA val,   val,   val
	//          09, tt vv, tt vv, tt vv
	curPtr = getCodePtr(lineIdx) + 1;

	return ERRORS.NONE;
}

export function resetDataLine() {
	setArrayItem(TYPES.int, dataLinesArrayID, DATA_FIELDS.COUNT, 0xffff);
	const err = nextDataLine();
	if (err) return err;
	setArrayItem(TYPES.int, dataLinesArrayID, DATA_FIELDS.PTR, curPtr);
	return ERRORS.NONE;
}

export function readStatement() {
	function nextDataValue(varType: number) {
		let err;
		let dataType;

		while (true) {
			dataType = readBufferProgram(SIZE.byte, curPtr++);
			if (dataType !== 0) break;
			err = nextDataLine();
			if (err) return err;
		}

		return dataType === varType ? ERRORS.NONE : ERRORS.TYPE_MISMATCH;
	}

	dataLinesArrayID = findDataVar();
	if (dataLinesArrayID === -1) return ERRORS.OUT_OF_DATA;

	curPtr = getArrayItem(TYPES.int, dataLinesArrayID, DATA_FIELDS.PTR);
	if (curPtr === 0xffff) {
		const dataLinesCount = getArrayItem(TYPES.int, dataLinesArrayID, DATA_FIELDS.COUNT);
		setArrayDim(dataLinesArrayID, 0, dataLinesCount);
		const err = resetDataLine();
		if (err) return err;
	}

	while (true) {
		// get var

		const varType = readBufferProgram(SIZE.byte);
		if (varType === TYPES.END) break;

		if ((varType & VAR_FLAGS.TYPE) !== TYPES.var) return ERRORS.TYPE_MISMATCH;

		const varIdx = readBufferProgram(SIZE.word);

		// read current data type

		const err = nextDataValue(getVarType(varIdx));
		if (err) return err;

		// const dataType = readBufferProgram(SIZE.byte, curPtr++);
		// if(dataType === 0) return ERRORS.OUT_OF_DATA;
		// if(dataType !== getVarType(varIdx)) return ERRORS.TYPE_MISMATCH;

		// set value to var

		const isArray = (varType & VAR_FLAGS.ARRAY) !== 0;
		if (isArray) {
			const arrayIdx = getVar(varIdx);
			const dimsCount = getArrayDimsCount(arrayIdx);
			const dims = [];
			let err;

			for (let idx = 0; idx < dimsCount; idx++) {
				err = evalExpr();
				if (err) return err;
				if (expr.type !== TYPES.int) return ERRORS.TYPE_MISMATCH;
				dims.push(expr.value);
			}

			const offset = computeItemIdx(arrayIdx, dims);
			if (offset < 0) return ERRORS.OUT_OF_BOUNDS;
			// err = setArrayItem(getVarType(varIdx), arrayIdx, offset, expr.value);
			curPtr = copyToArrayItem(getVarType(varIdx), arrayIdx, offset, program.buffer, curPtr);
			// dumpArray(arrayIdx);
		} else {
			curPtr = copyToVar(varIdx, program.buffer, curPtr);
			setVarDeclared(varIdx);
		}

		// console.log(
		// 	"readStatement", getVarName(varIdx), EnumToName(TYPES, varType), isArray?expr.value:"",
		// 	"=", getVar(varIdx)
		// );
	}

	setArrayItem(TYPES.int, dataLinesArrayID, DATA_FIELDS.PTR, curPtr);

	return ERRORS.NONE;
}
