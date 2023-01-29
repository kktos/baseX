10 dim a$(10)
20 for i%=0 to 9
25 	let tmp$= chr$(65+i%)
30 	let a$(i%)= tmp$
31 	let tmp$="prout"
40 next i%

120 for i%=0 to 9
135 	print a$(i%)
140 next i%
