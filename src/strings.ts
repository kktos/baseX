import { addArray, getArrayItem, getArraySize, setArrayItem } from "./arrays";
import { TYPES } from "./defs";
import { hexWord } from "./utils";

const MAX_STRINGS = 64;
let stringArray = -1;

export function addString(str: string, isVarName= false) {
	if (stringArray < 0) {
		stringArray = addArray(TYPES.int, MAX_STRINGS);
		setArrayItem(TYPES.int, stringArray, 0, 0);
	}

	const strCount = getArrayItem(TYPES.int, stringArray, 0) + 1;
	setArrayItem(TYPES.int, stringArray, 0, strCount);

	const strIdx = addArray(TYPES.byte, str.length);
	setArrayItem(TYPES.int, stringArray, strCount, strIdx | (isVarName ? 0x8000 : 0x0000));

	for (let idx = 0; idx < str.length; idx++) {
		setArrayItem(TYPES.byte, strIdx, idx, str.charCodeAt(idx));
	}

	// console.log("addString", str, isVarName, strIdx);

	return strCount;
}

export function getString(idx: number) {
	let result = "";

	const strIdx = getArrayItem(TYPES.int, stringArray, idx) & 0x7FFF;
	const len = getArraySize(strIdx);
	for (let idx = 0; idx < len; idx++) {
		const ch = getArrayItem(TYPES.byte, strIdx, idx);
		result += String.fromCharCode(ch);
	}
	return result;
}

// let tempStringsIdx;
export function resetTempStrings() {
	// strings.length= tempStringsIdx;
}

export function setTempStrings() {
	// tempStringsIdx= strings.length;
}

export function dumpStrings() {
	console.log("-- STRINGS --");

	const strCount = getArrayItem(TYPES.int, stringArray, 0);
	console.log(`array:${stringArray} count:${strCount}`);

	for (let idx = 0; idx < strCount; idx++) {
		const strIdx= getArrayItem(TYPES.int, stringArray, idx+1);
		console.log(`${String(idx).padStart(4, "0")} array:${hexWord(strIdx)} ${strIdx&0x8000?"v":" "} "${getString(idx+1)}"`);
	}
}
