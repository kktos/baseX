
1 let z%= $1234
2 print hex$(varptr(z%))
10 dim a%(5,6)
15 print hex$(varptr(a%))
20 let a%(0,0)= 4660
30 let a%(1,2)= 513
40 let a%(2,3)= $8080

42 let b%= a%(2,3)
50 print hex$(b%)

60 let a%(4,5)= 0
