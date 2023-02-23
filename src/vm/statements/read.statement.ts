import { getArrayItem, setArrayItem } from "../../arrays";
import { readBufferProgram } from "../../buffer";
import { DATA, DATA_FIELDS, ERRORS, SIZE, TYPES, VAR_FLAGS } from "../../defs";
import { getCodePtr } from "../../prglines";
import { copyVar as copyToVar, findVar, getVar, getVarType, setVarDeclared } from "../../vars";
import { evalExpr, expr } from "../expr.vm";
import { program } from "../vm.def";

export function readStatement() {

	const dataIdx= findVar(DATA);
	if(dataIdx === -1) return ERRORS.OUT_OF_DATA

	const arrIdx= getVar(dataIdx);
	let curPtr= getArrayItem(TYPES.int, arrIdx, DATA_FIELDS.PTR);

	if(curPtr === 0xFFFF) {
		const lineIdx= getArrayItem(TYPES.int, arrIdx, DATA_FIELDS.ITEMS);
		// line is DATA val,   val,   val
		//          09, tt vv, tt vv, tt vv
		curPtr= getCodePtr(lineIdx) + 1;
	}

	while(true) {

		// get var

		const varType = readBufferProgram(SIZE.byte);
		if(varType === TYPES.END) break;

		if((varType & VAR_FLAGS.TYPE) !== TYPES.var) return ERRORS.TYPE_MISMATCH;

		const varIdx = readBufferProgram(SIZE.word);

		const isArray= (varType & VAR_FLAGS.ARRAY) !== 0;
		if(isArray) {
			const err = evalExpr();
			if (err) return err;
			if(expr.type !== TYPES.int) return ERRORS.TYPE_MISMATCH;
		}

		// read current data value

		const dataType = readBufferProgram(SIZE.byte, curPtr++);

		if(dataType !== getVarType(varIdx)) return ERRORS.TYPE_MISMATCH;

		curPtr= copyToVar(varIdx, program.buffer, curPtr);
		setVarDeclared(varIdx);

		// console.log(
		// 	"readStatement", getVarName(varIdx), EnumToName(TYPES, varType), isArray?expr.value:"",
		// 	"=", getVar(varIdx)
		// );
	}

	setArrayItem(TYPES.int, arrIdx, DATA_FIELDS.PTR, curPtr);

	return ERRORS.NONE;
}
