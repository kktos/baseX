import { ERRORS, TPrint, TYPES } from "./defs";
import { memAlloc } from "./memmgr";
import { hexWord, hexdump } from "./utils";

const WORD = 2;
const BYTE = 1;

/*
	type TArrayItem = {
		size: Int16;
		dimPtr: Int16;
		dataPtr: Int16;
	};
*/
const ARRAY_ITEM = {
	SIZE: WORD,
	DIM_PTR: WORD,
	DATA_PTR: WORD,
};
// sizeof TArrayItem
const ARRAY_ITEM_SIZE = ARRAY_ITEM.SIZE + ARRAY_ITEM.DIM_PTR + ARRAY_ITEM.DATA_PTR;

/*
	type TArrayList = {
		count: Int16;
		items: TArrayItem[ARRAY_COUNT];
	};
*/
const ARRAY_LIST = {
	SIZE: WORD,
	// ITEMS: ARRAY_ITEM[],
};
// sizeof TArrayList
// const ARRAY_LIST_SIZE = ARRAY_LIST.SIZE + ARRAY_COUNT * ARRAY_ITEM_SIZE;

/*
	type TArrayData = {
		count: Int16;
		items: TArrayDataItem[];
	};
*/
const ARRAY_DATA = {
	SIZE: WORD,
	// ITEMS: ARRAY_DATA_ITEM[],
};
// sizeof TArrayData
// const ARRAY_DATA_SIZE = ARRAY_DATA.SIZE; //+ ARRAY_COUNT * ARRAY_ITEM_SIZE;

const ARRAY_DATA_ITEM = {
	DIM_COUNT: BYTE,
	// DIMS: WORD[DIM_COUNT]
};
const ARRAY_DATA_ITEM_SIZE = ARRAY_DATA_ITEM.DIM_COUNT;
const ARRAY_DATA_DIM_SIZE = WORD;

let arrayList: Uint8Array;
let arrayData: Uint8Array;

export function initArrays(maxCount: number) {
	let memHandle = memAlloc(ARRAY_DATA.SIZE + maxCount * 255);
	if (!memHandle?.mem) return null;

	arrayData = memHandle.mem;

	memHandle = memAlloc(ARRAY_LIST.SIZE + maxCount * ARRAY_ITEM_SIZE);
	if (!memHandle?.mem) return null;

	arrayList = memHandle.mem;

	for (let idx = 0; idx < arrayList.length; idx++) arrayList[idx] = 0xff;

	writeWord(arrayList, 0, 0);
	writeWord(arrayData, 0, 2);

	return memHandle.addr;
}

//
// ARRAY LIST
// 0000 : nn nn ; count -> count + 1
// ...
// XXX0 : ss ss ; array items count : all dims multiplied
// XXX2 : pp pp ; data ptr in ARRAY DATA
//
// ARRAY DATA
// 0000 : nn nn ; next free ptr
// pppp : dd dd ; byte[ssss]
//
export function addArray(varType: number, dims: number[], fillValue = 0x00) {
	// TArrayList.count++
	const count = readWord(arrayList, 0);
	writeWord(arrayList, 0, count + 1);

	// console.log("*** addArray", count, EnumToName(TYPES, varType), dim);

	// mutilply all dims together a(2,3) <=> a(6)
	let arrayItemsCount = 1;
	for (let idx = 0; idx < dims.length; idx++) {
		arrayItemsCount *= dims[idx];
	}

	let itemSize: number;
	switch (varType) {
		case TYPES.int: {
			itemSize = 2;
			break;
		}
		case TYPES.float: {
			itemSize = 4;
			break;
		}
		default:
			itemSize = 1;
			break;
	}

	const dataSizeInBytes = arrayItemsCount * itemSize;
	const headerSizeInBytes = ARRAY_DATA_ITEM_SIZE + dims.length * ARRAY_DATA_DIM_SIZE;
	const sizeInBytes = headerSizeInBytes + dataSizeInBytes;

	const arrayPtr = ARRAY_LIST.SIZE + count * ARRAY_ITEM_SIZE;

	// add new array bytes size into the ARRAY LIST
	// TArrayList.items[count].size= sizeInBytes
	writeWord(arrayList, arrayPtr, sizeInBytes);

	// move ARRAY DATA free ptr after new array
	let freePtr = readWord(arrayData, 0);
	writeWord(arrayData, 0, freePtr + sizeInBytes);

	// add new array dimPtr into the ARRAY LIST
	// TArrayList.items[count].dimPtr= freePtr
	writeWord(arrayList, arrayPtr + WORD, freePtr);

	// initialise new array data with $FF
	for (let idx = freePtr; idx < freePtr + sizeInBytes; idx++) arrayData[idx] = fillValue;

	// write the DIMS
	// dims count
	writeByte(arrayData, freePtr, dims.length);
	freePtr += ARRAY_DATA_ITEM.DIM_COUNT;
	// dims array
	for (let idx = 1; idx <= dims.length; idx++) {
		writeWord(arrayData, freePtr, dims[idx - 1]);
		freePtr += WORD;
	}

	// add new array dataPtr into the ARRAY LIST
	// TArrayList.items[count].dataPtr= freePtr
	writeWord(arrayList, arrayPtr + WORD + WORD, freePtr);

	return count;
}

