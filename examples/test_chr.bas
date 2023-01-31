01 let i%= 0
10 dim a$(10)
20 for k%=1 to 1
21 for i%=0 to 9
30 	let a$(i%)= tmp$
25 	let tmp$= chr$(65+i%)
31 	let tmp$="prout"
40 next i%
41 next k%

120 for i%=0 to 9
135 	print a$(i%)
140 next i%
