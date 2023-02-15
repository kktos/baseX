function _fillUp(value: string, count: number, fillWith: string) {
	let l = count - value.length;
	let ret = "";
	while (--l > -1) ret += fillWith;
	return ret + value;
}

const headers = "00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F";

export function hexdump(buffer: Uint8Array, offset: number, length: number, width = 16) {
	offset = offset || 0;
	length = length ?? buffer.length;

	let out = `${_fillUp("Offset", 8, " ")}  ${headers.slice(0, width * 3)}\n`;
	let row = "";
	for (let idx = 0; idx < length; idx += width) {
		const n = Math.min(width, length - idx);
		if (n === 0) continue;
		row += `${_fillUp(offset.toString(16).toUpperCase(), 8, "0")}  `;
		let string = "";
		for (let j = 0; j < width; ++j) {
			if (j < n) {
				// var value = buffer.readUInt8(offset);
				const value = buffer[offset];
				string += value >= 32 && value <= 127 ? String.fromCharCode(value) : ".";
				row += `${_fillUp(value.toString(16).toUpperCase(), 2, "0")} `;
				offset++;
			} else {
				row += "   ";
				string += " ";
			}
		}
		row += ` ${string}\n`;
	}
	out += row;
	return out;
}

export function hexByte(val: number) {
	return val.toString(16).padStart(2, "0").toUpperCase();
}

export function hexWord(val: number) {
	return val.toString(16).padStart(4, "0").toUpperCase();
}

export function hexLong(val: number) {
	// hexWord(long >> 16) + hexWord(long & 0xffff),

	return val.toString(16).padStart(8, "0").toUpperCase();
}

export function EnumToName(en: Object, value: number) {
	const idx = Object.values(en).indexOf(value);
	return idx >= 0 ? Object.keys(en)[idx] : hexByte(value);
}
