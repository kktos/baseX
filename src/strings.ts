import { addArray, getArrayItem, setArrayItem } from "./arrays";
import { ERRORS, TYPES } from "./defs";
import { hexWord } from "./utils";

/*

	0000: strings count

	0002: string[0] length
	0004: string[0] array index

	0006: string[1] length
	0008: string[1] array index

	type Int16 = number;
	type TStringItem = {
		length: Int16;
		arrayIdx: Int16;
	};

	type TStringList = {
		count: Int16;
		items: TStringItem[];
	};
*/
const BYTE = 1;
const WORD = 2;

const STRING_BLOCK_HEADER_SIZE = 3;
const STRING_BLOCK_SIZE = 255 - STRING_BLOCK_HEADER_SIZE;
// const VARNAME_STRING_BLOCK_SIZE = 32 - STRING_BLOCK_HEADER_SIZE;

const STRING_RECORD_SIZE = BYTE + WORD;
const FIELD_COUNT_SIZE = WORD;
const FIELD_NEXT_SIZE = 2;
const FIELD = {
	STRING_COUNT: 0,
	STRING_LENGTH: 0,
	STRING_ARRAY_IDX: 1,
	NEXT_BLOCK: 0,
};

export enum STRING_TYPE {
	NORMAL = 0,
	VARNAME = 1,
	CONSTANT = 2,
}

let stringArrayIdx = -1;
let stringsMaxCount = 0;

export function initStrings(maxCount: number) {
	stringArrayIdx = -1;
	stringsMaxCount = maxCount;
}

//
// create array to hold TStringList
//
function createStringIndexesArray() {
	// TStringItem size is
	//    sizeof(length) + sizeof(arrayIdx)
	//    2 + 2 = 4
	// TStringList size is
	//    sizeof(count) + STRING_COUNT * sizeof(TStringItem)
	//    2 + 64 * 4 = 258

	// add a array to store indices to array(of chars used as string)
	stringArrayIdx = addArray(TYPES.byte, [FIELD_COUNT_SIZE + STRING_RECORD_SIZE * stringsMaxCount], 0xca);
	// fist item if the strings count
	setArrayItem(TYPES.int, stringArrayIdx, FIELD.STRING_COUNT, 0);
}

export function createStringArray(length: number, strType: STRING_TYPE = STRING_TYPE.NORMAL) {
	if (stringArrayIdx < 0) createStringIndexesArray();

	//
	// TStringList.count= TStringList.count + 1
	//

	// get strings count
	const strCount = getArrayItem(TYPES.int, stringArrayIdx, FIELD.STRING_COUNT);
	// set it + 1
	setArrayItem(TYPES.int, stringArrayIdx, FIELD.STRING_COUNT, strCount + 1);

	//
	// TStringList.items[strCount].length= length
	//

	const strIdx = FIELD_COUNT_SIZE + strCount * STRING_RECORD_SIZE;
	// store the string length
	setArrayItem(TYPES.byte, stringArrayIdx, strIdx + FIELD.STRING_LENGTH, length);

	//
	// TStringList.items[strCount].arrayIdx= arrayIdx
	//

	// add block array to store the string (small one if varname)
	const strLen = strType === STRING_TYPE.NORMAL ? STRING_BLOCK_SIZE : length;
	let arrayIdx = addArray(TYPES.byte, [strLen]) | (strType === STRING_TYPE.VARNAME ? 0x8000 : 0x0000);

	// add the idx to the string array indices
	setArrayItem(TYPES.byte, stringArrayIdx, strIdx + FIELD.STRING_ARRAY_IDX, arrayIdx & 0xff);
	setArrayItem(TYPES.byte, stringArrayIdx, strIdx + FIELD.STRING_ARRAY_IDX + 1, (arrayIdx >> 8) & 0xff);

	arrayIdx &= 0x7fff;
	// set str len to 0
	setArrayItem(TYPES.byte, arrayIdx, 0, 0);

	return arrayIdx;
}

/**
 *
 * @param length size of the empty string to add
 * @returns new string count
 */
export function createString(length: number) {
	createStringArray(length);
	const strIdx = getArrayItem(TYPES.int, stringArrayIdx, FIELD.STRING_COUNT) - 1;
	return strIdx;
}

/**
 *
 * @param str string to add
 * @param isVarName flag to indicate the string is used for a variable name
 * @returns new string count
 */
export function newString(str: string, strType: STRING_TYPE = STRING_TYPE.NORMAL) {
	const strArrayIdx = createStringArray(str.length, strType);
	const strIdx = getArrayItem(TYPES.int, stringArrayIdx, FIELD.STRING_COUNT) - 1;

	// copy string chars into the new array
	for (let idx = 0; idx < str.length; idx++) {
		setArrayItem(TYPES.byte, strArrayIdx, idx, str.charCodeAt(idx));
	}

	return strIdx;
}

