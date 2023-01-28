1 rem this is a test
5 let parm_1= 50.1
6 print "parm_1 = ";parm_1
7 end
10 for i%=0 to 9
40     print test(i%)
50 next i%
55 let parm_1= 60
99 end
100 function test($parm_1: float)
150     let test= $parm_1 * 2
200     return $parm_1 * 2
300 end function