export function getArraySize(arrayIdx: number) {
	const arrayPtr = ARRAY_LIST.SIZE + arrayIdx * ARRAY_ITEM_SIZE;
	return readWord(arrayList, arrayPtr);
}

export function getArrayDataPtr(arrayIdx: number) {
	const arrayPtr = ARRAY_LIST.SIZE + arrayIdx * ARRAY_ITEM_SIZE;
	return readWord(arrayList, arrayPtr + WORD + WORD);
}

export function getArrayDimPtr(arrayIdx: number) {
	const arrayPtr = ARRAY_LIST.SIZE + arrayIdx * ARRAY_ITEM_SIZE;
	return readWord(arrayList, arrayPtr + WORD);
}

export function getArrayDims(arrayIdx: number) {
	const dimPtr = getArrayDimPtr(arrayIdx);
	const dimCount = readByte(arrayData, dimPtr);
	const dims = [];
	for (let idx = 0; idx < dimCount; idx++) {
		dims.push(readWord(arrayData, dimPtr + 1 + idx * 2));
	}
	return dims;
}

export function getArrayDimsCount(arrayIdx: number) {
	const dimPtr = getArrayDimPtr(arrayIdx);
	return readByte(arrayData, dimPtr);
}

export function setArrayDim(arrayIdx: number, dimIdx: number, size: number) {
	const dimPtr = getArrayDimPtr(arrayIdx);
	const dimsCount = readByte(arrayData, dimPtr);

	if (dimIdx >= dimsCount) return ERRORS.OUT_OF_BOUNDS;

	writeWord(arrayData, dimPtr + ARRAY_DATA_ITEM.DIM_COUNT + dimIdx * 2, size);

	return ERRORS.NONE;
}

export function getArrayDim(arrayIdx: number, dimIdx: number) {
	const dimPtr = getArrayDimPtr(arrayIdx);
	const dimsCount = readByte(arrayData, dimPtr);
	if (dimIdx >= dimsCount) return ERRORS.OUT_OF_BOUNDS;
	return readWord(arrayData, dimPtr + ARRAY_DATA_ITEM.DIM_COUNT + dimIdx * 2);
}

export function computeItemIdx(arrayIdx: number, indices: number[]) {
	if (indices.length === 1) return indices[0];

	const dims = getArrayDims(arrayIdx);

	if (indices[0] >= dims[0]) return -1;

	let offset = indices[0];
	for (let idx = 1; idx < indices.length; idx++) {
		if (indices[idx] >= dims[idx]) return -1;
		offset += indices[idx] * dims[idx - 1];
	}
	return offset;
}

export function setArrayItem(varType: number, arrayIdx: number, idx: number, value: number) {
	if (idx >= getArraySize(arrayIdx)) return ERRORS.OVERFLOW;

	let addr = getArrayDataPtr(arrayIdx);
	switch (varType) {
		case TYPES.string:
		case TYPES.int: {
			addr += idx * 2;
			writeWord(arrayData, addr, value);
			break;
		}
		case TYPES.byte: {
			addr += idx;
			writeByte(arrayData, addr, value);
			break;
		}
		case TYPES.float: {
			writeQuadBytes(arrayData, addr, value);
			break;
		}
	}
	return ERRORS.NONE;
}

export function getArrayItem(varType: number, arrayIdx: number, idx: number) {
	let addr = getArrayDataPtr(arrayIdx);
	switch (varType) {
		case TYPES.string:
		case TYPES.int: {
			addr += idx * 2;
			return readWord(arrayData, addr);
		}
		case TYPES.byte: {
			addr += idx;
			return readByte(arrayData, addr);
		}
		case TYPES.float: {
			addr += idx * 4;
			const buffer = new Uint8Array(4);
			const view = new DataView(buffer.buffer);
			for (let idx = 0; idx < 4; idx++) {
				view.setInt8(idx, readByte(arrayData, addr + idx));
			}
			return view.getFloat32(0);
		}
		default:
			throw new TypeError("Unknown var type");
	}
}