export function setString(idx: number, str: string) {
	let strIdx = FIELD_COUNT_SIZE + idx * STRING_RECORD_SIZE;
	let arrayIdx = getArrayItem(TYPES.byte, stringArrayIdx, strIdx + FIELD.STRING_ARRAY_IDX) & 0x7fff;

	const len = str.length; //getArraySize(arrayIdx);
	let remainingLen = len - STRING_BLOCK_SIZE - FIELD_NEXT_SIZE;
	let runningLen = len;
	for (let idx = 0; idx < len; idx++) {
		setArrayItem(TYPES.byte, arrayIdx, idx + FIELD_NEXT_SIZE, str.charCodeAt(idx));
		runningLen--;
		if (runningLen === remainingLen) {
			remainingLen = remainingLen - STRING_BLOCK_SIZE - FIELD_NEXT_SIZE;
			strIdx = getArrayItem(TYPES.byte, arrayIdx, idx + FIELD.NEXT_BLOCK);
			arrayIdx = getArrayItem(TYPES.byte, stringArrayIdx, strIdx + FIELD.STRING_ARRAY_IDX) & 0x7fff;
		}
	}
}

export function getString(idx: number) {
	let result = "";

	const strIdx = FIELD_COUNT_SIZE + idx * STRING_RECORD_SIZE;
	const strLen = getArrayItem(TYPES.byte, stringArrayIdx, strIdx);
	let strArrayIdx = getArrayItem(TYPES.byte, stringArrayIdx, strIdx + BYTE) | (getArrayItem(TYPES.byte, stringArrayIdx, strIdx + BYTE + BYTE) << 8);

	strArrayIdx &= 0x7fff;

	for (let idx = 0; idx < strLen; idx++) {
		const ch = getArrayItem(TYPES.byte, strArrayIdx, idx);
		result += String.fromCharCode(ch);
	}
	return result;
}

export function getStringLen(idx: number) {
	const strIdx = FIELD_COUNT_SIZE + idx * STRING_RECORD_SIZE;
	const strLen = getArrayItem(TYPES.byte, stringArrayIdx, strIdx);
	return strLen;
}

export function concatStrings(strIdx1: number, strIdx2: number) {
	const str1Len = getStringLen(strIdx1);
	const str2Len = getStringLen(strIdx2);
	const destStrLen = str1Len + str2Len;
	const strIdx = createStringArray(destStrLen);

	let destPtr = 0;
	for (let idx = 0; idx < str1Len; idx++) {
		const ch = getArrayItem(TYPES.byte, strIdx1, idx);
		setArrayItem(TYPES.byte, strIdx, destPtr + idx, ch);
	}
	destPtr = str1Len;
	for (let idx = 0; idx < str2Len; idx++) {
		const ch = getArrayItem(TYPES.byte, strIdx2, idx);
		setArrayItem(TYPES.byte, strIdx, destPtr + idx, ch);
	}
	return strIdx;
}

export function copyString(destStrIdx: number, srcStrIdx: number) {
	const destStrLen = getStringLen(destStrIdx);
	const srcStrLen = getStringLen(srcStrIdx);

	if (destStrLen < srcStrLen) return ERRORS.OVERFLOW;

	for (let idx = 0; idx < srcStrLen; idx++) {
		const ch = getArrayItem(TYPES.byte, srcStrIdx, idx);
		setArrayItem(TYPES.byte, destStrIdx, idx, ch);
	}

	return ERRORS.NONE;
}

// let tempStringsIdx;
export function resetTempStrings() {
	// strings.length= tempStringsIdx;
}

export function setTempStrings() {
	// tempStringsIdx= strings.length;
}

export function dumpStrings(out: (...args: string[]) => void) {
	out("-- STRINGS --\n");

	if (stringArrayIdx < 0) return;

	const strCount = getArrayItem(TYPES.int, stringArrayIdx, 0);
	out(`array:${stringArrayIdx} count:${strCount}`, "\n");

	for (let idx = 0; idx < strCount; idx++) {
		const strIdx = FIELD_COUNT_SIZE + idx * STRING_RECORD_SIZE;
		const strArrayIdx = getArrayItem(TYPES.byte, stringArrayIdx, strIdx + BYTE) | (getArrayItem(TYPES.byte, stringArrayIdx, strIdx + BYTE + BYTE) << 8);
		out(`${String(idx).padStart(4, "0")} array:${hexWord(strArrayIdx)} ${strArrayIdx & 0x8000 ? "v" : " "} "${getString(idx)}"`, "\n");
	}
	out("\n");
}