export function copyToArrayItem(varType: number, arrayIdx: number, idx: number, valueArray: Uint8Array, startAt: number) {
	let addr = getArrayDataPtr(arrayIdx);
	let ptr = startAt;

	switch (varType) {
		case TYPES.string:
		case TYPES.int: {
			addr += idx * 2;
			writeByte(arrayData, addr, valueArray[ptr++]);
			writeByte(arrayData, addr + 1, valueArray[ptr++]);
			break;
		}
		case TYPES.byte: {
			addr += idx;
			writeByte(arrayData, addr, valueArray[ptr++]);
			break;
		}
		case TYPES.float: {
			addr += idx * 4;
			for (let fidx = 0; fidx < 4; fidx++) {
				writeByte(arrayData, addr + fidx, valueArray[ptr++]);
			}
			break;
		}
	}

	return ptr;
}

function readByte(buffer: Uint8Array, idx: number) {
	return buffer[idx];
}

function readWord(buffer: Uint8Array, idx: number) {
	return buffer[idx] | (buffer[idx + 1] << 8);
}

function writeByte(buffer: Uint8Array, idx: number, byte: number) {
	buffer[idx] = byte & 0xff;
}

function writeWord(buffer: Uint8Array, idx: number, word: number) {
	buffer[idx] = word & 0xff;
	buffer[idx + 1] = (word >> 8) & 0xff;
}

function writeQuadBytes(buffer: Uint8Array, idx: number, long: number) {
	writeByte(buffer, idx, long >> 24);
	writeByte(buffer, idx + 1, long >> 16);
	writeByte(buffer, idx + 2, long >> 8);
	writeByte(buffer, idx + 3, long);
}

export function dumpArray(idx: number, out: TPrint = console.log) {
	out(hexdump(arrayData, getArrayDimPtr(idx), getArraySize(idx), 16), "\n");
}

export function dumpArrays(out: TPrint = console.log) {
	out("-- ARRAYS --\n");

	const count = readWord(arrayList, 0);
	// out("count:", count);
	// out(hexdump(arrayList, 2, count * ARRAY_RECORD_SIZE + 2, 4));

	if (!count) return;

	out(`- LIST count:${count}\n`);
	for (let idx = 0; idx < count; idx++) {
		const dataPtr = getArrayDataPtr(idx);
		const arrDim = getArraySize(idx);
		const dimPtr = getArrayDimPtr(idx);
		const dims = getArrayDims(idx).join(",");

		out(`[${hexWord(idx)}]: DATA $${hexWord(dataPtr)} LEN $${hexWord(arrDim)} DIMS $${hexWord(dimPtr)} [${dims}]\n`);
	}

	const freeIdx = readWord(arrayData, 0);
	out(`\n- DATA size:${hexWord(freeIdx)}\n`);

	for (let idx = 0; idx < count; idx++) {
		out(`[${hexWord(idx)}]\n`);
		out(hexdump(arrayData, getArrayDimPtr(idx), getArraySize(idx), 16), "\n");
	}

	// while(idx < count) {
	// 	const nameIdx= readVarWord(idx, FIELDS.NAME);
	// 	const name= getString(nameIdx);
	// 	let type= readVarByte(idx, FIELDS.TYPE);
	// 	let value= readVarWord(idx, FIELDS.VALUE);

	// 	const isArray= type & TYPES.ARRAY;
	// 	if(isArray)
	// 		type= type & (TYPES.ARRAY ^ 0xFF);

	// 	switch(type) {
	// 		case TYPES.string: {
	// 			value= value ? '"' + getString(value) + '"' : undefined;
	// 			break;
	// 		}
	// 		case TYPES.iterator: {
	// 			idx++;
	// 			const max= readVarWord(idx, FIELDS.NAME);
	// 			const ptr= readVarWord(idx, FIELDS.VALUE);
	// 			value= `INC:${hexWord(value)} MAX:${hexWord(max)} PTR:${hexWord(ptr)}`;
	// 		}
	// 	}

	// 	console.log(
	// 		name,
	// 		":",
	// 		Object.keys(TYPES)[Object.values(TYPES).indexOf(type)] + (isArray?"[]":""),
	// 		"=",
	// 		value);

	// 	idx++;
	// }
}
